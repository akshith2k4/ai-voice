import { ISTTService, SttResult } from "../interfaces.js";
import { config } from "../../config.js";

export class OpenAISTT implements ISTTService {
  async transcribe(wavBuffer: Buffer, attempt = 1): Promise<SttResult> {
    const apiKey = config.openai.apiKey;
    if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

    const form = new FormData();
    form.append("model", "whisper-1");
    form.append("response_format", "verbose_json");
    form.append("file", new Blob([new Uint8Array(wavBuffer)], { type: "audio/wav" }), "audio.wav");

    try {
      const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}` },
        body: form,
        signal: AbortSignal.timeout(10000),
      });

      if ((res.status === 429 || res.status >= 500) && attempt <= 2) {
        console.warn(`[OpenAISTT] Transient status ${res.status}. Retrying in 1000ms (attempt ${attempt}/2)...`);
        await new Promise(r => setTimeout(r, 1000));
        return this.transcribe(wavBuffer, attempt + 1);
      }

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`OpenAI Whisper STT failed ${res.status}: ${text}`);
      }

      const data = await res.json() as { text?: string; language?: string };
      const text = (data.text || "").trim();
      console.log(`[OpenAISTT] Transcribed: "${text}"`);

      let languageCode = "en";
      if (data.language) {
        const lower = data.language.toLowerCase();
        if (lower === "hindi" || lower === "hi") {
          languageCode = "hi";
        }
      }
      return { text, languageCode, confidence: 1.0 };
    } catch (err: any) {
      if (attempt <= 2 && err.name !== "AbortError") {
        console.warn(`[OpenAISTT] Transient error: ${err.message || err}. Retrying in 1000ms (attempt ${attempt}/2)...`);
        await new Promise(r => setTimeout(r, 1000));
        return this.transcribe(wavBuffer, attempt + 1);
      }
      throw err;
    }
  }
}
