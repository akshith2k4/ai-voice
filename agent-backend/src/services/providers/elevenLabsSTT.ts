import { ISTTService, SttResult } from "../interfaces.js";
import { config } from "../../config.js";

export class ElevenLabsSTT implements ISTTService {
  async transcribe(wavBuffer: Buffer, attempt = 1): Promise<SttResult> {
    const apiKey = config.elevenlabs.apiKey;
    if (!apiKey) throw new Error("ELEVENLABS_API_KEY not configured");

    const form = new FormData();
    form.append("model_id", config.elevenlabs.sttModel);
    form.append("file", new Blob([new Uint8Array(wavBuffer)], { type: "audio/wav" }), "audio.wav");

    try {
      const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
        method: "POST",
        headers: { "xi-api-key": apiKey },
        body: form,
        signal: AbortSignal.timeout(10000),
      });

      if ((res.status === 429 || res.status >= 500) && attempt <= 2) {
        console.warn(`[ElevenLabsSTT] Transient status ${res.status}. Retrying in 1000ms (attempt ${attempt}/2)...`);
        await new Promise(r => setTimeout(r, 1000));
        return this.transcribe(wavBuffer, attempt + 1);
      }

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`ElevenLabs STT failed ${res.status}: ${text}`);
      }

      // ✅ Parse the exact response format from the ElevenLabs docs
      const data = await res.json() as { 
        text?: string; 
        language_code?: string; 
        language_probability?: number;
      };
      
      const text = (data.text || "").trim();
      const languageCode = data.language_code || "en";
      const confidence = data.language_probability || 1.0;
      
      console.log(`[ElevenLabsSTT] Raw STT Result -> Lang: ${languageCode} | Conf: ${confidence} | Text: "${text}"`);
      
      return { text, languageCode, confidence };
    } catch (err: any) {
      if (attempt <= 2 && err.name !== "AbortError") {
        console.warn(`[ElevenLabsSTT] Transient error: ${err.message || err}. Retrying in 1000ms (attempt ${attempt}/2)...`);
        await new Promise(r => setTimeout(r, 1000));
        return this.transcribe(wavBuffer, attempt + 1);
      }
      throw err;
    }
  }
}
