import type { IncomingMessage, HandlerContext } from "./types";
import { handleIncoming } from "./adapters/voiceAdapter.js";
import { walkthroughExecutor } from "./walkthrough/executor.js";

export function routeMessage(message: IncomingMessage, context: HandlerContext): void {
  switch (message.type) {
    case "voice":
    case "audio_chunk":
    case "audio_end":
      handleIncoming(message, context);
      break;
    case "event": {
      const session = walkthroughExecutor.getSession(context.sessionId);
      if (session) {
        walkthroughExecutor.handleEvent(context.sessionId, message.name, message);
      } else {
        // Notify the idle session statusAwaiter
        const { statusAwaiter, getOrCreateIdleSession } = require("./adapters/voiceAdapter.js");
        const idleSession = getOrCreateIdleSession(context.sessionId);
        statusAwaiter.notify(idleSession, message.name, message);
      }

      if (message.name === "tts_playback_complete" || message.name === "tts_playback_interrupted") {
        const { markAgentSpeechEnd } = require("./adapters/voiceAdapter.js");
        markAgentSpeechEnd(context.sessionId);
      }

      context.send({ type: "event_ack", name: message.name });
      break;
    }
    default:
      console.warn(`[Router] Unknown type: "${(message as any).type}" from ${context.sessionId}`);
      context.send({
        type: "error",
        message: `Unknown message type: "${(message as any).type}"`,
        code: "UNKNOWN_TYPE",
      });
  }
}

export function parseMessage(raw: string | Buffer): IncomingMessage | null {
  try {
    const parsed = JSON.parse(raw.toString());
    if (!parsed || typeof parsed.type !== "string") return null;
    return parsed as IncomingMessage;
  } catch {
    console.error("[Router] Failed to parse message");
    return null;
  }
}
