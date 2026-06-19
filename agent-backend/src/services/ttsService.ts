import { TTSProvider } from "./providersConfig.js";
import { ElevenLabsTTS } from "./providers/elevenLabsTTS.js";
import { OpenAITTS } from "./providers/openAiTTS.js";
import { ITTSService } from "./interfaces.js";
import { config } from "../config.js";
import { recordTts, logLatency } from "./latencyTracker.js";

// --- Provider management ---

const providers = new Map<TTSProvider, ITTSService>();

function getTTSProvider(): TTSProvider {
  return config.providers.tts === TTSProvider.OPEN_AI ? TTSProvider.OPEN_AI : TTSProvider.ELEVEN_LABS;
}

export function getTTSService(): ITTSService {
  const provider = getTTSProvider();
  let service = providers.get(provider);
  if (!service) {
    service = provider === TTSProvider.OPEN_AI ? new OpenAITTS() : new ElevenLabsTTS();
    providers.set(provider, service);
  }
  return service;
}

export async function synthesizeStream(
  text: string,
  languageCode: string,
  onChunk: (base64Chunk: string, isDone: boolean) => void,
  sessionId = "default"
): Promise<void> {
  const provider = getTTSProvider();
  try {
    await getTTSService().synthesizeStream(text, languageCode, onChunk, sessionId);
  } catch (err) {
    console.error(`[TTS] Primary provider (${provider}) failed:`, err);
    const fallbackProvider = provider === TTSProvider.OPEN_AI ? TTSProvider.ELEVEN_LABS : TTSProvider.OPEN_AI;
    console.log(`[TTS] Attempting fallback to: ${fallbackProvider}`);
    try {
      let service = providers.get(fallbackProvider);
      if (!service) {
        service = fallbackProvider === TTSProvider.OPEN_AI ? new OpenAITTS() : new ElevenLabsTTS();
        providers.set(fallbackProvider, service);
      }
      await service.synthesizeStream(text, languageCode, onChunk, sessionId);
      console.log(`[TTS] Fallback to ${fallbackProvider} succeeded.`);
    } catch (fallbackErr) {
      console.error(`[TTS] Fallback provider (${fallbackProvider}) also failed:`, fallbackErr);
      throw fallbackErr;
    }
  }
}

export function interruptActiveTTS(sessionId = "default"): void {
  return getTTSService().interruptActiveTTS(sessionId);
}

export function cleanupSession(sessionId: string): void {
  for (const provider of providers.values()) {
    provider.cleanupSession(sessionId);
  }
}

// --- LLM text streaming → TTS ---
//
// Text chunks from the LLM arrive token by token. Two internal queues:
//   1. Buffer (string): accumulates tokens until a sentence boundary is found
//   2. Sentence queue: complete sentences waiting to be synthesized, one at a time
//
// The pipeline calls openStream() once, then pushes chunks as they arrive.
// finish() flushes the remaining buffer and starts draining.

const ABBREVIATIONS = new Set(["mr.", "mrs.", "dr.", "ms.", "vs.", "eg.", "ie.", "etc.", "approx.", "no."]);

const activeStreams = new Map<string, SessionStream>();

class SessionStream {
  private buffer = "";
  private scanPosition = 0;
  private sentenceQueue: Array<{ text: string; isLast: boolean; addedAt: number }> = [];
  private processing = false;
  private allPushed = false;
  private firstChunkReceived = false;
  private interrupted = false;
  private readonly ttsStart = Date.now();
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly sessionId: string,
    private readonly lang: string,
    private readonly onAudio: (base64: string, isDone: boolean) => void,
    private readonly onReady: (text: string) => void,
    private readonly onStop: () => void
  ) {}

  push(chunk: string): void {
    if (this.interrupted) return;
    if (!activeStreams.has(this.sessionId)) activeStreams.set(this.sessionId, this);
    this.buffer += chunk;
    this.extractSentences();
    this.processQueue();
  }

  private clearFlushTimer(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }

  finish(): void {
    this.clearFlushTimer();
    this.allPushed = true;
    const remaining = this.buffer.trim();
    if (remaining) {
      this.sentenceQueue.push({ text: remaining, isLast: true, addedAt: Date.now() });
      this.buffer = "";
    } else if (this.sentenceQueue.length > 0) {
      this.sentenceQueue[this.sentenceQueue.length - 1].isLast = true;
    }
    this.processQueue();
    const self = this;
    setTimeout(() => { if (activeStreams.get(this.sessionId) === self) activeStreams.delete(this.sessionId); }, 15000);
  }

  interrupt(): void {
    this.interrupted = true;
    this.sentenceQueue = [];
    this.buffer = "";
    this.clearFlushTimer();
    this.onStop();
    activeStreams.delete(this.sessionId);
  }

  // Drains buffer into complete sentences and appends them to sentenceQueue.
  private extractSentences(): void {
    while (true) {
      const remaining = this.buffer.substring(this.scanPosition);
      const match = remaining.match(/[.!?]\s+/);
      if (!match || match.index === undefined) {
        this.scanPosition = Math.max(0, this.buffer.length - 2);
        break;
      }

      const matchIdx = this.scanPosition + match.index;
      const sentence = this.buffer.substring(0, matchIdx + 1).trim();

      const lastWord = sentence.split(/\s+/).pop()?.toLowerCase() ?? "";
      if (ABBREVIATIONS.has(lastWord)) {
        this.scanPosition = matchIdx + match[0].length;
        continue;
      }

      this.sentenceQueue.push({ text: sentence, isLast: false, addedAt: Date.now() });
      this.buffer = this.buffer.substring(matchIdx + match[0].length);
      this.scanPosition = 0;
    }
  }

  // Ensures at most one drainQueue() runs at a time.
  private processQueue(): void {
    if (this.processing) return;
    this.processing = true;
    this.drainQueue()
      .catch(err => console.error("[TTS] Queue drain error:", err))
      .finally(() => { this.processing = false; });
  }

  // Synthesizes sentences sequentially. Holds the last sentence until allPushed
  // so we know whether to mark it isLast before sending to the provider.
  private async drainQueue(): Promise<void> {
    while (this.sentenceQueue.length > 0) {
      if (this.interrupted) { this.sentenceQueue = []; this.clearFlushTimer(); break; }
      
      if (!this.allPushed && this.sentenceQueue.length === 1) {
        const elapsed = Date.now() - this.sentenceQueue[0].addedAt;
        if (elapsed < 1500) {
          if (!this.flushTimer) {
            this.flushTimer = setTimeout(() => {
              this.flushTimer = null;
              this.processQueue();
            }, 1500 - elapsed);
          }
          break;
        }
      }

      const item = this.sentenceQueue.shift()!;
      this.clearFlushTimer();
      await this.synthesize(item.text, item.isLast);
    }

    if (this.allPushed && this.sentenceQueue.length === 0 && !this.firstChunkReceived) {
      this.onReady("");
      this.onAudio("", true);
    }
  }

  private synthesize(text: string, isLast: boolean): Promise<void> {
    return new Promise<void>((resolve) => {
      synthesizeStream(text, this.lang, (base64Chunk, chunkDone) => {
        if (!this.firstChunkReceived) {
          this.firstChunkReceived = true;
          recordTts(Date.now() - this.ttsStart);
          logLatency();
          this.onReady(text);
        }
        if (!this.interrupted) {
          this.onAudio(base64Chunk, isLast && chunkDone);
        }
        if (chunkDone || this.interrupted) resolve();
      }).catch(err => {
        console.error("[TTS] Synthesis failed for:", text, err);
        if (isLast && !this.interrupted) {
          this.onAudio("", true);
        }
        resolve();
      });
    });
  }
}

export function openStream(
  sessionId: string,
  lang: string,
  onAudio: (base64: string, isDone: boolean) => void,
  onReady: (text: string) => void,
  onStop: () => void
): SessionStream {
  return new SessionStream(sessionId, lang, onAudio, onReady, onStop);
}


