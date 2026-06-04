import { connectionManager } from "../connectionManager.js";
import type { StatusAwaiter } from "./statusAwaiter.js";
import type { WalkthroughSession } from "./sessionManager.js";
import { promises as fsPromises } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import crypto from "crypto";

const activeNarrations = new Map<string, { interrupted: boolean }>();

export function interruptNarration(sessionId: string) {
  const state = activeNarrations.get(sessionId);
  if (state) {
    state.interrupted = true;
  }
}

function getHash(text: string): string {
  const normalized = text.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  return crypto.createHash("md5").update(normalized).digest("hex");
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

    // Look for pre-recorded audio file matching the MD5 hash of the normalized text prompt
    const hash = getHash(text);
    const audioFilename = `${hash}.mp3`;
    const filePath = join(__dirname, "../../voicefiles_mp3", audioFilename);

    try {
      const buffer = await fsPromises.readFile(filePath);
      console.log(`[NarrationService] Cache hit! Streaming pre-recorded audio: ${audioFilename} for prompt: "${text.substring(0, 40)}..."`);

      if (!state.interrupted) {
        connectionManager.send(session.sessionId, {
          type: "tts_audio",
          audio: buffer.toString("base64"),
          messageId: id,
          done: true,
        });
      }

      if (activeNarrations.get(session.sessionId) === state) {
        activeNarrations.delete(session.sessionId);
      }
      return id;
    } catch (err: any) {
      if (err && err.code === "ENOENT") {
        console.log(`[NarrationService] Cache miss (no pre-recorded file for hash ${hash}). Falling back to live ElevenLabs TTS.`);
      } else {
        console.warn(`[NarrationService] Failed to read pre-recorded file ${audioFilename}:`, err);
      }
    }

    try {
      const { synthesizeStream } = await import("../services/ttsService.js");
      await synthesizeStream(text, languageCode, (base64Chunk, isDone) => {
        if (state.interrupted) {
           return;
        }
        connectionManager.send(session.sessionId, {
          type: "tts_audio",
          audio: base64Chunk,
          messageId: id,
          done: isDone,
        });
      });
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
      await this.statusAwaiter.waitForStatus(
        session,
        "tts_playback_complete",
        15000,
        (data) => data.messageId === id
      );
    } catch (err) {
      console.warn(`[NarrationService] TTS playback timeout for ${id}, continuing...`);
    }

    return id;
  }
}
