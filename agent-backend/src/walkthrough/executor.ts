// WalkthroughExecutor — tree-walker-based, event-driven.
// treeWalker walks the schema tree and yields WalkthroughCommands one step at a time.
// sendNext() advances the walker and dispatches the next command.
// handleEvent() fires when the frontend confirms an event, then calls sendNext.

import crypto from "crypto";
import { SessionManager, type WalkthroughSession, type WalkthroughCommand } from "./sessionManager.js";
import { EventMonitor, CancellationError } from "./eventMonitor.js";
import { ToolMessenger } from "./toolMessenger.js";
import type { OutgoingMessage } from "../types.js";
import type { IResponder } from "../adapters/responders/IResponder.js";
import { resolveDemoValue } from "../core/workflowResolver.js";
import { FormSchema, SchemaNode, FieldNode, RepeatingNode, findFieldInNodes } from "../schema/loader.js";

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

// ── Generator functions ────────────────────────────────────────────────────────

function* createTreeWalker(schema: FormSchema, session: WalkthroughSession): Generator<WalkthroughCommand, void, unknown> {
  // Setup steps
  for (const step of schema.setupSteps) {
    yield {
      tools: [{ tool: step.tool, args: step.args }],
      waitFor: step.waitFor ?? "_continue",
    };
  }

  const lang = session.languageCode || "en";
  const overviewText = typeof schema.overview === "string"
    ? schema.overview
    : (schema.overview?.[lang] || schema.overview?.["en"] || "");

  // Overview — frontend handler awaits this specific audio then sends walkthrough_speak_done
  yield {
    tools: [{ tool: "speak", args: { text: overviewText } }],
    waitFor: "walkthrough_speak_done",
  };

  // Main nodes
  yield* traverseNodes(schema.nodes, session);

  const wrapUpText = typeof schema.wrapUp === "string"
    ? schema.wrapUp
    : (schema.wrapUp?.[lang] || schema.wrapUp?.["en"] || "");

  // Wrap-up
  yield {
    tools: [{ tool: "speak", args: { text: wrapUpText } }],
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

  const lang = session.languageCode || "en";
  const speechText = typeof node.explanation === "string"
    ? node.explanation
    : (node.explanation?.[lang] || node.explanation?.["en"] || "");

  const stepArgs: Record<string, unknown> = {
    fieldKey: node.key,
    label: node.label,
    speech: speechText,
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
    let shouldCopy = true;
    if (node.copyFrom.whenFieldEquals) {
      const currentVal = session.filledValues.get(node.copyFrom.whenFieldEquals.field);
      shouldCopy = currentVal === node.copyFrom.whenFieldEquals.value;
    }
    if (shouldCopy) {
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
  }

  // Normal path: add N items
  const lang = session.languageCode || "en";
  for (let itemIndex = 0; itemIndex < node.demoItemCount; itemIndex++) {
    const rawSpeech = itemIndex === 0 ? node.explanation : node.explanationForMultiple;
    const speech = typeof rawSpeech === "string"
      ? rawSpeech
      : (rawSpeech?.[lang] || rawSpeech?.["en"] || "");
    yield {
      tools: [{ tool: "add_item", args: { repeatingId: node.id, triggerText: node.triggerText, speech } }],
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
  private stepTimers = new Map<string, ReturnType<typeof setTimeout>>();

  getSession(sid: string) { return this.sessionManager.get(sid); }

  async start(
    formId: string,
    sessionId: string,
    responder?: IResponder,
    ttsEnabled = true,
    lang = "en",
    introMessage?: string
  ): Promise<void> {
    let actualResponder: IResponder | undefined = undefined;
    let actualTtsEnabled = ttsEnabled;
    let actualLang = lang;
    let actualIntroMessage = introMessage;

    if (typeof responder === "boolean") {
      actualTtsEnabled = responder;
      actualResponder = undefined;
      if (typeof ttsEnabled === "string") {
        actualIntroMessage = ttsEnabled;
      }
    } else {
      actualResponder = responder;
    }

    if (this.starting.has(sessionId) || this.sessionManager.has(sessionId)) {
      this.toolMessenger.send(sessionId, {
        type: "tool",
        tool: "respond",
        args: { message: "A walkthrough is already in progress. Say 'cancel' to stop it first.", tts: false }
      });
      if (actualResponder) {
        await actualResponder.speak("A walkthrough is already in progress. Say 'cancel' to stop it first.");
      }
    } else {
      this.starting.add(sessionId);
      let session: WalkthroughSession | null = null;
      try {
        session = this.sessionManager.create(sessionId, formId, actualTtsEnabled, actualLang);
      } catch {
        const { getAvailableForms } = await import("./sessionManager.js");
        const available = getAvailableForms().map(f => f.name).join(", ");
        const errMsg = `I couldn't find the form "${formId}". Available forms: ${available}`;
        this.toolMessenger.send(sessionId, {
          type: "tool",
          tool: "respond",
          args: { message: errMsg, tts: false }
        });
        if (actualResponder) {
          await actualResponder.speak(errMsg);
        }
      }
      this.starting.delete(sessionId);
      if (session) {
        if (actualResponder) {
          session.responder = actualResponder;
          if (typeof actualResponder === "object" && actualResponder !== null && "boundSession" in actualResponder) {
            (actualResponder as any).boundSession = session;
          }
        }
        session.treeWalker = createTreeWalker(session.schema, session);
        session.stateMachine.transition("START_WALKTHROUGH");
        this.tool(session, "begin_walkthrough", { formId: session.schema.id });

        if (actualIntroMessage) {
          const msgId = session.ttsEnabled ? crypto.randomUUID() : undefined;
          this.tool(session, "respond", { message: actualIntroMessage, tts: session.ttsEnabled, messageId: msgId });
          this.tool(session, "speak", { text: actualIntroMessage, tts: session.ttsEnabled, messageId: msgId });
          session.waitingFor = "walkthrough_speak_done";
          this.setStepTimeout(session, "walkthrough_speak_done");
          if (session.responder) {
            if (session.ttsEnabled) {
              session.responder.speak(actualIntroMessage, msgId);
            }
          } else if (session.ttsEnabled) {
            import("../services/narrationSpeaker.js")
              .then(({ speakNarration }) => speakNarration(session.sessionId, session.languageCode, actualIntroMessage!, msgId))
              .catch(err => console.error(err));
          }
        } else {
          this.sendNext(session);
        }
      }
    }
  }

  cancel(sessionId: string): void {
    const session = this.sessionManager.get(sessionId);
    if (session) {
      // ADD THIS — notify frontend before deleting
      this.toolMessenger.send(sessionId, {
        type: "tool",
        tool: "walkthrough_cancelled",
        args: { reason: "cancelled_by_system" }
      });
      session.cancelled = true;
      this.clearStepTimeout(sessionId);
      this.eventMonitor.rejectPending(session, new CancellationError());
      this.sessionManager.delete(sessionId);
    }
  }

  pause(sessionId: string): void {
    const session = this.sessionManager.get(sessionId);
    if (session) {
      const state = session.stateMachine.currentState;
      if (state !== "DETOUR_QA" && state !== "PAUSED") {
        console.log(`[Executor] Pausing walkthrough for ${sessionId}`);
        try {
          session.stateMachine.transition("PAUSE");
        } catch (e) {
          console.warn("[Executor] Failed to pause state machine:", e);
        }
      }
      // CRITICAL: Clear the timeout so it doesn't cancel the session while paused!
      this.clearStepTimeout(sessionId);
    }
  }

  detour(fieldKey: string, sessionId: string, responder?: IResponder, skipSpeech?: boolean): void {
    const session = this.sessionManager.get(sessionId);
    if (session) {
      // ADD THIS — clear the pending timeout before entering detour
      this.clearStepTimeout(sessionId);

      const { matchedField } = findFieldInNodes(session.schema.nodes, fieldKey);
      session.stateMachine.transition("DETOUR");
      this.tool(session, "detour_start", { fieldKey });
      this.tool(session, "go_to_field", { fieldKey, label: matchedField?.label });
      const speechText = matchedField
        ? (skipSpeech ? undefined : `Here's the ${matchedField.label} field`)
        : "Let me highlight that field on your form.";
      if (speechText) {
        if (responder) {
          if (session.ttsEnabled) {
            responder.speak(speechText);
          }
        } else if (session.ttsEnabled) {
          const msgId = crypto.randomUUID();
          import("../services/narrationSpeaker.js")
            .then(({ speakNarration }) => speakNarration(session.sessionId, session.languageCode, speechText, msgId))
            .catch(err => console.error(err));
        }
      }
    }
  }

  resumeWalkthrough(sessionId: string): void {
    const session = this.sessionManager.get(sessionId);
    if (session) {
      this.tool(session, "resume_walkthrough", {});

      const state = session.stateMachine.currentState;
      if (state === "DETOUR_QA") {
        session.stateMachine.transition("DETOUR_COMPLETE");
        this.tool(session, "detour_end", {});
        const waitingFor = session.waitingFor;
        if (waitingFor === "field_done" || waitingFor === "walkthrough_speak_done") {
          this.replayCurrent(session);
        } else if (waitingFor === "item_added" || waitingFor === "checkbox_clicked") {
          session.waitingFor = null;
          this.sendNext(session);
        } else {
          this.sendNext(session);
        }
      } else if (state === "PAUSED") {
        session.stateMachine.transition("RESUME");
        
        // SAFETY CHECK: If we were waiting for a UI action (not just speech),
        // it's safer to advance than to re-execute and cause duplicates.
        const waitingFor = session.waitingFor;
        if (waitingFor === "item_added" || waitingFor === "checkbox_clicked") {
          console.log(`[Executor] Resume detected UI action wait (${waitingFor}). Advancing to prevent duplicate execution.`);
          session.waitingFor = null;
          this.sendNext(session);
        } else {
          // If it was waiting for speech or field_done, safe to replay
          this.replayCurrent(session);
        }
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
        const text = String(args.text);
        const msgId = session.ttsEnabled ? crypto.randomUUID() : undefined;
        this.tool(session, "respond", { message: text, tts: session.ttsEnabled, messageId: msgId });
        this.tool(session, tool, { ...args, tts: session.ttsEnabled, messageId: msgId });
        if (session.responder) {
          if (session.ttsEnabled) {
            session.responder.speak(text, msgId);
          }
        } else if (session.ttsEnabled) {
          import("../services/narrationSpeaker.js")
            .then(({ speakNarration }) => speakNarration(session.sessionId, session.languageCode, text, msgId))
            .catch(err => console.error(err));
        }
      } else if (tool === "field_step") {
        const speechMsgId = (session.ttsEnabled && args.speech) ? crypto.randomUUID() : undefined;
        const toolArgs = { ...args, tts: session.ttsEnabled, speechMessageId: speechMsgId };
        this.tool(session, tool, toolArgs);
        if (speechMsgId) {
          if (session.responder) {
            if (session.ttsEnabled) {
              session.responder.speak(String(args.speech), speechMsgId);
            }
          } else if (session.ttsEnabled) {
            import("../services/narrationSpeaker.js")
              .then(({ speakNarration }) => speakNarration(session.sessionId, session.languageCode, String(args.speech), speechMsgId))
              .catch(err => console.error(err));
          }
        }
      } else {
        this.tool(session, tool, args);
      }
    }
    if (cmd.navContext) session.currentNav = cmd.navContext;
    session.waitingFor = cmd.waitFor;
    this.setStepTimeout(session, cmd.waitFor);
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
          const text = String(args.text);
          // Generate messageId so frontend can wait for exactly this audio to finish
          const msgId = session.ttsEnabled ? crypto.randomUUID() : undefined;
          this.tool(session, "respond", { message: text, tts: session.ttsEnabled, messageId: msgId });
          this.tool(session, tool, { ...args, tts: session.ttsEnabled, messageId: msgId });
          if (session.responder) {
            if (session.ttsEnabled) {
              session.responder.speak(text, msgId);
            }
          } else if (session.ttsEnabled) {
            import("../services/narrationSpeaker.js")
              .then(({ speakNarration }) => speakNarration(session.sessionId, session.languageCode, text, msgId))
              .catch(err => console.error(err));
          }
        } else if (tool === "field_step") {
          // Include speechMessageId so frontend waits for exactly this audio before moving on
          const speechMsgId = (session.ttsEnabled && args.speech) ? crypto.randomUUID() : undefined;
          const toolArgs = { ...args, tts: session.ttsEnabled, speechMessageId: speechMsgId };
          this.tool(session, tool, toolArgs);
          if (speechMsgId) {
            if (session.responder) {
              if (session.ttsEnabled) {
                session.responder.speak(String(args.speech), speechMsgId);
              }
            } else if (session.ttsEnabled) {
              import("../services/narrationSpeaker.js")
                .then(({ speakNarration }) => speakNarration(session.sessionId, session.languageCode, String(args.speech), speechMsgId))
                .catch(err => console.error(err));
            }
          }
        } else {
          this.tool(session, tool, args);
        }
      }
      if (cmd.navContext) session.currentNav = cmd.navContext;
      if (cmd.fill) session.filledValues.set(cmd.fill.key, cmd.fill.value);
      if (cmd.waitFor !== "_continue") {
        session.lastCommand = cmd;
        session.waitingFor = cmd.waitFor;
        this.setStepTimeout(session, cmd.waitFor);
        break;
      }
    }
  }

  handleEvent(sessionId: string, event: string, data?: any): void {
    const session = this.sessionManager.get(sessionId)!;
    if (!session) return;
    if (event === "dialog_closed_by_user" || event === "page_changed") {
      this.cancel(sessionId);
    } else if (event === "field_changed") {
      if (data && typeof data.fieldKey === "string") {
        console.log(`[Executor] Updating filledValues for ${data.fieldKey} to ${data.value}`);
        session.filledValues.set(data.fieldKey, data.value);
      }
    } else if (event === "form_registered") {
      session.isRegistered = true;
      const sm1 = session.stateMachine.currentState;
      if (sm1 !== "PAUSED" && sm1 !== "DETOUR_QA" && session.waitingFor === event) {
        session.skipCount = 0;
        this.clearStepTimeout(sessionId);
        session.waitingFor = null;
        this.sendNext(session);
      }
    } else if (event === "form_registration_timeout") {
      console.warn(`[Executor] Form registration timed out for ${sessionId}. Proceeding with DOM-only strategy.`);
      session.isRegistered = false; // Explicitly mark as DOM-only
      const sm1 = session.stateMachine.currentState;
      if (sm1 !== "PAUSED" && sm1 !== "DETOUR_QA") {
        this.clearStepTimeout(sessionId);
        session.waitingFor = null;
        this.sendNext(session);
      }
    } else if (event === "field_not_found") {
      console.warn(`[Executor] Field not found on frontend: ${data?.fieldKey}. Skipping step.`);
      session.skipCount = (session.skipCount || 0) + 1;
      if (session.skipCount >= 3) {
        console.warn(`[Executor] 3 consecutive skips — cancelling walkthrough`);
        this.cancel(session.sessionId);
      } else {
        const sm1 = session.stateMachine.currentState;
        if (sm1 !== "PAUSED" && sm1 !== "DETOUR_QA") {
          this.clearStepTimeout(sessionId);
          session.waitingFor = null;
          this.sendNext(session);
        }
      }
    } else if (event === "error") {
      console.warn("[Executor] Frontend error:", data);
      this.cancel(sessionId);
    } else if (event === "tts_playback_interrupted") {
      // Only pause if we're actively waiting for audio completion.
      // If we've already moved on (e.g., LLM processed a "continue"),
      // ignore this stale signal.
      if (session.waitingFor === "walkthrough_speak_done" || session.waitingFor === "field_done") {
        this.clearStepTimeout(sessionId);
        this.pause(sessionId);
      }
    } else if (event === "field_audio_timeout" || event === "speak_audio_timeout") {
      console.warn(`[Executor] Audio timeout for event: ${event} (field: ${data?.fieldKey})`);
      session.skipCount = (session.skipCount || 0) + 1;
      this.clearStepTimeout(sessionId);
      if (session.skipCount >= 3) {
        console.warn(`[Executor] 3 consecutive timeouts — cancelling walkthrough`);
        this.cancel(sessionId);
      } else {
        session.waitingFor = null;
        this.sendNext(session);
      }
    } else {
      this.eventMonitor.notify(session, event, data);
      const sm = session.stateMachine.currentState;
      let matched = session.waitingFor === event;
      if (event === "tts_playback_complete" && session.waitingFor === "walkthrough_speak_done") {
        matched = true;
      }
      if (sm !== "PAUSED" && sm !== "DETOUR_QA" && matched) {
        session.skipCount = 0;
        this.clearStepTimeout(sessionId);
        session.waitingFor = null;
        this.sendNext(session);
      }
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private setStepTimeout(session: WalkthroughSession, expectedEvent: string): void {
    const existing = this.stepTimers.get(session.sessionId);
    if (existing) clearTimeout(existing);

    const timeoutMs = (expectedEvent === "walkthrough_speak_done" || expectedEvent === "field_done") ? 30000 : 10000;

    const timer = setTimeout(() => {
      this.stepTimers.delete(session.sessionId);
      
      if (expectedEvent === "walkthrough_speak_done" || expectedEvent === "field_done") {
        console.warn(`[Executor] Timeout waiting for "${expectedEvent}" — skipping step`);
        // SKIP instead of cancel
        session.waitingFor = null;
        this.sendNext(session);
        
        // Track consecutive skips and only cancel after 3
        session.skipCount = (session.skipCount || 0) + 1;
        if (session.skipCount >= 3) {
          console.warn(`[Executor] 3 consecutive timeouts — cancelling walkthrough`);
          this.cancel(session.sessionId);
        }
      } else {
        console.warn(`[Executor] Timeout waiting for setup step "${expectedEvent}" — cancelling walkthrough`);
        this.cancel(session.sessionId);
      }
    }, timeoutMs);
    this.stepTimers.set(session.sessionId, timer);
  }

  private clearStepTimeout(sessionId: string): void {
    const timer = this.stepTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.stepTimers.delete(sessionId);
    }
  }

  private finish(session: WalkthroughSession): void {
    this.clearStepTimeout(session.sessionId);
    this.tool(session, "close_dialog", {});
    this.tool(session, "walkthrough_finished", {});
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
