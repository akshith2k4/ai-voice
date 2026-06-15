import { ISTTService, SttResult } from "../interfaces.js";
import { config } from "../../config.js";

export class ElevenLabsSTT implements ISTTService {
  async transcribe(wavBuffer: Buffer): Promise<SttResult> {
    const apiKey = config.elevenlabs.apiKey;
    if (!apiKey) throw new Error("ELEVENLABS_API_KEY not configured");

    const form = new FormData();
    form.append("model_id", config.elevenlabs.sttModel);
    form.append("language_code", "en"); // pin to English — prevents mis-detection as Hindi for accented speech
    form.append("file", new Blob([new Uint8Array(wavBuffer)], { type: "audio/wav" }), "audio.wav");

    const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": apiKey },
      body: form,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`ElevenLabs STT failed ${res.status}: ${text}`);
    }

    const data = await res.json() as { text?: string; language_code?: string };
    const text = (data.text || "").trim();
    console.log(`[ElevenLabsSTT] Transcribed: "${text}"`);
    return { text, languageCode: data.language_code || "en", confidence: 1.0 };
  }
}
