import type { IncomingMessage, HandlerContext } from "./types";
import { handleVoice } from "./handlers/voiceHandler.js";
import { handleStatus } from "./handlers/statusHandler.js";
import { walkthroughDriver } from "./walkthrough/driver.js";

export function routeMessage(
  message: IncomingMessage,
  context: HandlerContext
): void {
  switch (message.type) {
    case "voice":
    case "audio_chunk":
    case "audio_end":
      handleVoice(message, context);
      break;
    case "status":
      handleStatus(message, context);
      walkthroughDriver.handleStatus(
        context.sessionId,
        message.event,
        message
      );
      break;
    default:
      console.warn(
        `[Router] Unknown type: "${(message as any).type}" from ${context.sessionId}`
      );
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
