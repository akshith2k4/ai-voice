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

interface SessionTTSState {
  queue: TTSJob[];
  busy: boolean;
  activeJob: TTSJob | null;
  abortController: AbortController | null;
}

const sessionStates = new Map<string, SessionTTSState>();

function getSessionState(sessionId: string = "default"): SessionTTSState {
  let state = sessionStates.get(sessionId);
  if (!state) {
    state = {
      queue: [],
      busy: false,
      activeJob: null,
      abortController: null,
    };
    sessionStates.set(sessionId, state);
  }
  return state;
}

export function interruptActiveTTS(sessionId: string = "default") {
  const state = sessionStates.get(sessionId);
  if (state) {
    state.queue.length = 0;
    if (state.activeJob) {
      console.log(`[ElevenLabs TTS] [Session: ${sessionId}] Interrupting active job (detaching stream fetch to background).`);
      state.activeJob.interrupted = true;
    }
    if (state.abortController) {
      console.log(`[ElevenLabs TTS] [Session: ${sessionId}] Aborting active in-flight ElevenLabs synthesis request.`);
      state.abortController.abort();
      state.abortController = null;
    }
  }
}



async function processQueue(sessionId: string = "default") {
  const state = getSessionState(sessionId);
  if (state.busy) return;
  state.busy = true;

  while (state.queue.length > 0) {
    const job = state.queue.shift()!;
    state.activeJob = job;

    const promise = synthesizeStreamDirect(job.text, job.languageCode, job.onChunk, sessionId);

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
          console.log(`[ElevenLabs TTS] [Session: ${sessionId}] Background detached fetch finished with error after interruption:`, err.message || err);
        }
      });
    });

    state.activeJob = null;
    job.resolve();
  }

  state.busy = false;

  if (state.queue.length === 0 && !state.activeJob && !state.abortController) {
    sessionStates.delete(sessionId);
  }
}

async function synthesizeStreamDirect(
  text: string,
  languageCode: string,
  onChunk: (base64Chunk: string, isDone: boolean) => void,
  sessionId: string = "default",
  attempt = 1
): Promise<void> {
  if (!ELEVENLABS_API_KEY) {
    throw new Error("ELEVENLABS_API_KEY not configured");
  }
  if (!text.trim()) {
    throw new Error("Empty text for TTS");
  }

  const voiceId = ELEVENLABS_VOICE_ID;
  const state = getSessionState(sessionId);
  const controller = new AbortController();
  state.abortController = controller;
  const signal = controller.signal;

  try {
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
        `[ElevenLabs TTS] [Session: ${sessionId}] Rate limit (429) encountered. Retrying in 1000ms (attempt ${attempt}/2)...`
      );
      await new Promise((r) => setTimeout(r, 1000));
      if (signal.aborted) {
        throw new DOMException("The user aborted a request.", "AbortError");
      }
      return synthesizeStreamDirect(text, languageCode, onChunk, sessionId, attempt + 1);
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

    if (lastChunk) {
      onChunk(Buffer.from(lastChunk).toString("base64"), true);
    } else {
      onChunk("", true);
    }
  } finally {
    if (state.abortController === controller) {
      state.abortController = null;
    }
  }
}

export function synthesizeStream(
  text: string,
  languageCode: string,
  onChunk: (base64Chunk: string, isDone: boolean) => void,
  sessionId: string = "default"
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const state = getSessionState(sessionId);
    state.queue.push({ text, languageCode, onChunk, resolve, reject });
    processQueue(sessionId);
  });
}

/*
export async function synthesize(text: string, languageCode: string, sessionId: string = "default"): Promise<string> {
  const chunks: Uint8Array[] = [];
  await synthesizeStream(text, languageCode, (base64Chunk, isDone) => {
    if (base64Chunk) {
      const buffer = Buffer.from(base64Chunk, "base64");
      chunks.push(buffer);
    }
  }, sessionId);

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
*/

export function cleanupSession(sessionId: string) {
  const state = sessionStates.get(sessionId);
  if (!state) return;

  if (state.abortController) {
    state.abortController.abort();
    state.abortController = null;
  }

  state.queue.length = 0;
  sessionStates.delete(sessionId);
  console.log(`[ElevenLabs TTS] [Session: ${sessionId}] TTS session state cleaned up.`);
}
