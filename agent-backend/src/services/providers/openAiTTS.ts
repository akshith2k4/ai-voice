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

export class OpenAITTS implements ITTSService {
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
        console.log(`[OpenAI TTS] [Session: ${sessionId}] Interrupting active job (detaching stream fetch to background).`);
        state.activeJob.interrupted = true;
      }
      if (state.abortController) {
        console.log(`[OpenAI TTS] [Session: ${sessionId}] Aborting active in-flight OpenAI synthesis request.`);
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
            console.log(`[OpenAI TTS] [Session: ${sessionId}] Background detached fetch finished with error after interruption:`, err.message || err);
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
    const { apiKey: OPENAI_API_KEY, ttsModel: OPENAI_TTS_MODEL, ttsVoice: OPENAI_TTS_VOICE } = config.openai;

    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY not configured");
    }
    if (!text.trim()) {
      throw new Error("Empty text for TTS");
    }

    const state = this.getSessionState(sessionId);
    const controller = new AbortController();
    state.abortController = controller;
    const signal = controller.signal;

    try {
      const res = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: OPENAI_TTS_MODEL,
          input: text,
          voice: OPENAI_TTS_VOICE,
          response_format: "mp3",
        }),
        signal,
      });

      if (res.status === 429 && attempt <= 2) {
        console.warn(
          `[OpenAI TTS] [Session: ${sessionId}] Rate limit (429) encountered. Retrying in 1000ms (attempt ${attempt}/2)...`
        );
        await new Promise((r) => setTimeout(r, 1000));
        if (signal.aborted) {
          throw new DOMException("The user aborted a request.", "AbortError");
        }
        return this.synthesizeStreamDirect(text, languageCode, onChunk, sessionId, attempt + 1);
      }

      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        throw new Error(`OpenAI TTS failed ${res.status}: ${errorText}`);
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
    console.log(`[OpenAI TTS] [Session: ${sessionId}] TTS session state cleaned up.`);
  }
}
