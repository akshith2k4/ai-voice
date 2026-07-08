import { streamLLM, type LLMStreamChunk, type LLMResult, type LLMToolCall } from "../../llm/llmService.js";
import { traceable } from "langsmith/traceable";
import { recordLlm, startTracking, getTurnId, recordLlmUsage } from "../services/latencyTracker.js";
import { fireAndForget } from "../services/observability.js";
import { db, turns } from "../services/db.js";
import { eq } from "drizzle-orm";
import type { IResponder } from "../adapters/responders/IResponder.js";
import { toolDispatcher } from "./toolDispatcher.js";
import { walkthroughExecutor } from "../walkthrough/executor.js";
import { config } from "../config.js";

const activeAbortControllers = new Map<string, AbortController>();

function isNoiseInput(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;

  // Bracketed text like [music], [outro jingle]
  if (/^[\[\(\{\<].*[\]\)\}\>]$/i.test(trimmed)) return true;

  // Check for common STT non-speech tags anywhere in the input
  const sttNoiseKeywords = /\[(music|jingle|outro|intro|applause|laughter|coughing|sigh|throat|whispering|noise|static|silence|inaudible)\]/i;
  if (sttNoiseKeywords.test(trimmed)) return true;

  // Clean the text to see if there is any alphanumeric character
  const cleanText = trimmed.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").trim();
  if (cleanText.length === 0) return true;

  if (cleanText.length === 1 && !/^\d$/.test(cleanText)) {
    return true;
  }

  // Common filler words if they are the ONLY input
  const fillers = new Set(["um", "uh", "ah", "oh", "er", "hmm"]);
  if (fillers.has(cleanText.toLowerCase())) return true;

  return false;
}

export const processText = traceable(async function (
  text: string,
  sessionId: string,
  lang: string,
  responder: IResponder
): Promise<void> {
  if (isNoiseInput(text)) {
    console.log(`[FlowController] Filtered out noise/STT hallucination: "${text}"`);
    responder.interrupt();
    const clarificationMsg = lang === "hi" 
      ? "मुझे समझ नहीं आया। क्या आप कृपया फिर से कह सकते हैं?" 
      : "I didn't quite catch that. Could you please repeat?";
    await responder.speak(clarificationMsg);
    return;
  }

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
          // ✅ FIX: Allow starting a new form and cancelling while paused
          const safePausedTools = [
            "resume_walkthrough", 
            "detour_to_field", 
            "answer_question", 
            "ask_clarification",
            "start_walkthrough",  // <-- ADDED
            "cancel_walkthrough", // <-- ADDED
            "navigate"            // <-- ADDED
          ];
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
  let lastKnownUsage = null;

  const generator = streamLLM(text, sessionId, lang, signal);

  try {
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
      
      // FIX: Intercept usage metadata from the stream chunk if present
      // LangChain streams usage in the final chunk before done.
      // We extract it here so it survives the AbortError.
      if ((chunk as any).usage_metadata) {
        lastKnownUsage = (chunk as any).usage_metadata;
      }
    }
  } catch (error: any) {
    if (signal?.aborted || error.name === "AbortError") {
      console.log(`[FlowController] Run aborted for session ${sessionId}`);
      
      // FIX: If we intercepted usage data before aborting, record it!
      if (lastKnownUsage) {
        const { input_tokens = 0, output_tokens = 0 } = lastKnownUsage;
        const modelId = config.openai.model || "gpt-4o";
        recordLlmUsage(modelId, input_tokens, output_tokens);
        console.log(`[FlowController] Recorded partial usage for aborted request: IN ${input_tokens} / OUT ${output_tokens}`);
      }
      throw error; // Re-throw to let flowController handle the abort gracefully
    }
    throw error;
  }

  recordLlm(Date.now() - llmStart);
  return { toolCalls, rawContent };
}
