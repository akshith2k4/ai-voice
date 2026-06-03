import { connectionManager } from "../connectionManager.js";
import type { StatusAwaiter } from "./statusAwaiter.js";
import type { WalkthroughSession } from "./sessionManager.js";


const activeNarrations = new Map<string, { interrupted: boolean }>();

export function interruptNarration(sessionId: string) {
  const state = activeNarrations.get(sessionId);
  if (state) {
    state.interrupted = true;
  }
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

    try {
      const { synthesizeStream } = await import("../services/sarvamTTS.js");
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
