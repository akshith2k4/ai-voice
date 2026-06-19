import { ITTSService } from "../interfaces.js";
import { config } from "../../config.js";

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

export class ElevenLabsTTS implements ITTSService {
  private sessionStates = new Map<string, SessionTTSState>();

  constructor() {}

  private getSessionState(sessionId = "default"): SessionTTSState {
    let state = this.sessionStates.get(sessionId);
    if (!state) {
      state = {
        queue: [],
        busy: false,
        activeJob: null,
        abortController: null,
      };
      this.sessionStates.set(sessionId, state);
    }
    return state;
  }

  interruptActiveTTS(sessionId = "default"): void {
    const state = this.sessionStates.get(sessionId);
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

  private async processQueue(sessionId = "default") {
    const state = this.getSessionState(sessionId);
    if (state.busy) return;
    state.busy = true;

    while (state.queue.length > 0) {
      const job = state.queue.shift()!;
      state.activeJob = job;

      const promise = this.synthesizeStreamDirect(job.text, job.languageCode, job.onChunk, sessionId);

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
      this.sessionStates.delete(sessionId);
    }
  }

  private async synthesizeStreamDirect(
    text: string,
    languageCode: string,
    onChunk: (base64Chunk: string, isDone: boolean) => void,
    sessionId: string = "default",
    attempt = 1
  ): Promise<void> {
    const {
      apiKey: ELEVENLABS_API_KEY,
      voiceId: ELEVENLABS_VOICE_ID,
      voiceIdEn: ELEVENLABS_VOICE_ID_EN,
      voiceIdHi: ELEVENLABS_VOICE_ID_HI,
      ttsModel: ELEVENLABS_TTS_MODEL
    } = config.elevenlabs;

    if (!ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY not configured");
    }
    if (!text.trim()) {
      throw new Error("Empty text for TTS");
    }

    let voiceId = ELEVENLABS_VOICE_ID;
    if (languageCode === "hi" && ELEVENLABS_VOICE_ID_HI) {
      voiceId = ELEVENLABS_VOICE_ID_HI;
    } else if (ELEVENLABS_VOICE_ID_EN) {
      voiceId = ELEVENLABS_VOICE_ID_EN;
    }
    const state = this.getSessionState(sessionId);
    const controller = new AbortController();
    state.abortController = controller;
    const signal = controller.signal;

    try {
      const latencyParam = ELEVENLABS_TTS_MODEL === "eleven_v3" ? "" : "optimize_streaming_latency=3&";
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?${latencyParam}output_format=mp3_44100_128`, {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: ELEVENLABS_TTS_MODEL,
          voice_settings: { stability: 0.5, use_speaker_boost: true, similarity_boost: 0.75, style: 0, speed: 1 },
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
        return this.synthesizeStreamDirect(text, languageCode, onChunk, sessionId, attempt + 1);
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

  synthesizeStream(
    text: string,
    languageCode: string,
    onChunk: (base64Chunk: string, isDone: boolean) => void,
    sessionId: string = "default"
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const state = this.getSessionState(sessionId);
      state.queue.push({ text, languageCode, onChunk, resolve, reject });
      this.processQueue(sessionId);
    });
  }

  cleanupSession(sessionId: string): void {
    const state = this.sessionStates.get(sessionId);
    if (!state) return;

    if (state.abortController) {
      state.abortController.abort();
      state.abortController = null;
    }

    state.queue.length = 0;
    this.sessionStates.delete(sessionId);
    console.log(`[ElevenLabs TTS] [Session: ${sessionId}] TTS session state cleaned up.`);
  }
}
