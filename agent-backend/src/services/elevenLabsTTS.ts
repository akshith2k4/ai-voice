const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || "";
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "JBFqnCBsd6RMkjVDRZzb";

interface TTSJob {
  text: string;
  languageCode: string;
  onChunk: (chunkBase64: string, isFinal: boolean) => void;
  resolve: () => void;
  reject: (err: any) => void;
}

const ttsQueue: TTSJob[] = [];
let ttsBusy = false;

let currentDelay = 50;
const BASELINE_DELAY = 50;
const BACKOFF_DELAY = 1000;

async function processQueue() {
  if (ttsBusy) return;
  ttsBusy = true;

  while (ttsQueue.length > 0) {
    const job = ttsQueue.shift()!;
    try {
      await synthesizeStreamDirect(job.text, job.languageCode, job.onChunk);
      job.resolve();
      // On success, dynamically scale back down to baseline delay
      if (currentDelay > BASELINE_DELAY) {
        currentDelay = Math.max(BASELINE_DELAY, currentDelay - 250);
      }
    } catch (err) {
      // If error is related to 429, ensure we trigger backoff
      if (err instanceof Error && err.message.includes("429")) {
        currentDelay = BACKOFF_DELAY;
      }
      job.reject(err);
    }
    // Adaptive delay between requests
    await new Promise((r) => setTimeout(r, currentDelay));
  }

  ttsBusy = false;
}

async function synthesizeStreamDirect(
  text: string,
  languageCode: string,
  onChunk: (chunkBase64: string, isFinal: boolean) => void,
  attempt = 1
): Promise<void> {
  if (!ELEVENLABS_API_KEY) {
    throw new Error("ELEVENLABS_API_KEY not configured");
  }
  if (!text.trim()) {
    throw new Error("Empty text for TTS");
  }

  const voiceId = ELEVENLABS_VOICE_ID;

  // Use /stream endpoint
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
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

  // If rate limited or concurrency limit reached, retry with delay and set backoff
  if (res.status === 429 && attempt <= 2) {
    currentDelay = BACKOFF_DELAY;
    console.warn(
      `[TTS] Rate limit (429) encountered. Retrying in 1000ms (attempt ${attempt}/2)...`
    );
    await new Promise((r) => setTimeout(r, 1000));
    return synthesizeStreamDirect(text, languageCode, onChunk, attempt + 1);
  }
  if (res.status === 429) {
    currentDelay = BACKOFF_DELAY;
  }

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(`TTS failed ${res.status}: ${errorText}`);
  }

  if (!res.body) {
    throw new Error("Response body is empty or not readable");
  }

  const reader = res.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        // Send final chunk signal
        onChunk("", true);
        break;
      }
      if (value && value.length > 0) {
        const base64 = Buffer.from(value.buffer, value.byteOffset, value.byteLength).toString("base64");
        onChunk(base64, false);
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export function synthesizeStream(
  text: string,
  languageCode: string,
  onChunk: (chunkBase64: string, isFinal: boolean) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    ttsQueue.push({ text, languageCode, onChunk, resolve, reject });
    processQueue();
  });
}

export function synthesize(text: string, languageCode: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let accumulatedBase64 = "";
    synthesizeStream(text, languageCode, (chunkBase64, isFinal) => {
      if (chunkBase64) {
        accumulatedBase64 += chunkBase64;
      }
      if (isFinal) {
        resolve(`data:audio/mpeg;base64,${accumulatedBase64}`);
      }
    }).catch(reject);
  });
}
