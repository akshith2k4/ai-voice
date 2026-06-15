// WalkthroughExecutor — tree-walker-based, event-driven.
// treeWalker walks the schema tree and yields WalkthroughCommands one step at a time.
// sendNext() advances the walker and dispatches the next command.
// handleEvent() fires when the frontend confirms an event, then calls sendNext.

import crypto from "crypto";
import { SessionManager, type WalkthroughSession, type WalkthroughCommand } from "./sessionManager.js";
import { EventMonitor } from "./eventMonitor.js";
import { ToolMessenger } from "./toolMessenger.js";
import type { OutgoingMessage } from "../types.js";
import type { IResponder } from "../adapters/responders/IResponder.js";
import { resolveDemoValue } from "../core/workflowResolver.js";
import type { FormSchema, SchemaNode, FieldNode, RepeatingNode } from "../schema/loader.js";

export class CancellationError extends Error { constructor() { super("Cancelled"); } }


// ── Module-level helpers ───────────────────────────────────────────────────────

function isNodeVisible(node: SchemaNode, session: WalkthroughSession): boolean {
  const { visibleWhen, conditionalOn } = node as any;
  if (visibleWhen) {
    const vw = visibleWhen as any;
    if (session.filledValues.get(vw.field) !== vw.value) return false;
  }
  if (conditionalOn) {
    const current = String(session.filledValues.get(conditionalOn.field) ?? "");
    if (!conditionalOn.values.includes(current)) return false;
  }
  return true;
}

function findFieldInNodes(nodes: SchemaNode[], targetKey: string): { matchedField: FieldNode | undefined; repeatingId: string | null } {
  for (const node of nodes) {
    if (node.nodeType === "field" && node.key === targetKey) return { matchedField: node, repeatingId: null };
    if (node.nodeType === "group") {
      const found = findFieldInNodes(node.children, targetKey);
      if (found.matchedField) return found;
    }
    if (node.nodeType === "repeating") {
      const found = findFieldInNodes(node.children, targetKey);
      if (found.matchedField) return { matchedField: found.matchedField, repeatingId: node.id };
    }
  }
  return { matchedField: undefined, repeatingId: null };
}

// ── Generator functions ────────────────────────────────────────────────────────

function* createTreeWalker(schema: FormSchema, session: WalkthroughSession): Generator<WalkthroughCommand, void, unknown> {
  // Setup steps
  for (const step of schema.setupSteps) {
    yield {
      tools: [{ tool: step.tool, args: step.args }],
      waitFor: step.waitFor ?? "_continue",
    };
  }

  // Overview — frontend handler awaits this specific audio then sends walkthrough_speak_done
  yield {
    tools: [{ tool: "speak", args: { text: schema.overview } }],
    waitFor: "walkthrough_speak_done",
  };

  // Main nodes
  yield* traverseNodes(schema.nodes, session);

  // Wrap-up
  yield {
    tools: [{ tool: "speak", args: { text: schema.wrapUp } }],
    waitFor: "walkthrough_speak_done",
  };

  // Clear demo data
  yield {
    tools: [{ tool: "clear_all_fields", args: {} }],
    waitFor: "fields_cleared",
  };
}

function* traverseNodes(
  nodes: SchemaNode[],
  session: WalkthroughSession,
  repeatingCtx?: { id: string; itemIndex: number }
): Generator<WalkthroughCommand, void, unknown> {
  for (const node of nodes) {
    if (!isNodeVisible(node, session)) continue;

    if (node.nodeType === "field") {
      yield* traverseField(node, session, repeatingCtx);
    } else if (node.nodeType === "group") {
      yield* traverseNodes(node.children, session, repeatingCtx);
    } else if (node.nodeType === "repeating") {
      yield* traverseRepeating(node, session);
    }
  }
}

function* traverseField(
  node: FieldNode,
  session: WalkthroughSession,
  ctx?: { id: string; itemIndex: number }
): Generator<WalkthroughCommand, void, unknown> {
  const demoValue = resolveDemoValue(node, session.filledValues);
  const canFill = !node.readOnly && !node.autoFilled && demoValue != null;

  const stepArgs: Record<string, unknown> = {
    fieldKey: node.key,
    label: node.label,
    speech: node.explanation || "",
  };

  if (canFill) {
    stepArgs.fillValue = String(demoValue ?? "");
    stepArgs.fillType = node.type;
  }

  if (ctx) {
    stepArgs.repeatingId = ctx.id;
    stepArgs.itemIndex = ctx.itemIndex;
  }

  const fillKey = ctx ? `${ctx.id}_${ctx.itemIndex}_${node.key}` : node.key;

  yield {
    tools: [{ tool: "field_step", args: stepArgs }],
    waitFor: "field_done",
    navContext: { fieldKey: node.key, label: node.label, repeatingId: ctx?.id, itemIndex: ctx?.itemIndex },
    ...(canFill ? { fill: { key: fillKey, value: demoValue } } : {}),
  };
}

function* traverseRepeating(
  node: RepeatingNode,
  session: WalkthroughSession,
): Generator<WalkthroughCommand, void, unknown> {
  // copyFrom path: show checkbox to copy from another repeating group
  if (node.copyFrom) {
    yield {
      tools: [{ tool: "click_checkbox", args: {
        fieldKey: `copy_${node.copyFrom.subFormId}`,
        labelText: node.copyFrom.checkboxLabel,
        speech: node.copyFrom.copyExplanation || "These items can be copied.",
      }}],
      waitFor: "checkbox_clicked",
    };
    return;
  }

  // Normal path: add N items
  for (let itemIndex = 0; itemIndex < node.demoItemCount; itemIndex++) {
    const speech = itemIndex === 0 ? node.explanation : node.explanationForMultiple;
    yield {
      tools: [{ tool: "add_item", args: { repeatingId: node.id, triggerText: node.triggerText, speech: speech || "" } }],
      waitFor: "item_added",
    };
    yield* traverseNodes(node.children, session, { id: node.id, itemIndex });
  }
}

// ── Executor class ─────────────────────────────────────────────────────────────

export class WalkthroughExecutor {
  private sessionManager = new SessionManager();
  private eventMonitor = new EventMonitor();
  private toolMessenger = new ToolMessenger();
  private starting = new Set<string>();

  getSession(sid: string) { return this.sessionManager.get(sid); }

  async start(formId: string, sessionId: string, responder: IResponder, ttsEnabled = true, lang = "en"): Promise<void> {
    if (this.starting.has(sessionId) || this.sessionManager.has(sessionId)) {
      await responder.speak("A walkthrough is already in progress. Say 'cancel' to stop it first.");
    } else {
      this.starting.add(sessionId);
      let session: WalkthroughSession | null = null;
      try {
        session = this.sessionManager.create(sessionId, formId, ttsEnabled, lang);
      } catch {
        const { getAvailableForms } = await import("./sessionManager.js");
        await responder.speak(`I couldn't find "${formId}". Available: ${getAvailableForms().map(f => f.name).join(", ")}`);
      }
      this.starting.delete(sessionId);
      if (session) {
        session.responder = responder;
        if ("boundSession" in responder) (responder as any).boundSession = session;
        session.treeWalker = createTreeWalker(session.schema, session);
        session.stateMachine.transition("START_WALKTHROUGH");
        this.tool(session, "begin_walkthrough", { formId: session.schema.id });
        this.sendNext(session);
      }
    }
  }

  cancel(sessionId: string): void {
    const session = this.sessionManager.get(sessionId);
    if (session) {
      session.cancelled = true;
      this.eventMonitor.rejectPending(session, new CancellationError());
      this.sessionManager.delete(sessionId);
    }
  }

  detour(fieldKey: string, sessionId: string, responder: IResponder, skipSpeech: boolean): void {
    const session = this.sessionManager.get(sessionId);
    if (session) {
      const { matchedField } = this.findField(session, fieldKey);
      session.stateMachine.transition("DETOUR");
      this.tool(session, "detour_start", { fieldKey });
      this.tool(session, "go_to_field", { fieldKey, label: matchedField?.label });
      const speechText = matchedField
        ? (skipSpeech ? undefined : `Here's the ${matchedField.label} field`)
        : "Let me highlight that field on your form.";
      if (speechText) responder.speak(speechText);
    }
  }

  resumeWalkthrough(sessionId: string): void {
    const session = this.sessionManager.get(sessionId);
    if (session) {
      const state = session.stateMachine.currentState;
      if (state === "DETOUR_QA") {
        session.stateMachine.transition("DETOUR_COMPLETE");
        this.tool(session, "detour_end", {});
        this.sendNext(session);
      } else if (state === "PAUSED") {
        session.stateMachine.transition("RESUME");
        this.replayCurrent(session); // re-dispatch the interrupted step, don't advance
      } else {
        this.sendNext(session);
      }
    }
  }

  // Re-dispatches the last command that was interrupted mid-execution.
  // Generates fresh messageIds so audio is re-requested and played from scratch.
  private replayCurrent(session: WalkthroughSession): void {
    if (!session.lastCommand) {
      this.sendNext(session);
      return;
    }
    const cmd = session.lastCommand;
    for (const { tool, args } of cmd.tools) {
      if (tool === "speak" && args.text) {
        const msgId = crypto.randomUUID();
        this.tool(session, tool, { ...args, messageId: msgId });
        session.responder?.speak(String(args.text), msgId);
      } else if (tool === "field_step") {
        const speechMsgId = args.speech ? crypto.randomUUID() : undefined;
        const toolArgs = speechMsgId ? { ...args, speechMessageId: speechMsgId } : args;
        this.tool(session, tool, toolArgs);
        if (speechMsgId) session.responder?.speak(String(args.speech), speechMsgId);
      } else {
        this.tool(session, tool, args);
      }
    }
    if (cmd.navContext) session.currentNav = cmd.navContext;
    session.waitingFor = cmd.waitFor;
  }

  private sendNext(session: WalkthroughSession): void {
    while (!session.cancelled) {
      const result = session.treeWalker.next();
      if (result.done) {
        this.finish(session);
        break;
      }
      const cmd = result.value;
      for (const { tool, args } of cmd.tools) {
        if (tool === "speak" && args.text) {
          // Generate messageId so frontend can wait for exactly this audio to finish
          const msgId = crypto.randomUUID();
          this.tool(session, tool, { ...args, messageId: msgId });
          session.responder?.speak(String(args.text), msgId);
        } else if (tool === "field_step") {
          // Include speechMessageId so frontend waits for exactly this audio before moving on
          const speechMsgId = args.speech ? crypto.randomUUID() : undefined;
          const toolArgs = speechMsgId ? { ...args, speechMessageId: speechMsgId } : args;
          this.tool(session, tool, toolArgs);
          if (speechMsgId) session.responder?.speak(String(args.speech), speechMsgId);
        } else {
          this.tool(session, tool, args);
        }
      }
      if (cmd.navContext) session.currentNav = cmd.navContext;
      if (cmd.fill) session.filledValues.set(cmd.fill.key, cmd.fill.value);
      if (cmd.waitFor !== "_continue") {
        session.lastCommand = cmd;
        session.waitingFor = cmd.waitFor;
        break;
      }
    }
  }

  handleEvent(sessionId: string, event: string, data?: any): void {
    const session = this.sessionManager.get(sessionId)!;
    if (event === "dialog_closed_by_user" || event === "page_changed") {
      this.cancel(sessionId);
    } else if (event === "form_registered") {
      session.isRegistered = true;
      const sm1 = session.stateMachine.currentState;
      if (sm1 !== "PAUSED" && sm1 !== "DETOUR_QA" && session.waitingFor === event) {
        session.waitingFor = null;
        this.sendNext(session);
      }
    } else if (event === "error") {
      console.warn("[Executor] Frontend error:", data);
    } else {
      this.eventMonitor.notify(session, event, data);
      const sm = session.stateMachine.currentState;
      if (sm !== "PAUSED" && sm !== "DETOUR_QA" && session.waitingFor === event) {
        session.waitingFor = null;
        this.sendNext(session);
      }
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private findField(session: WalkthroughSession, targetKey: string): { matchedField: FieldNode | undefined; repeatingId: string | null } {
    return findFieldInNodes(session.schema.nodes, targetKey);
  }

  private finish(session: WalkthroughSession): void {
    this.tool(session, "close_dialog", {});
    session.stateMachine.transition("RESET");
    console.log(`[Executor] ✅ Complete: ${session.schema.id}`);
    this.sessionManager.delete(session.sessionId);
  }

  private tool(session: WalkthroughSession, tool: string, args: Record<string, unknown> = {}): void {
    console.log(`[Executor] → ${tool}`);
    this.toolMessenger.send(session.sessionId, { type: "tool", tool, args } as OutgoingMessage);
  }
}

export const walkthroughExecutor = new WalkthroughExecutor();
