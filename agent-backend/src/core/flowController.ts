import { streamLLM, type LLMStreamChunk, type LLMResult, type LLMToolCall } from "../../llm/llmService.js";
import { traceable } from "langsmith/traceable";
import { recordLlm, startTracking, getTurnId } from "../services/latencyTracker.js";
import { fireAndForget } from "../services/observability.js";
import { db, turns } from "../services/db.js";
import { eq } from "drizzle-orm";
import type { IResponder } from "../adapters/responders/IResponder.js";
import { toolDispatcher } from "./toolDispatcher.js";
import { walkthroughExecutor } from "../walkthrough/executor.js";

const activeAbortControllers = new Map<string, AbortController>();

export const processText = traceable(async function (
  text: string,
  sessionId: string,
  lang: string,
  responder: IResponder
): Promise<void> {
  const session = walkthroughExecutor.getSession(sessionId);
  if (session) {
    (responder as any).boundSession = session;
    session.responder = responder;

    const normalized = text.trim().toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");
    if (normalized === "cancel" || normalized === "stop") {
      const turnId = getTurnId();
      if (turnId) {
        fireAndForget(
          db.update(turns)
            .set({
              llmRawContent: "Walkthrough cancelled.",
            })
            .where(eq(turns.id, turnId))
        );
      }
      walkthroughExecutor.cancel(sessionId);
      await responder.speak("Walkthrough cancelled.");
      return;
    }
    if (normalized === "next" || normalized === "continue") {
      const turnId = getTurnId();
      if (turnId) {
        fireAndForget(
          db.update(turns)
            .set({
              llmRawContent: "Resuming walkthrough.",
            })
            .where(eq(turns.id, turnId))
        );
      }
      walkthroughExecutor.resumeWalkthrough(sessionId);
      return;
    }
  }

  // Abort any existing request for the same session to prevent concurrent processing/audio issues
  const existingController = activeAbortControllers.get(sessionId);
  if (existingController) {
    console.log(`[FlowController] Aborting previous in-flight request for session ${sessionId}`);
    existingController.abort();
    responder.interrupt();
  }

  const controller = new AbortController();
  activeAbortControllers.set(sessionId, controller);
  const signal = controller.signal;

  try {
    await startTracking(sessionId, async () => {
      let toolCalls: LLMToolCall[] = [];
      let rawContent = "";

      try {
        if (signal.aborted) throw new DOMException("Aborted", "AbortError");
        ({ toolCalls, rawContent } = await runLLM(text, sessionId, lang, chunk => {
          if (signal.aborted) throw new DOMException("Aborted", "AbortError");
          responder.onTextChunk(chunk);
        }, signal));
        if (signal.aborted) throw new DOMException("Aborted", "AbortError");
      } catch (error: any) {
        if (signal.aborted || error.name === "AbortError") {
          console.log(`[FlowController] Run aborted for session ${sessionId}`);
          return;
        }
        console.error("[FlowController] LLM failed:", error);
        responder.interrupt();
        await responder.speak("Sorry, I'm having trouble connecting right now. Please try again.");
        return;
      }

      const turnId = getTurnId();
      if (turnId && !signal.aborted) {
        fireAndForget(
          (async () => {
            await db.update(turns)
              .set({
                llmRawContent: rawContent,
                llmToolCalls: toolCalls,
              })
              .where(eq(turns.id, turnId));
          })()
        );
      }

      if (signal.aborted) return;

      const messageId = (responder as any).getStreamMessageId?.() ?? crypto.randomUUID();
      responder.onComplete(rawContent, messageId);

      if (rawContent) {
        const interrupted = await responder.waitForPlayback(messageId, rawContent, 8000);
        if (interrupted || signal.aborted) return;
      }

      if (toolCalls.length > 0) {
        const currentSession = walkthroughExecutor.getSession(sessionId);
        const isPaused = currentSession?.stateMachine.currentState === "PAUSED" || currentSession?.cancelled;

        if (isPaused) {
          const safePausedTools = ["resume_walkthrough", "detour_to_field", "answer_question", "ask_clarification"];
          const originalCount = toolCalls.length;
          toolCalls = toolCalls.filter(tc => safePausedTools.includes(tc.name));
          
          if (toolCalls.length === 0) {
            console.log("[FlowController] Discarding all stale LLM tool calls due to barge-in/pause.");
            return;
          } else if (toolCalls.length < originalCount) {
            console.log(`[FlowController] Discarded ${originalCount - toolCalls.length} unsafe tool calls during pause.`);
          }
        }

        if (signal.aborted) return;
        await toolDispatcher.dispatch(toolCalls, sessionId, lang, responder, !!rawContent);
      }
    });
  } finally {
    if (activeAbortControllers.get(sessionId) === controller) {
      activeAbortControllers.delete(sessionId);
    }
  }
}, { name: "processText" });


async function runLLM(
  text: string,
  sessionId: string,
  lang: string,
  onTextChunk: (chunk: string) => void,
  signal?: AbortSignal
): Promise<{ toolCalls: LLMToolCall[]; rawContent: string }> {
  const llmStart = Date.now();
  const toolCalls: LLMToolCall[] = [];
  let rawContent = "";

  const generator = streamLLM(text, sessionId, lang, signal);

  while (true) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const { done, value } = await generator.next();
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    if (done) {
      const result = value as LLMResult;
      toolCalls.push(...result.toolCalls);
      rawContent = result.rawContent || "";
      break;
    }
    const chunk = value as LLMStreamChunk;
    if (chunk.type === "text" && chunk.text) onTextChunk(chunk.text);
  }

  recordLlm(Date.now() - llmStart);
  return { toolCalls, rawContent };
}
