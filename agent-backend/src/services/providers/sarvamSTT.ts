import { ISTTService, SttResult } from "../interfaces.js";
import { config } from "../../config.js";

export class SarvamSTT implements ISTTService {
  async transcribe(wavBuffer: Buffer, attempt = 1): Promise<SttResult> {
    const apiKey = config.sarvam.apiKey;
    if (!apiKey) throw new Error("SARVAM_API_KEY not configured");

    const form = new FormData();
    form.append("model", config.sarvam.sttModel);
    form.append("language_code", "unknown");
    form.append("file", new Blob([new Uint8Array(wavBuffer)], { type: "audio/wav" }), "audio.wav");

    try {
      const res = await fetch("https://api.sarvam.ai/speech-to-text", {
        method: "POST",
        headers: { 
          "api-subscription-key": apiKey 
        },
        body: form,
        signal: AbortSignal.timeout(10000),
      });

      if ((res.status === 429 || res.status >= 500) && attempt <= 2) {
        console.warn(`[SarvamSTT] Transient status ${res.status}. Retrying in 1000ms (attempt ${attempt}/2)...`);
        await new Promise(r => setTimeout(r, 1000));
        return this.transcribe(wavBuffer, attempt + 1);
      }

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Sarvam STT failed ${res.status}: ${text}`);
      }

      const data = await res.json() as { 
        transcript?: string; 
        language_code?: string; 
      };
      
      const text = (data.transcript || "").trim();
      let languageCode = "en";
      if (data.language_code) {
        const lower = data.language_code.toLowerCase();
        if (lower.startsWith("hi")) {
          languageCode = "hi";
        }
      }
      
      console.log(`[SarvamSTT] Raw STT Result -> Lang: ${data.language_code || "unknown"} | Mapped Lang: ${languageCode} | Text: "${text}"`);
      
      return { text, languageCode, confidence: 1.0 };
    } catch (err: any) {
      if (attempt <= 2 && err.name !== "AbortError") {
        console.warn(`[SarvamSTT] Transient error: ${err.message || err}. Retrying in 1000ms (attempt ${attempt}/2)...`);
        await new Promise(r => setTimeout(r, 1000));
        return this.transcribe(wavBuffer, attempt + 1);
      }
      throw err;
    }
  }
}
