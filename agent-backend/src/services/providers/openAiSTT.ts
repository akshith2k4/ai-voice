import { ISTTService, SttResult } from "../interfaces.js";
import { config } from "../../config.js";

export class OpenAISTT implements ISTTService {
  async transcribe(wavBuffer: Buffer): Promise<SttResult> {
    const apiKey = config.openai.apiKey;
    if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

    const form = new FormData();
    form.append("model", "whisper-1");
    form.append("language", "en"); // pin to English — prevents mis-detection as Hindi for accented speech
    form.append("file", new Blob([new Uint8Array(wavBuffer)], { type: "audio/wav" }), "audio.wav");

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}` },
      body: form,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`OpenAI Whisper STT failed ${res.status}: ${text}`);
    }

    const data = await res.json() as { text?: string; language?: string };
    const text = (data.text || "").trim();
    console.log(`[OpenAISTT] Transcribed: "${text}"`);
    return { text, languageCode: data.language || "en", confidence: 1.0 };
  }
}
