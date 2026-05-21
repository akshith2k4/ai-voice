import { connectionManager } from "../connectionManager.js";
import type { StatusAwaiter } from "./statusAwaiter.js";
import type { WalkthroughSession } from "./sessionManager.js";

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

    try {
      const { synthesize } = await import("../services/elevenLabsTTS.js");
      const audioDataUrl = await synthesize(text, languageCode);
      const base64 = audioDataUrl.split(",")[1];
      connectionManager.send(session.sessionId, {
        type: "tts_audio",
        audio: base64,
        messageId: id,
      });
    } catch (err) {
      console.error("[NarrationService] TTS synthesis failed:", err);
    }

    return id;
  }

  async speakAndWait(
    session: WalkthroughSession,
    text: string,
    languageCode: string = "en",
    messageId?: string
  ): Promise<string> {
    const id = await this.speak(session, text, languageCode, messageId);

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
