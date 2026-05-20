const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || "";
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "JBFqnCBsd6RMkjVDRZzb";

// TTS Queue to ensure exactly 1 request runs at a time (preventing 429 concurrent limits)
interface TTSJob {
  text: string;
  languageCode: string;
  resolve: (val: string) => void;
  reject: (err: any) => void;
}

const ttsQueue: TTSJob[] = [];
let ttsBusy = false;

async function processQueue() {
  if (ttsBusy) return;
  ttsBusy = true;

  while (ttsQueue.length > 0) {
    const job = ttsQueue.shift()!;
    try {
      const result = await synthesizeDirect(job.text, job.languageCode);
      job.resolve(result);
    } catch (err) {
      job.reject(err);
    }
    // Small gap between requests to prevent rapid succession rate limits
    await new Promise((r) => setTimeout(r, 300));
  }

  ttsBusy = false;
}

// Actual fetch API call with 429 retry support
async function synthesizeDirect(
  text: string,
  languageCode: string,
  attempt = 1
): Promise<string> {
  if (!ELEVENLABS_API_KEY) {
    throw new Error("ELEVENLABS_API_KEY not configured");
  }
  if (!text.trim()) {
    throw new Error("Empty text for TTS");
  }

  const voiceId = ELEVENLABS_VOICE_ID;

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
      "Accept": "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.5, similarity_boost: 0.8 },
    }),
  });

  // If rate limited or concurrency limit reached, retry with delay
  if (res.status === 429 && attempt <= 2) {
    console.warn(
      `[TTS] Rate limit (429) encountered. Retrying in 1000ms (attempt ${attempt}/2)...`
    );
    await new Promise((r) => setTimeout(r, 1000));
    return synthesizeDirect(text, languageCode, attempt + 1);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`TTS failed ${res.status}: ${text}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  return `data:audio/mpeg;base64,${base64}`;
}

export function synthesize(text: string, languageCode: string): Promise<string> {
  return new Promise((resolve, reject) => {
    ttsQueue.push({ text, languageCode, resolve, reject });
    processQueue();
  });
}
