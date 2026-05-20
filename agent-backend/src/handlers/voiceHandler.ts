import type { VoiceMessage, HandlerContext } from "../types.js";
import { transcribe } from "../services/elevenLabsSTT.js";
import { synthesize } from "../services/elevenLabsTTS.js";
import { orchestrate } from "../../llm/orchestrator.js";
import { walkthroughDriver } from "../walkthrough/driver.js";

const MAX_EMPTY_RETRIES = 2;
const emptyRetryCount = new Map<string, number>();

export async function handleVoice(message: VoiceMessage, context: HandlerContext) {
  const { sessionId, send } = context;

  // Test command fast path
  if (message.text && message.text.startsWith("test:")) {
    const formId = message.text.slice(5).trim();
    walkthroughDriver.start(formId, sessionId);
    return;
  }

  // Text path for dev testing
  if (message.text && !message.audio) {
    await handleText(message.text, undefined, context);
    return;
  }

  // Audio path
  if (!message.audio) return;

  try {
    const stt = await transcribe(message.audio);

    if (!stt.text) {
      const count = (emptyRetryCount.get(sessionId) || 0) + 1;
      emptyRetryCount.set(sessionId, count);

      if (count <= MAX_EMPTY_RETRIES) {
        send({
          type: "tool",
          tool: "respond",
          args: { message: "I didn't catch that, could you repeat?", tts: true },
        });
      } else {
        emptyRetryCount.set(sessionId, 0);
      }
      return;
    }

    emptyRetryCount.set(sessionId, 0);

    // Echo what we heard for UI
    send({
      type: "tool",
      tool: "respond",
      args: { message: `You said: "${stt.text}"`, tts: false },
    });

    await handleText(stt.text, stt.languageCode, context);
  } catch (error) {
    console.error("[VoiceHandler] STT error:", error);
    send({
      type: "tool",
      tool: "respond",
      args: { message: "Sorry, I had trouble hearing you. Please try again.", tts: true },
    });
  }
}

async function handleText(text: string, languageCode: string | undefined, context: HandlerContext) {
  const { sessionId, send } = context;

  const { toolCalls, rawContent } = await orchestrate(text, languageCode);

  for (const tc of toolCalls) {
    switch (tc.name) {
      case "navigate": {
        send({ type: "tool", tool: "navigate", args: tc.args });
        break;
      }
      case "start_walkthrough": {
        const msg = String(tc.args.message || "Starting walkthrough");
        const formId = String(tc.args.formId);

        // Send spoken intro first
        const messageId = crypto.randomUUID();
        send({ type: "tool", tool: "respond", args: { message: msg, tts: true, messageId } });

        try {
          const audioDataUrl = await synthesize(msg, languageCode || "en");
          const base64 = audioDataUrl.split(",")[1];
          send({ type: "tts_audio", audio: base64, messageId });
        } catch (e) {
          console.error("[VoiceHandler] TTS failed for intro:", e);
        }

        walkthroughDriver.start(formId, sessionId);
        break;
      }
      case "answer_question": {
        const response = String(tc.args.response);
        const messageId = crypto.randomUUID();
        send({ type: "tool", tool: "respond", args: { message: response, tts: true, messageId } });
        try {
          const audioDataUrl = await synthesize(response, languageCode || "en");
          const base64 = audioDataUrl.split(",")[1];
          send({ type: "tts_audio", audio: base64, messageId });
        } catch (e) {
          console.error("[VoiceHandler] TTS failed for answer:", e);
        }
        break;
      }
      case "ask_clarification": {
        const msg = String(tc.args.message);
        const messageId = crypto.randomUUID();
        send({ type: "tool", tool: "respond", args: { message: msg, tts: true, messageId } });
        try {
          const audioDataUrl = await synthesize(msg, languageCode || "en");
          const base64 = audioDataUrl.split(",")[1];
          send({ type: "tts_audio", audio: base64, messageId });
        } catch (e) {
          console.error("[VoiceHandler] TTS failed for clarification:", e);
        }
        break;
      }
    }
  }

  if (toolCalls.length === 0 && rawContent) {
    const messageId = crypto.randomUUID();
    send({ type: "tool", tool: "respond", args: { message: rawContent, tts: true, messageId } });
    try {
      const audioDataUrl = await synthesize(rawContent, languageCode || "en");
      const base64 = audioDataUrl.split(",")[1];
      send({ type: "tts_audio", audio: base64, messageId });
    } catch (e) {
      console.error("[VoiceHandler] TTS failed for raw content:", e);
    }
  }
}
