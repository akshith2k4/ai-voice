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
import { synthesizeStream } from "../services/ttsService.js";

// Shared EventMonitor — used by all VoiceResponders in this process
export const statusAwaiter = new EventMonitor();

const idleSessions = new Map<string, any>();
const activeResponders = new Map<string, VoiceResponder>();

export function getOrCreateIdleSession(sessionId: string): any {
  let s = idleSessions.get(sessionId);
  if (!s) {
    s = { eventWaiters: [] };
    idleSessions.set(sessionId, s);
  }
  return s;
}

export async function handleIncoming(message: IncomingMessage, context: HandlerContext): Promise<void> {
  const { sessionId } = context;
  try {
    if (message.type === "audio_chunk") {
      await sttService.handleAudioChunk(sessionId, (message as any).audio);
      return;
    }

    if (message.type === "audio_end") {
      await startTracking(async () => {
        try {
          const stt = await sttService.handleAudioEnd(sessionId);
          await afterSTT(stt, context);
        } catch (error) {
          console.error("[VoiceAdapter] STT error:", error);
          const msg = "Sorry, I had trouble hearing you. Please try again.";
          const messageId = responseSender.sendRespond(context.send, msg, true, undefined, getLatency());
          synthesizeStream(msg, "en", (base64, done) => {
            context.send({ type: "tts_audio", audio: base64, messageId, done });
          }, sessionId).catch(err => console.error(err));
        }
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
        try {
          const stt = await sttService.transcribeAudio(msg.audio!);
          recordStt(Date.now() - sttStart);
          await afterSTT(stt, context);
        } catch (error) {
          console.error("[VoiceAdapter] STT error:", error);
          const msgText = "Sorry, I had trouble hearing you. Please try again.";
          const messageId = responseSender.sendRespond(context.send, msgText, true, undefined, getLatency());
          synthesizeStream(msgText, "en", (base64, done) => {
            context.send({ type: "tts_audio", audio: base64, messageId, done });
          }, sessionId).catch(err => console.error(err));
        }
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
    if (count <= MAX_EMPTY_RETRIES) {
      emptyRetries.set(sessionId, count);
      const msg = "I didn't catch that, could you repeat?";
      const messageId = responseSender.sendRespond(send, msg, true, undefined, getLatency());
      synthesizeStream(msg, "en", (base64, done) => {
        context.send({ type: "tts_audio", audio: base64, messageId, done });
      }, sessionId).catch(err => console.error(err));
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
  const lowerLang = lang.toLowerCase();
  if (lowerLang.startsWith("en") || lowerLang === "eng") {
    lang = "en";
  } else if (lowerLang.startsWith("hi") || lowerLang === "hin" || lowerLang === "hindi") {
    lang = "hi";
  } else if (lowerLang.startsWith("es") || lowerLang === "spa" || lowerLang === "spanish") {
    lang = "es";
  }

  const session = walkthroughExecutor.getSession(sessionId);
  if (session && session.languageCode) {
    lang = session.languageCode;
  }

  playFiller(text, lang, sessionId, send);

  const responder = makeResponder(context, lang);
  await processText(text, sessionId, lang, responder);
}

function makeResponder(context: HandlerContext, lang = "en"): VoiceResponder {
  const responder = new VoiceResponder(context.send, context.sessionId, lang, statusAwaiter);
  activeResponders.set(context.sessionId, responder);
  const session = walkthroughExecutor.getSession(context.sessionId);
  if (session) {
    responder.boundSession = session;
  } else {
    responder.boundSession = getOrCreateIdleSession(context.sessionId);
  }
  return responder;
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
  markAgentSpeechEnd(sessionId);

  const session = walkthroughExecutor.getSession(sessionId);

  // Interrupt the responder if one is bound to the session
  if (session?.responder) {
    session.responder.interrupt();
  } else {
    const activeResp = activeResponders.get(sessionId);
    if (activeResp) {
      activeResp.interrupt();
    }
  }

  // Pause the walkthrough if it's actively running
  if (session) {
    walkthroughExecutor.pause(sessionId);
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
  activeResponders.delete(sessionId);
  idleSessions.delete(sessionId);
  agentSpeechStart.delete(sessionId);

  try {
    const { cleanupSession: cleanSTT } = await import("../services/sttService.js");
    cleanSTT(sessionId);
  } catch (err) {
    console.warn("[VoiceAdapter] Failed to cleanup STT:", err);
  }
}

// Track when the agent starts speaking per session
const agentSpeechStart = new Map<string, number>();

// Grace period: ignore barge-in signals for this many ms after agent starts speaking
const BARGE_IN_GRACE_PERIOD_MS = 1500;

export function markAgentSpeechStart(sessionId: string): void {
  agentSpeechStart.set(sessionId, Date.now());
}

export function markAgentSpeechEnd(sessionId: string): void {
  agentSpeechStart.delete(sessionId);
}

// Barge-in: frontend detects speech → interrupt everything
onSpeechDetected((sessionId) => {
  const speechStart = agentSpeechStart.get(sessionId);
  if (speechStart) {
    const elapsed = Date.now() - speechStart;
    if (elapsed < BARGE_IN_GRACE_PERIOD_MS) {
      console.log(
        `[VoiceAdapter] Ignoring barge-in for ${sessionId} — ` +
        `agent started speaking ${elapsed}ms ago (grace: ${BARGE_IN_GRACE_PERIOD_MS}ms)`
      );
      return;
    }
  }
  console.log(`[VoiceAdapter] Speech detected for ${sessionId} — interrupting TTS`);
  interruptTTS(sessionId);
});

const MAX_EMPTY_RETRIES = 2;
const emptyRetries = new Map<string, number>();
