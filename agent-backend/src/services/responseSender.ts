import type { HandlerContext, OutgoingMessage } from "../types.js";

export function sendRespond(
  send: HandlerContext["send"],
  message: string,
  tts: boolean,
  messageId?: string
): string {
  const id = messageId || crypto.randomUUID();
  send({
    type: "tool",
    tool: "respond",
    args: { message, tts, messageId: id },
  });
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
  messageId: string
): void {
  send({ type: "tts_audio", audio: base64, messageId });
}
