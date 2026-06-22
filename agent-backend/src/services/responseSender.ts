import type { HandlerContext, OutgoingMessage } from "../types.js";
import { getTurnId, getSessionId, setTurnId, getUserName } from "./latencyTracker.js";
import { fireAndForget } from "./observability.js";
import { db, turns, ensureSessionExists } from "./db.js";
import { eq } from "drizzle-orm";

export function sendRespond(
  send: HandlerContext["send"],
  message: string,
  tts: boolean,
  messageId?: string,
  latency?: {
    stt: number;
    llm: number;
    tts: number;
    total: number;
  }
): string {
  const id = messageId || crypto.randomUUID();
  const cleanMessage = message.replace(/\[[^\]]+\]/g, "").replace(/\s+/g, " ").trim();
  send({
    type: "tool",
    tool: "respond",
    args: { message: cleanMessage, tts, messageId: id, latency },
  });

  if (tts) {
    let turnId = getTurnId();
    if (!turnId) {
      turnId = crypto.randomUUID();
      setTurnId(turnId);
      const sessionId = getSessionId();
      if (sessionId) {
        fireAndForget(
          (async () => {
            await ensureSessionExists(sessionId, undefined, getUserName() || undefined);
            await db.insert(turns).values({
              id: turnId,
              sessionId,
              agentTranscript: cleanMessage,
            });
          })()
        );
      }
    } else {
      fireAndForget(
        db.update(turns)
          .set({ agentTranscript: cleanMessage })
          .where(eq(turns.id, turnId))
      );
    }
  }

  return id;
}

export function sendNavigate(
  send: HandlerContext["send"],
  args: Record<string, unknown>
): void {
  send({ type: "tool", tool: "navigate", args });
}

export function sendTtsAudio(
  send: HandlerContext["send"],
  base64: string,
  messageId: string,
  done?: boolean
): void {
  send({ type: "tts_audio", audio: base64, messageId, done });
}

export function sendStopAudio(
  send: HandlerContext["send"]
): void {
  send({ type: "tool", tool: "stop_audio", args: {} });
}
