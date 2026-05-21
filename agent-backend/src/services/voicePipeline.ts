import type { VoiceMessage, HandlerContext } from "../types.js";
import { orchestrate } from "../../llm/orchestrator.js";
import { walkthroughDriver } from "../walkthrough/driver.js";
import * as sttService from "./sttService.js";
import * as ttsService from "./ttsService.js";
import * as responseSender from "./responseSender.js";

export async function handleVoiceMessage(
  message: VoiceMessage,
  context: HandlerContext
): Promise<void> {
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
    const stt = await sttService.transcribeAudio(message.audio);

    if (!stt.text) {
      const count = sttService.incrementRetry(sessionId);

      if (count <= sttService.getMaxRetries()) {
        responseSender.sendRespond(
          send,
          "I didn't catch that, could you repeat?",
          true
        );
      } else {
        sttService.resetRetry(sessionId);
      }
      return;
    }

    sttService.resetRetry(sessionId);

    // Echo what we heard for UI
    responseSender.sendRespond(send, `You said: "${stt.text}"`, false);

    await handleText(stt.text, stt.languageCode, context);
  } catch (error) {
    console.error("[VoiceHandler] STT error:", error);
    responseSender.sendRespond(
      send,
      "Sorry, I had trouble hearing you. Please try again.",
      true
    );
  }
}

async function handleText(
  text: string,
  languageCode: string | undefined,
  context: HandlerContext
): Promise<void> {
  const { send } = context;
  const lang = languageCode || "en";

  const { toolCalls, rawContent } = await orchestrate(text, languageCode);

  for (const tc of toolCalls) {
    switch (tc.name) {
      case "navigate": {
        responseSender.sendNavigate(send, tc.args);
        break;
      }
      case "start_walkthrough": {
        const msg = String(tc.args.message || "Starting walkthrough");
        const formId = String(tc.args.formId);
        await speakAndSend(send, msg, lang);
        walkthroughDriver.start(formId, context.sessionId);
        break;
      }
      case "answer_question": {
        await speakAndSend(send, String(tc.args.response), lang);
        break;
      }
      case "ask_clarification": {
        await speakAndSend(send, String(tc.args.message), lang);
        break;
      }
    }
  }

  if (toolCalls.length === 0 && rawContent) {
    await speakAndSend(send, rawContent, lang);
  }
}

async function speakAndSend(
  send: HandlerContext["send"],
  text: string,
  languageCode: string
): Promise<void> {
  const messageId = responseSender.sendRespond(send, text, true);

  try {
    const base64 = await ttsService.synthesizeToBase64(text, languageCode);
    responseSender.sendTtsAudio(send, base64, messageId);
  } catch (e) {
    console.error("[VoiceHandler] TTS failed:", e);
  }
}
