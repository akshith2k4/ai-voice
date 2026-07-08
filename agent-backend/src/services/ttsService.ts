import { TTSProvider } from "./providersConfig.js";
import { ElevenLabsTTS } from "./providers/elevenLabsTTS.js";
import { OpenAITTS } from "./providers/openAiTTS.js";
import { ITTSService } from "./interfaces.js";
import { config } from "../config.js";
import { recordTts, logLatency, recordTtsUsage } from "./latencyTracker.js";

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
  const activeProvider = getTTSProvider();
  const modelId = activeProvider === 'OPEN_AI' ? 'tts-1' : (process.env.ELEVENLABS_TTS_MODEL || 'eleven_v3');
  
  let hasCounted = false;
  const wrappedOnChunk = (base64Chunk: string, isDone: boolean) => {
    // Record usage ONLY when we actually receive audio data (proves API accepted it)
    if (!hasCounted && base64Chunk) {
      hasCounted = true;
      recordTtsUsage(text.length, modelId);
    }
    onChunk(base64Chunk, isDone);
  };

  try {
    await getTTSService().synthesizeStream(text, languageCode, wrappedOnChunk, sessionId);
  } catch (err) {
    console.error(`[TTS] Primary provider (${activeProvider}) failed:`, err);
    if (hasCounted) {
      // Primary provider started streaming audio before failing, do not fallback
      throw err; 
    }
    
    // If we reach here, primary failed BEFORE sending any audio. We haven't counted chars yet.
    const fallbackProvider = activeProvider === TTSProvider.OPEN_AI ? TTSProvider.ELEVEN_LABS : TTSProvider.OPEN_AI;
    console.log(`[TTS] Attempting fallback to: ${fallbackProvider}`);
    
    try {
      let service = providers.get(fallbackProvider);
      if (!service) {
        service = fallbackProvider === TTSProvider.OPEN_AI ? new OpenAITTS() : new ElevenLabsTTS();
        providers.set(fallbackProvider, service);
      }
      
      const fallbackModelId = fallbackProvider === 'OPEN_AI' ? 'tts-1' : (process.env.ELEVENLABS_TTS_MODEL || 'eleven_v3');
      let fallbackHasCounted = false;
      
      await service.synthesizeStream(text, languageCode, (chunk, done) => {
        if (!fallbackHasCounted && chunk) {
          fallbackHasCounted = true;
          recordTtsUsage(text.length, fallbackModelId);
        }
        onChunk(chunk, done);
      }, sessionId);
      
      console.log(`[TTS] Fallback to ${fallbackProvider} succeeded.`);
    } catch (fallbackErr) {
      console.error(`[TTS] Fallback provider (${fallbackProvider}) also failed:`, fallbackErr);
      // NEITHER provider counted chars, so 0 chars will be recorded. This is accurate for billing.
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
    
    // FIX: Log latency on interrupt so we capture whatever metrics we have up to the barge-in point
    logLatency("tts-interrupted"); 
    
    if (activeStreams.get(this.sessionId) === this) {
      activeStreams.delete(this.sessionId);
    }
  }

  private extractSentences(): void {
    let searchStart = 0;
    while (true) {
      const remaining = this.buffer.substring(searchStart);
      const match = remaining.match(/[.!?]\s+/);
      if (!match || match.index === undefined) {
        break;
      }

      const matchIdx = searchStart + match.index;
      const sentence = this.buffer.substring(0, matchIdx + 1).trim();

      const lastWord = sentence.split(/\s+/).pop()?.toLowerCase() ?? "";
      if (ABBREVIATIONS.has(lastWord)) {
        searchStart = matchIdx + match[0].length;
        continue;
      }

      this.sentenceQueue.push({ text: sentence, isLast: false, addedAt: Date.now() });
      this.buffer = this.buffer.substring(matchIdx + match[0].length);
      searchStart = 0;
    }
  }

  private processQueue(): void {
    if (this.processing) return;
    this.processing = true;
    this.drainQueue()
      .catch(err => console.error("[TTS] Queue drain error:", err))
      .finally(() => { this.processing = false; });
  }

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
          return;
        }
      }

      const item = this.sentenceQueue.shift()!;
      this.clearFlushTimer();
      await this.synthesize(item.text, item.isLast);
    }

    if (this.allPushed && this.sentenceQueue.length === 0) {
      if (!this.firstChunkReceived) {
        this.onReady("");
        this.onAudio("", true);
      }
      // FIX: Log latency ONLY after the entire stream is finished to ensure all TTS chars and LLM tokens are recorded!
      logLatency("tts-stream-complete");
    }
  }

  private synthesize(text: string, isLast: boolean): Promise<void> {
    return new Promise<void>((resolve) => {
      synthesizeStream(text, this.lang, (base64Chunk, chunkDone) => {
        if (!this.firstChunkReceived) {
          this.firstChunkReceived = true;
          recordTts(Date.now() - this.ttsStart);
          // FIX: Removed logLatency() from here. It was causing the DB to save early with incomplete data.
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


