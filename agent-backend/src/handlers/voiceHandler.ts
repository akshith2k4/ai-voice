import type { HandlerContext, VoiceMessage } from "../types.js";
import { walkthroughDriver } from "../walkthrough/driver.js";

export function handleVoice(
  message: VoiceMessage,
  context: HandlerContext
): void {
  const { audio, text } = message;

  // --- MVP: Text command support ---
  // Test command: "test:createOrder" → start walkthrough directly
  if (text?.startsWith("test:")) {
    const formId = text.replace("test:", "").trim();
    console.log(`[VoiceHandler] Test command → starting walkthrough: ${formId}`);
    walkthroughDriver.start(formId, context.sessionId);
    return;
  }

  // Cancel command: "cancel" → cancel active walkthrough
  if (text?.toLowerCase() === "cancel" || text?.toLowerCase() === "stop") {
    console.log(`[VoiceHandler] Cancel command received`);
    walkthroughDriver.cancel(context.sessionId);
    context.send({
      type: "tool",
      tool: "respond",
      args: { message: "Walkthrough cancelled.", tts: false },
    });
    return;
  }

  // --- Voice audio (will be connected to STT + LLM in later phase) ---
  if (audio) {
    const sizeKB = Math.round((Buffer.from(audio, "base64").length / 1024));
    console.log(
      `[VoiceHandler] Audio received from ${context.sessionId}: ${sizeKB}KB`
    );
    // Stub — will be replaced with ElevenLabs STT → Gemini LLM
    context.send({
      type: "tool",
      tool: "respond",
      args: {
        message:
          'Voice recognition not connected yet. Type "test:createOrder" to start a walkthrough.',
        tts: false,
      },
    });
    return;
  }

  // Unknown text input
  if (text) {
    context.send({
      type: "tool",
      tool: "respond",
      args: {
        message: `I didn't understand "${text}". Type "test:createOrder" to start a walkthrough, or "cancel" to stop one.`,
        tts: false,
      },
    });
  }
}
