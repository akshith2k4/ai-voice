import { connectionManager } from "../connectionManager.js";
import type { StatusAwaiter } from "./statusAwaiter.js";
import type { WalkthroughSession } from "./sessionManager.js";


import crypto from "crypto";

const activeNarrations = new Map<string, { interrupted: boolean }>();

export function interruptNarration(sessionId: string) {
  const state = activeNarrations.get(sessionId);
  if (state) {
    state.interrupted = true;
  }
  // Call interruptActiveTTS to detach any active TTS fetch to the background
  import("../services/ttsService.js").then(({ interruptActiveTTS }) => {
    interruptActiveTTS(sessionId);
  }).catch((err) => {
    console.error("[NarrationService] Failed to interrupt active TTS queue:", err);
  });

  import("./driver.js").then(({ walkthroughDriver }) => {
    walkthroughDriver.rejectPendingNarration(sessionId);
  }).catch((err) => {
    console.error("[NarrationService] Failed to reject pending narration on walkthroughDriver:", err);
  });
}

function getHash(text: string, languageCode: string = "en"): string {
  const normalized = text.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  return crypto.createHash("md5").update(`${normalized}_${languageCode}`).digest("hex");
}

export class NarrationService {
  private statusAwaiter: StatusAwaiter;

  constructor(statusAwaiter: StatusAwaiter) {
    this.statusAwaiter = statusAwaiter;
  }

  async speak(
    session: WalkthroughSession,
    text: string,
    languageCode: string = "en",
    messageId?: string
  ): Promise<string> {
    const id = messageId || crypto.randomUUID();
    
    const state = { interrupted: false };
    activeNarrations.set(session.sessionId, state);

    // Look for pre-recorded audio file matching the MD5 hash of the normalized text prompt + language
    const hash = getHash(text, languageCode);
    const s3Key = `walkthrough-audio/${hash}.mp3`;

    let existsOnS3 = false;

    // Check S3 directly for cached audios
    try {
      const { checkS3ObjectExists } = await import("../services/s3Service.js");
      existsOnS3 = await checkS3ObjectExists(s3Key);
    } catch (s3Err) {
      console.warn(`[NarrationService] S3 check failed for ${s3Key}:`, s3Err);
    }

    if (existsOnS3) {
      try {
        const { getPresignedUrl } = await import("../services/s3Service.js");
        const signedUrl = await getPresignedUrl(s3Key);
        console.log(`[NarrationService] S3 Hit! Streaming presigned URL: ${signedUrl} for prompt: "${text.substring(0, 40)}..."`);

        if (!state.interrupted) {
          connectionManager.send(session.sessionId, {
            type: "tts_audio",
            url: signedUrl,
            messageId: id,
            done: true,
          });
        }

        if (activeNarrations.get(session.sessionId) === state) {
          activeNarrations.delete(session.sessionId);
        }
        return id;
      } catch (err: any) {
        console.warn(`[NarrationService] Failed to generate S3 presigned URL for ${s3Key}:`, err);
      }
    }

    console.log(`[NarrationService] Cache miss (no S3 file for key ${s3Key}). Falling back to live ElevenLabs TTS.`);

    try {
      const { synthesizeStream } = await import("../services/ttsService.js");
      const chunks: Buffer[] = [];

      await synthesizeStream(text, languageCode, (base64Chunk, isDone) => {
        // Collect chunk for S3 caching
        if (base64Chunk) {
          chunks.push(Buffer.from(base64Chunk, "base64"));
        }

        // Only stream to the frontend if the narration hasn't been interrupted
        if (!state.interrupted) {
          connectionManager.send(session.sessionId, {
            type: "tts_audio",
            audio: base64Chunk,
            messageId: id,
            done: isDone,
          });
        } else if (isDone) {
          // If interrupted but done, send empty complete chunk to ensure client doesn't hang
          connectionManager.send(session.sessionId, {
            type: "tts_audio",
            audio: "",
            messageId: id,
            done: true,
          });
        }

        // Once live synthesis finishes, upload the combined buffer to S3
        if (isDone && chunks.length > 0) {
          const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
          const combinedBuffer = Buffer.concat(chunks, totalLength);
          
          import("../services/s3Service.js").then(({ uploadToS3 }) => {
            uploadToS3(s3Key, combinedBuffer, "audio/mpeg")
              .then(() => {
                console.log(`[NarrationService] Dynamically cached new audio to S3: ${s3Key}`);
              })
              .catch((uploadErr) => {
                console.error(`[NarrationService] Failed to upload dynamic audio cache to S3: ${s3Key}`, uploadErr);
              });
          }).catch((importErr) => {
            console.error("[NarrationService] Failed to import s3Service dynamically:", importErr);
          });
        }
      }, session.sessionId);

      if (activeNarrations.get(session.sessionId) === state) {
         activeNarrations.delete(session.sessionId);
      }
      return id;
    } catch (err) {
      console.error("[NarrationService] TTS synthesis failed:", err);
      // Send an empty complete chunk so the client queue doesn't hang
      connectionManager.send(session.sessionId, {
        type: "tts_audio",
        audio: "",
        messageId: id,
        done: true,
      });
      throw err;
    }
  }

  async speakAndWait(
    session: WalkthroughSession,
    text: string,
    languageCode: string = "en",
    messageId?: string
  ): Promise<string> {
    let id: string;
    try {
      id = await this.speak(session, text, languageCode, messageId);
    } catch (err) {
      // Synthesis failed (e.g. ElevenLabs API key not configured or rate-limited).
      // Return ID immediately without waiting for playback.
      return messageId || crypto.randomUUID();
    }

    try {
      const wordCount = text.split(/\s+/).length;
      const dynamicTimeout = Math.max(5000, (wordCount / 2.5) * 1000 * 2);
      await this.statusAwaiter.waitForStatus(
        session,
        "tts_playback_complete",
        dynamicTimeout,
        (data) => data.messageId === id
      );
    } catch (err: any) {
      if (err instanceof Error && (err.name === "CancellationError" || err.message === "Narration interrupted")) {
        console.log(`[NarrationService] TTS playback interrupted for ${id}`);
        return id;
      } else {
        console.warn(`[NarrationService] TTS playback timeout for ${id}, continuing...`);
      }
    }

    return id;
  }
}
