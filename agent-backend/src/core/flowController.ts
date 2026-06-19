import { streamLLM, type LLMStreamChunk, type LLMResult, type LLMToolCall } from "../../llm/llmService.js";
import { recordLlm, startTracking } from "../services/latencyTracker.js";
import type { IResponder } from "../adapters/responders/IResponder.js";
import { toolDispatcher } from "./toolDispatcher.js";
import { walkthroughExecutor } from "../walkthrough/executor.js";

export async function processText(
  text: string,
  sessionId: string,
  lang: string,
  responder: IResponder
): Promise<void> {
  const session = walkthroughExecutor.getSession(sessionId);
  if (session) {
    (responder as any).boundSession = session;
    session.responder = responder;
  }

  await startTracking(async () => {
    let toolCalls: LLMToolCall[] = [];
    let rawContent = "";

    try {
      ({ toolCalls, rawContent } = await runLLM(text, sessionId, lang, chunk => responder.onTextChunk(chunk)));
    } catch (error) {
      console.error("[FlowController] LLM failed:", error);
      responder.interrupt();
      await responder.speak("Sorry, I'm having trouble connecting right now. Please try again.");
      return;
    }

    const messageId = (responder as any).getStreamMessageId?.() ?? crypto.randomUUID();
    responder.onComplete(rawContent, messageId);

    if (rawContent) {
      const interrupted = await responder.waitForPlayback(messageId, rawContent, 8000);
      if (interrupted) return;
    }

    if (toolCalls.length > 0) {
      const currentSession = walkthroughExecutor.getSession(sessionId);
      const isPaused = currentSession?.stateMachine.currentState === "PAUSED" || currentSession?.cancelled;

      // If the user interrupted/paused, only execute tools explicitly safe mid-pause.
      // Discard everything else (like stale text or duplicate actions).
      const safePausedTools = ["resume_walkthrough", "detour_to_field", "answer_question", "ask_clarification"];
      const isSafeTool = toolCalls.every(tc => safePausedTools.includes(tc.name));

      if (isPaused && !isSafeTool) {
        console.log("[FlowController] Discarding stale LLM response due to barge-in/pause.");
        return;
      }

      await toolDispatcher.dispatch(toolCalls, sessionId, lang, responder, !!rawContent);
    }
  });
}


async function runLLM(
  text: string,
  sessionId: string,
  lang: string,
  onTextChunk: (chunk: string) => void
): Promise<{ toolCalls: LLMToolCall[]; rawContent: string }> {
  const llmStart = Date.now();
  const toolCalls: LLMToolCall[] = [];
  let rawContent = "";

  const generator = streamLLM(text, sessionId, lang);

  while (true) {
    const { done, value } = await generator.next();
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
