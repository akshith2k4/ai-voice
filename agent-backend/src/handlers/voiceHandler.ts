import type { IncomingMessage, HandlerContext } from "../types.js";
import { handleVoiceMessage } from "../services/voicePipeline.js";
import { handleAudioChunk, handleAudioEnd } from "../services/sttService.js";

export async function handleVoice(message: IncomingMessage, context: HandlerContext) {
  const { sessionId } = context;
  try {
    if (message.type === "audio_chunk") {
      await handleAudioChunk(sessionId, message.audio);
    } else if (message.type === "audio_end") {
      const result = await handleAudioEnd(sessionId);
      await handleVoiceMessage({ type: "voice" }, context, result);
    } else {
      await handleVoiceMessage(message as import("../types.js").VoiceMessage, context);
    }
  } catch (error) {
    console.error("[VoiceHandler] Unexpected error:", error);
    context.send({
      type: "tool",
      tool: "respond",
      args: { message: "Something went wrong. Please try again.", tts: true },
    });
  }
}
