import crypto from "crypto";
import { connectionManager } from "../connectionManager.js";
import { synthesizeStream } from "./ttsService.js";

const activeNarrations = new Map<string, { interrupted: boolean }>();

export async function speakNarration(sessionId: string, lang: string, text: string, messageId: string): Promise<void> {
  const state = { interrupted: false };
  activeNarrations.set(sessionId, state);

  const s3Key = `walkthrough-audio/${getHash(text, lang)}.mp3`;

  try {
    const { checkS3ObjectExists, getPresignedUrl } = await import("./s3Service.js");
    if (await checkS3ObjectExists(s3Key)) {
      const url = await getPresignedUrl(s3Key);
      if (!state.interrupted) {
        connectionManager.send(sessionId, { type: "tts_audio", url, messageId, done: true });
      }
      return;
    }
  } catch (e) {
    console.warn("[NarrationSpeaker] S3 check failed:", e);
  }

  try {
    const chunks: Buffer[] = [];
    await synthesizeStream(text, lang, (base64Chunk, isDone) => {
      if (base64Chunk) chunks.push(Buffer.from(base64Chunk, "base64"));
      if (!state.interrupted) {
        connectionManager.send(sessionId, { type: "tts_audio", audio: base64Chunk, messageId, done: isDone });
      } else if (isDone) {
        connectionManager.send(sessionId, { type: "tts_audio", audio: "", messageId, done: true });
      }
      if (isDone && chunks.length > 0) {
        const buf = Buffer.concat(chunks);
        import("./s3Service.js")
          .then(({ uploadToS3 }) => uploadToS3(s3Key, buf, "audio/mpeg"))
          .catch(e => console.warn("[NarrationSpeaker] S3 upload failed:", e));
      }
    }, sessionId);
  } catch (e) {
    console.error("[NarrationSpeaker] TTS synthesis failed:", e);
    connectionManager.send(sessionId, { type: "tts_audio", audio: "", messageId, done: true });
  }
}


function getHash(text: string, lang: string): string {
  const normalized = text.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  return crypto.createHash("md5").update(`${normalized}_${lang}`).digest("hex");
}
