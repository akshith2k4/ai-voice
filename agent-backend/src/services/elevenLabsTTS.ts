import dotenv from "dotenv";
dotenv.config();

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || "";
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "YoPh8Er6cOk7bwEreyKu";
const ELEVENLABS_TTS_MODEL = process.env.ELEVENLABS_TTS_MODEL || "eleven_flash_v2_5";

interface TTSJob {
  text: string;
  languageCode: string;
  onChunk: (base64Chunk: string, isDone: boolean) => void;
  resolve: () => void;
  reject: (err: any) => void;
  interrupted?: boolean;
}

const ttsQueue: TTSJob[] = [];
let ttsBusy = false;
let activeJob: TTSJob | null = null;

export function interruptActiveTTS() {
  ttsQueue.length = 0;
  if (activeJob) {
    console.log("[ElevenLabs TTS] Interrupting active job (detaching stream fetch to background).");
    activeJob.interrupted = true;
  }
}

async function processQueue() {
  if (ttsBusy) return;
  ttsBusy = true;

  while (ttsQueue.length > 0) {
    const job = ttsQueue.shift()!;
    activeJob = job;

    const promise = synthesizeStreamDirect(job.text, job.languageCode, job.onChunk);

    await new Promise<void>((resolveJob) => {
      let resolved = false;

      const interval = setInterval(() => {
        if (job.interrupted && !resolved) {
          resolved = true;
          clearInterval(interval);
          resolveJob();
        }
      }, 50);

      promise.then(() => {
        if (!resolved) {
          resolved = true;
          clearInterval(interval);
          resolveJob();
        }
      }).catch((err) => {
        if (!resolved) {
          resolved = true;
          clearInterval(interval);
          job.reject(err);
          resolveJob();
        } else {
          console.log("[ElevenLabs TTS] Background detached fetch finished with error after interruption:", err.message || err);
        }
      });
    });

    activeJob = null;
    job.resolve();
  }

  ttsBusy = false;
}

let activeAbortController: AbortController | null = null;

/**
 * Aborts any currently active ElevenLabs TTS fetch request and clears the queue.
 */
export function abortActiveTTS() {
  ttsQueue.length = 0;
  if (activeAbortController) {
    console.log("[ElevenLabs TTS] Aborting active in-flight ElevenLabs synthesis request.");
    activeAbortController.abort();
    activeAbortController = null;
  }
}

async function synthesizeStreamDirect(
  text: string,
  languageCode: string,
  onChunk: (base64Chunk: string, isDone: boolean) => void,
  attempt = 1
): Promise<void> {
  if (!ELEVENLABS_API_KEY) {
    throw new Error("ELEVENLABS_API_KEY not configured");
  }
  if (!text.trim()) {
    throw new Error("Empty text for TTS");
  }

  const voiceId = ELEVENLABS_VOICE_ID;

  activeAbortController = new AbortController();
  const signal = activeAbortController.signal;

  try {
    // Use mp3_44100_128 to get high quality MP3 stream directly.
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?optimize_streaming_latency=3&output_format=mp3_44100_128`, {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: ELEVENLABS_TTS_MODEL,
        voice_settings: { stability: 0.5, similarity_boost: 0.8 },
      }),
      signal,
    });

    if (res.status === 429 && attempt <= 2) {
      console.warn(
        `[ElevenLabs TTS] Rate limit (429) encountered. Retrying in 1000ms (attempt ${attempt}/2)...`
      );
      await new Promise((r) => setTimeout(r, 1000));
      if (signal.aborted) {
        throw new DOMException("The user aborted a request.", "AbortError");
      }
      return synthesizeStreamDirect(text, languageCode, onChunk, attempt + 1);
    }

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      throw new Error(`ElevenLabs TTS failed ${res.status}: ${errorText}`);
    }

    if (!res.body) {
      throw new Error("Response body is null");
    }

    const reader = res.body.getReader();
    let lastChunk: Uint8Array | null = null;

    while (true) {
      if (signal.aborted) {
        throw new DOMException("The user aborted a request.", "AbortError");
      }

      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      if (value && value.length > 0) {
        if (lastChunk) {
          onChunk(Buffer.from(lastChunk).toString("base64"), false);
        }
        lastChunk = value;
      }
    }

    // Emit final chunk
    if (lastChunk) {
      onChunk(Buffer.from(lastChunk).toString("base64"), true);
    } else {
      onChunk("", true);
    }
  } finally {
    if (activeAbortController?.signal === signal) {
      activeAbortController = null;
    }
  }
}

export function synthesizeStream(
  text: string,
  languageCode: string,
  onChunk: (base64Chunk: string, isDone: boolean) => void
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    ttsQueue.push({ text, languageCode, onChunk, resolve, reject });
    processQueue();
  });
}

export async function synthesize(text: string, languageCode: string): Promise<string> {
  const chunks: Uint8Array[] = [];
  await synthesizeStream(text, languageCode, (base64Chunk, isDone) => {
    if (base64Chunk) {
      const buffer = Buffer.from(base64Chunk, "base64");
      chunks.push(buffer);
    }
  });

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }

  const base64 = Buffer.from(combined).toString("base64");
  return `data:audio/mpeg;base64,${base64}`;
}
