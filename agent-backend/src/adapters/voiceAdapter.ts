// VoiceAdapter — handles all voice input/output for a session.
// Owns: audio chunk accumulation, STT, barge-in detection, filler audio.
// Creates a VoiceResponder per request and calls IntentRouter.
// Has no knowledge of LLM, walkthrough, or tool dispatch.

import type { IncomingMessage, VoiceMessage, HandlerContext } from "../types.js";
import * as sttService from "../services/sttService.js";
import { onSpeechDetected } from "../services/sttService.js";
import { isQuestion, selectFiller } from "../services/fillerService.js";
import * as responseSender from "../services/responseSender.js";
import { startTracking, recordStt, getLatency } from "../services/latencyTracker.js";
import { VoiceResponder } from "./responders/voiceResponder.js";
import { EventMonitor } from "../walkthrough/eventMonitor.js";
import { walkthroughExecutor } from "../walkthrough/executor.js";
import { processText } from "../core/flowController.js";

// Shared EventMonitor — used by all VoiceResponders in this process
const statusAwaiter = new EventMonitor();

export async function handleIncoming(message: IncomingMessage, context: HandlerContext): Promise<void> {
  const { sessionId } = context;
  try {
    if (message.type === "audio_chunk") {
      await sttService.handleAudioChunk(sessionId, (message as any).audio);
      return;
    }

    if (message.type === "audio_end") {
      await startTracking(async () => {
        const stt = await sttService.handleAudioEnd(sessionId);
        await afterSTT(stt, context);
      });
      return;
    }

    const msg = message as VoiceMessage;

    if (msg.text?.startsWith("test:")) {
      const responder = makeResponder(context);
      walkthroughExecutor.start(msg.text.slice(5).trim(), sessionId, responder, false);
      return;
    }

    if (msg.text && !msg.audio) {
      await startTracking(() => processUserText(msg.text!, "en", context));
      return;
    }

    if (msg.audio) {
      await startTracking(async () => {
        const sttStart = Date.now();
        const stt = await sttService.transcribeAudio(msg.audio!);
        recordStt(Date.now() - sttStart);
        await afterSTT(stt, context);
      });
    }
  } catch (error) {
    console.error("[VoiceAdapter] Unexpected error:", error);
    context.send({ type: "tool", tool: "respond", args: { message: "Something went wrong. Please try again.", tts: true } });
  }
}

async function afterSTT(stt: sttService.SttResult, context: HandlerContext): Promise<void> {
  const { sessionId, send } = context;

  if (!stt.text) {
    const count = (emptyRetries.get(sessionId) || 0) + 1;
    if (count < MAX_EMPTY_RETRIES) {
      emptyRetries.set(sessionId, count);
      const msg = "I didn't catch that, could you repeat?";
      responseSender.sendRespond(send, msg, true, undefined, getLatency());
      makeResponder(context).speak(msg);
    } else {
      emptyRetries.delete(sessionId);
    }
    return;
  }

  emptyRetries.delete(sessionId);
  responseSender.sendRespond(send, `You said: "${stt.text}"`, false);
  await processUserText(stt.text, stt.languageCode, context);
}

async function processUserText(text: string, languageCode: string | undefined, context: HandlerContext): Promise<void> {
  const { sessionId, send } = context;
  let lang = languageCode || "en";
  if (lang.toLowerCase() === "eng" || lang.toLowerCase().startsWith("en")) lang = "en";

  playFiller(text, lang, sessionId, send);

  const responder = makeResponder(context, lang);
  await processText(text, sessionId, lang, responder);
}

function makeResponder(context: HandlerContext, lang = "en"): VoiceResponder {
  return new VoiceResponder(context.send, context.sessionId, lang, statusAwaiter);
}

function playFiller(text: string, lang: string, sessionId: string, send: HandlerContext["send"]): void {
  if (lang !== "en" || !isQuestion(text)) return;
  const filler = selectFiller(text, sessionId);
  if (!filler) return;
  const fillerMessageId = crypto.randomUUID();
  console.log(`[VoiceAdapter] Filler: "${filler.text}"`);
  responseSender.sendRespond(send, filler.text, true, fillerMessageId);
  responseSender.sendTtsAudio(send, filler.base64, fillerMessageId, true);
}

export function interruptTTS(sessionId: string): void {
  const session = walkthroughExecutor.getSession(sessionId);

  // Interrupt the responder if one is bound to the session
  if (session?.responder) {
    session.responder.interrupt();
  }

  // Pause the walkthrough if it's actively running
  if (session) {
    const state = session.stateMachine.currentState;
    if (state !== "DETOUR_QA" && state !== "PAUSED") {
      console.log(`[VoiceAdapter] Barge-in — pausing walkthrough for ${sessionId}`);
      try { session.stateMachine.transition("PAUSE"); } catch (e) {
        console.warn("[VoiceAdapter] Failed to pause state machine:", e);
      }
    }
  }
}

export async function cleanupSession(sessionId: string): Promise<void> {
  console.log(`[VoiceAdapter] Cleaning up session: ${sessionId}`);

  walkthroughExecutor.cancel(sessionId);

  try {
    const { cleanupSession: cleanTTS } = await import("../services/ttsService.js");
    cleanTTS(sessionId);
  } catch (err) {
    console.warn("[VoiceAdapter] Failed to cleanup TTS:", err);
  }

  emptyRetries.delete(sessionId);

  try {
    const { cleanupSession: cleanSTT } = await import("../services/sttService.js");
    cleanSTT(sessionId);
  } catch (err) {
    console.warn("[VoiceAdapter] Failed to cleanup STT:", err);
  }
}

// Barge-in: frontend detects speech → interrupt everything
onSpeechDetected((sessionId) => {
  console.log(`[VoiceAdapter] Speech detected for ${sessionId} — interrupting TTS`);
  interruptTTS(sessionId);
});

const MAX_EMPTY_RETRIES = 2;
const emptyRetries = new Map<string, number>();
