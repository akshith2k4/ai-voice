const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || "";
const STT_MODEL = process.env.ELEVENLABS_STT_MODEL || "scribe_v1";

export interface SttResult {
  text: string;
  languageCode: string;
  confidence: number;
}

export async function transcribe(base64Audio: string): Promise<SttResult> {
  if (!ELEVENLABS_API_KEY) {
    throw new Error("ELEVENLABS_API_KEY not configured");
  }
  if (!base64Audio || base64Audio.length < 100) {
    throw new Error("Empty audio");
  }

  const audioBuffer = Buffer.from(base64Audio, "base64");
  const form = new FormData();
  form.append("model_id", STT_MODEL);
  form.append("file", new Blob([audioBuffer], { type: "audio/webm" }), "audio.webm");

  const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: { "xi-api-key": ELEVENLABS_API_KEY },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`STT failed ${res.status}: ${text}`);
  }

  const data = await res.json() as {
    text?: string;
    language_code?: string;
    language_probability?: number;
  };

  const text = (data.text || "").trim();
  const languageCode = data.language_code || "en";
  const confidence = data.language_probability ?? 0.9;

  return { text, languageCode, confidence };
}
