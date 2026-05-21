import type { VoiceMessage, HandlerContext } from "../types.js";
import { handleVoiceMessage } from "../services/voicePipeline.js";

export async function handleVoice(message: VoiceMessage, context: HandlerContext) {
  try {
    await handleVoiceMessage(message, context);
  } catch (error) {
    console.error("[VoiceHandler] Unexpected error:", error);
    context.send({
      type: "tool",
      tool: "respond",
      args: { message: "Something went wrong. Please try again.", tts: true },
    });
  }
}
