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

    try {
      while (state.queue.length > 0) {
        const job = state.queue.shift();
        if (!job) continue;
        state.activeJob = job;

        try {
          const promise = this.synthesizeStreamDirect(job.text, job.languageCode, job.onChunk, sessionId);

          await new Promise<void>((resolveJob, rejectJob) => {
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
                rejectJob(err);
              } else {
                console.log(`[ElevenLabs TTS] [Session: ${sessionId}] Background detached fetch finished with error after interruption:`, err.message || err);
                resolveJob();
              }
            });
          }).catch(() => {
            // Internal catch to prevent unhandled rejection
          });
        } catch (jobErr) {
          job.reject(jobErr);
        }

        state.activeJob = null;
        job.resolve();
      }
    } catch (queueErr) {
      console.error(`[ElevenLabs TTS] [Session: ${sessionId}] Error in processQueue:`, queueErr);
      if (state.activeJob) {
        state.activeJob.reject(queueErr);
        state.activeJob = null;
      }
      while (state.queue.length > 0) {
        const job = state.queue.shift();
        if (job) job.reject(queueErr);
      }
    } finally {
      state.busy = false;

      if (state.queue.length === 0 && !state.activeJob && !state.abortController) {
        this.sessionStates.delete(sessionId);
      }
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
    if (state.activeJob?.interrupted) {
      throw new DOMException("Aborted before start", "AbortError");
    }
    const controller = new AbortController();
    state.abortController = controller;
    const signal = controller.signal;

    try {
      const latencyParam = ELEVENLABS_TTS_MODEL === "eleven_v3" ? "" : "optimize_streaming_latency=3&";
      let res: Response;
      try {
        res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?${latencyParam}output_format=mp3_44100_128`, {
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
      } catch (fetchErr: any) {
        if (attempt <= 2 && !signal.aborted) {
          console.warn(`[ElevenLabs TTS] [Session: ${sessionId}] Network error: ${fetchErr.message || fetchErr}. Retrying in 1000ms (attempt ${attempt}/2)...`);
          await new Promise((r) => setTimeout(r, 1000));
          return this.synthesizeStreamDirect(text, languageCode, onChunk, sessionId, attempt + 1);
        }
        throw fetchErr;
      }

      if ((res.status === 429 || res.status >= 500) && attempt <= 2) {
        console.warn(
          `[ElevenLabs TTS] [Session: ${sessionId}] Transient status ${res.status} encountered. Retrying in 1000ms (attempt ${attempt}/2)...`
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
      this.processQueue(sessionId).catch((err) => {
        console.error(`[ElevenLabs TTS] processQueue failed:`, err);
        reject(err);
      });
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
