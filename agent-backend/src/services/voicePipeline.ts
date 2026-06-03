import type { VoiceMessage, HandlerContext } from "../types.js";
import { orchestrate, orchestrateStream, type LLMStreamChunk, type LLMResult, type LLMToolCall } from "../../llm/orchestrator.js";
import { walkthroughDriver } from "../walkthrough/driver.js";
import { interruptNarration } from "../walkthrough/narrationService.js";
import * as sttService from "./sttService.js";
import { onSpeechDetected } from "./sttService.js";
import * as ttsService from "./ttsService.js";
import * as responseSender from "./responseSender.js";
import { connectionManager } from "../connectionManager.js";


const activeTTSQueues = new Map<string, SentenceTTSQueue>();
const activeSpeakAndSend = new Map<string, { interrupted: boolean }>();

export function interruptTTS(sessionId: string) {
  interruptNarration(sessionId);
  
  // Send stop_audio immediately to the frontend so it cuts off any playing audio
  connectionManager.send(sessionId, { type: "tool", tool: "stop_audio", args: {} });
  
  const queue = activeTTSQueues.get(sessionId);
  if (queue) {
    queue.interrupt();
  }
  const sas = activeSpeakAndSend.get(sessionId);
  if (sas) {
    sas.interrupted = true;
  }
  
  const session = walkthroughDriver.getSession(sessionId);
  if (session) {
    const state = session.stateMachine.currentState;
    if (state !== "DETOUR_QA" && state !== "PAUSED") {
      console.log(`[Barge-in] Pausing walkthrough for ${sessionId}`);
      try {
        session.stateMachine.transition("PAUSE");
      } catch (e) {
        console.warn("[Barge-in] Failed to pause state machine:", e);
      }
    }
  }
}

onSpeechDetected((sessionId) => {
  console.log(`[Barge-in] Speech detected for ${sessionId}. Interrupting TTS...`);
  interruptTTS(sessionId);
});

export async function handleVoiceMessage(
  message: VoiceMessage,
  context: HandlerContext,
  preTranscribedResult?: any
): Promise<void> {
  const { sessionId, send } = context;

  const tracker = {
    startTime: Date.now(),
    sttDuration: 0,
    llmDuration: 0,
    ttsDuration: 0,
  };

  // Test command fast path
  if (message.text && message.text.startsWith("test:")) {
    const formId = message.text.slice(5).trim();
    walkthroughDriver.start(formId, sessionId, false);
    return;
  }

  // Text path for dev testing
  if (message.text && !message.audio && !preTranscribedResult) {
    await handleText(message.text, undefined, context, tracker);
    return;
  }

  try {
    let stt;
    if (preTranscribedResult) {
      stt = preTranscribedResult;
      tracker.sttDuration = 0; // processed concurrently via websocket streaming
    } else {
      if (!message.audio) return;
      const sttStart = Date.now();
      stt = await sttService.transcribeAudio(message.audio);
      tracker.sttDuration = Date.now() - sttStart;
    }

    if (!stt.text) {
      const count = sttService.incrementRetry(sessionId);

      if (count <= sttService.getMaxRetries()) {
        const totalDuration = Date.now() - tracker.startTime;
        responseSender.sendRespond(
          send,
          "I didn't catch that, could you repeat?",
          true,
          undefined,
          {
            stt: tracker.sttDuration,
            llm: 0,
            tts: 0,
            total: totalDuration,
          }
        );
        console.log(
          `[Latency] 🎙️ No speech detected. STT: ${tracker.sttDuration}ms | Total: ${totalDuration}ms`
        );
      } else {
        sttService.resetRetry(sessionId);
      }
      return;
    }

    sttService.resetRetry(sessionId);

    // Echo what we heard for UI
    responseSender.sendRespond(send, `You said: "${stt.text}"`, false);

    await handleText(stt.text, stt.languageCode, context, tracker);
  } catch (error) {
    console.error("[VoiceHandler] STT error:", error);
    const totalDuration = Date.now() - tracker.startTime;
    responseSender.sendRespond(
      send,
      "Sorry, I had trouble hearing you. Please try again.",
      true,
      undefined,
      {
        stt: tracker.sttDuration,
        llm: 0,
        tts: 0,
        total: totalDuration,
      }
    );
  }
}

class SentenceSplitter {
  private buffer = "";
  private onSentence: (sentence: string) => void;

  constructor(onSentence: (sentence: string) => void) {
    this.onSentence = onSentence;
  }

  push(text: string) {
    this.buffer += text;
    this.process();
  }

  flush() {
    const remaining = this.buffer.trim();
    if (remaining) {
      this.onSentence(remaining);
      this.buffer = "";
    }
  }

  private process() {
    let searchStart = 0;
    while (true) {
      const remainingBuffer = this.buffer.substring(searchStart);
      const match = remainingBuffer.match(/[.!?]\s+/);
      if (!match || match.index === undefined) {
        break;
      }

      const matchIdx = searchStart + match.index;
      const endIdx = matchIdx + 1;
      const sentence = this.buffer.substring(0, endIdx).trim();

      if (this.isAbbreviation(sentence)) {
        searchStart = matchIdx + match[0].length;
        continue;
      }

      this.onSentence(sentence);
      this.buffer = this.buffer.substring(matchIdx + match[0].length);
      searchStart = 0;
    }
  }

  private isAbbreviation(text: string): boolean {
    const lastWord = text.split(/\s+/).pop()?.toLowerCase() || "";
    const commonAbbreviations = ["mr.", "mrs.", "dr.", "ms.", "vs.", "eg.", "ie.", "etc.", "approx.", "no."];
    return commonAbbreviations.includes(lastWord);
  }
}

class SentenceTTSQueue {
  private queue: Array<{ text: string; isLast: boolean }> = [];
  private processing = false;
  private send: HandlerContext["send"];
  private languageCode: string;
  private messageId: string;
  private tracker?: any;
  private ttsStart: number;
  private firstChunkReceived = false;
  private allPushed = false;
  private hasToolCalls = false;
  public interrupted = false;

  constructor(send: HandlerContext["send"], languageCode: string, messageId: string, tracker?: any) {
    this.send = send;
    this.languageCode = languageCode;
    this.messageId = messageId;
    this.tracker = tracker;
    this.ttsStart = Date.now();
  }
  
  interrupt() {
    this.interrupted = true;
    this.queue = [];
    responseSender.sendStopAudio(this.send);
  }

  push(text: string, isLast: boolean) {
    this.queue.push({ text, isLast });
    this.process();
  }

  markAllPushed(hasToolCalls = false) {
    this.allPushed = true;
    this.hasToolCalls = hasToolCalls;
    if (this.queue.length > 0) {
      this.queue[this.queue.length - 1].isLast = true;
    }
    this.process();
  }

  private async process() {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      if (this.interrupted) {
         this.queue = [];
         break;
      }
      if (!this.allPushed && this.queue.length === 1) {
        break;
      }

      const item = this.queue.shift()!;
      await this.synthesizeSentence(item.text, item.isLast);
    }

    if (this.allPushed && this.queue.length === 0) {
      if (!this.firstChunkReceived && !this.hasToolCalls) {
        responseSender.sendRespond(this.send, "", true, this.messageId, undefined);
        responseSender.sendTtsAudio(this.send, "", this.messageId, true);
      }
    }

    this.processing = false;
  }

  private synthesizeSentence(text: string, isLast: boolean): Promise<void> {
    return new Promise<void>((resolve) => {
      ttsService.synthesizeStream(text, this.languageCode, (base64Chunk, chunkDone) => {
        if (!this.firstChunkReceived) {
          this.firstChunkReceived = true;
          if (this.tracker) {
            this.tracker.ttsDuration = Date.now() - this.ttsStart;
            const totalDuration = Date.now() - this.tracker.startTime;
            console.log(
              `[Latency Breakdown] 🔊 Speech Response (First Chunk): "${text}"
-----------------------------------------
🎙️ STT:   ${this.tracker.sttDuration}ms
🧠 LLM:   ${this.tracker.llmDuration}ms
🔊 TTS:   ${this.tracker.ttsDuration}ms
⏱️ Total: ${totalDuration}ms
-----------------------------------------`
            );
          }
        }

        if (!this.interrupted) {
          const sendDone = isLast && chunkDone;
          responseSender.sendTtsAudio(this.send, base64Chunk, this.messageId, sendDone);
        }

        if (chunkDone || this.interrupted) {
          resolve();
        }
      }).catch(err => {
        console.error("[SentenceTTSQueue] Synthesis failed for:", text, err);
        resolve();
      });
    });
  }
}

async function handleText(
  text: string,
  languageCode: string | undefined,
  context: HandlerContext,
  tracker?: {
    startTime: number;
    sttDuration: number;
    llmDuration: number;
    ttsDuration: number;
  }
): Promise<void> {
  const { send, sessionId } = context;
  const lang = languageCode || "en";

  const llmStart = Date.now();
  const messageId = crypto.randomUUID();
  const ttsQueue = new SentenceTTSQueue(send, lang, messageId, tracker);
  activeTTSQueues.set(sessionId, ttsQueue);

  const splitter = new SentenceSplitter((sentence) => {
    ttsQueue.push(sentence, false);
  });

  const toolCalls: LLMToolCall[] = [];
  let rawContent = "";
  let spoke = false;

  try {
    const generator = orchestrateStream(text, sessionId, languageCode);

    while (true) {
      const { done, value } = await generator.next();

      if (done) {
        const result = value as LLMResult;
        toolCalls.push(...result.toolCalls);
        rawContent = result.rawContent || "";
        break;
      }

      const chunk = value as LLMStreamChunk;
      if (chunk.type === "text" && chunk.text) {
        spoke = true;
        splitter.push(chunk.text);
      }
    }

    if (tracker) {
      tracker.llmDuration = Date.now() - llmStart;
    }

    splitter.flush();
    ttsQueue.markAllPushed(toolCalls.length > 0);
    setTimeout(() => { if (activeTTSQueues.get(sessionId) === ttsQueue) activeTTSQueues.delete(sessionId); }, 15000); // Cleanup

  } catch (error) {
    console.error("[VoiceHandler] Orchestration stream failed:", error);
  }

  for (const tc of toolCalls) {
    switch (tc.name) {
      case "navigate": {
        responseSender.sendNavigate(send, tc.args);
        if (tracker && !spoke) {
          const totalDuration = Date.now() - tracker.startTime;
          console.log(
            `[Latency Breakdown] 🚀 Navigate (No Speech)
-----------------------------------------
🎙️ STT:   ${tracker.sttDuration}ms
🧠 LLM:   ${tracker.llmDuration}ms
🔊 TTS:   0ms
⏱️ Total: ${totalDuration}ms
-----------------------------------------`
          );
        }
        break;
      }
      case "start_walkthrough": {
        const msg = String(tc.args.message || "Starting walkthrough");
        const formId = String(tc.args.formId);
        spoke = true;
        await speakAndSend(send, msg, lang, tracker);
        walkthroughDriver.start(formId, context.sessionId);
        break;
      }
      case "answer_question": {
        spoke = true;
        await speakAndSend(send, String(tc.args.response), lang, tracker);
        break;
      }
      case "detour_to_field": {
        const session = walkthroughDriver.getSession(sessionId);
        if (session) {
          session.stateMachine.transition("DETOUR");
          const targetFieldKey = String(tc.args.fieldKey);
          let matchedField = session.schema.fields.find(f => f.key === targetFieldKey);
          if (!matchedField) {
            for (const subForm of session.schema.subForms) {
              const f = subForm.fields.find(field => field.key === targetFieldKey);
              if (f) {
                matchedField = f;
                break;
              }
            }
          }
          context.send({ type: "tool", tool: "detour_start", args: { fieldKey: targetFieldKey } });
          context.send({ type: "tool", tool: "go_to_field", args: { fieldKey: targetFieldKey, label: matchedField?.label } });

          const narrationText = matchedField?.explanation || "Let me highlight that field on your form.";
          spoke = true;
          await speakAndSend(send, narrationText, lang, tracker);
        }
        break;
      }
      case "resume_walkthrough": {
        spoke = true;
        await executeAutoResume(context, tracker);
        break;
      }
      case "ask_clarification": {
        spoke = true;
        await speakAndSend(send, String(tc.args.message), lang, tracker);
        break;
      }
    }
  }

  if (toolCalls.length === 0 && rawContent) {
    const latency = tracker ? {
      stt: tracker.sttDuration,
      llm: tracker.llmDuration,
      tts: tracker.ttsDuration,
      total: Date.now() - tracker.startTime,
    } : undefined;
    responseSender.sendRespond(send, rawContent, true, messageId, latency);
  }
}

async function speakAndSend(
  send: HandlerContext["send"],
  text: string,
  languageCode: string,
  tracker?: {
    startTime: number;
    sttDuration: number;
    llmDuration: number;
    ttsDuration: number;
  },
  sessionId?: string
): Promise<void> {
  const ttsStart = Date.now();
  let firstChunkReceived = false;
  let messageId: string | null = null;
  
  const state = { interrupted: false };
  if (sessionId) {
    activeSpeakAndSend.set(sessionId, state);
  }

  try {
    await ttsService.synthesizeStream(text, languageCode, (base64Chunk, isDone) => {
      if (!firstChunkReceived) {
        firstChunkReceived = true;
        if (tracker) {
          tracker.ttsDuration = Date.now() - ttsStart;
          const totalDuration = Date.now() - tracker.startTime;
          console.log(
            `[Latency Breakdown] 🔊 Speech Response (First Chunk): "${text}"
-----------------------------------------
🎙️ STT:   ${tracker.sttDuration}ms
🧠 LLM:   ${tracker.llmDuration}ms
🔊 TTS:   ${tracker.ttsDuration}ms
⏱️ Total: ${totalDuration}ms
-----------------------------------------`
          );
        }
        messageId = responseSender.sendRespond(send, text, true, undefined, undefined);
      }
      if (state.interrupted) {
         if (messageId) responseSender.sendStopAudio(send);
         return;
      }
      if (messageId) {
        responseSender.sendTtsAudio(send, base64Chunk, messageId, isDone);
      }
    });
  } catch (e) {
    console.error("[VoiceHandler] TTS streaming failed:", e);
    if (!firstChunkReceived) {
      responseSender.sendRespond(send, text, false, undefined, undefined);
    } else if (messageId) {
      responseSender.sendTtsAudio(send, "", messageId, true);
    }
  }
}

/**
 * Recovers execution states back down to original tracking coordinates seamlessly.
 */
export async function executeAutoResume(
  context: HandlerContext,
  tracker?: {
    startTime: number;
    sttDuration: number;
    llmDuration: number;
    ttsDuration: number;
  }
): Promise<void> {
  const session = walkthroughDriver.getSession(context.sessionId);
  if (session && session.stateMachine.currentState === "DETOUR_QA") {
    session.stateMachine.transition("DETOUR_COMPLETE");
    if (session.stateMachine.currentState as string === "PAUSED") {
      session.stateMachine.transition("RESUME");
    }
    context.send({ type: "tool", tool: "detour_end", args: {} });

    const originalCtx = session.stateMachine.currentContext;
    let targetField = session.schema.fields[originalCtx.fieldIndex];

    if (originalCtx.subFormId) {
      const subForm = session.schema.subForms.find(sf => sf.id === originalCtx.subFormId);
      if (subForm) {
        targetField = subForm.fields[originalCtx.subFormFieldIndex];
        if (targetField) {
          context.send({
            type: "tool",
            tool: "go_to_field",
            args: {
              fieldKey: targetField.key,
              label: targetField.label,
              subFormId: originalCtx.subFormId,
              itemIndex: originalCtx.subFormItemIndex,
            },
          });
          await speakAndSend(context.send, `Returning to our walkthrough. Let's look at ${targetField.label}.`, "en", tracker);
          return;
        }
      }
    }

    if (targetField) {
      context.send({ type: "tool", tool: "go_to_field", args: { fieldKey: targetField.key, label: targetField.label } });
      await speakAndSend(context.send, `Returning to our walkthrough. Let's look at ${targetField.label}.`, "en", tracker);
    }
  }
}
