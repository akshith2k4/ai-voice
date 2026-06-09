import { STTProvider } from "./providersConfig.js";
import { ElevenLabsSTT } from "./providers/elevenLabsSTT.js";
import { OpenAISTT } from "./providers/openAiSTT.js";
import { ISTTService, SttResult } from "./interfaces.js";

const MAX_EMPTY_RETRIES = 2;
const retryCounts = new Map<string, number>();

// Singleton instances for providers to preserve session state (WS buffering chunks)
const providers = new Map<STTProvider, ISTTService>();

function getSTTProvider(): STTProvider {
  const envVal = process.env.STT_PROVIDER;
  if (envVal === STTProvider.OPEN_AI) {
    return STTProvider.OPEN_AI;
  }
  return STTProvider.ELEVEN_LABS;
}

export function getSTTService(): ISTTService {
  const provider = getSTTProvider();
  let service = providers.get(provider);
  if (!service) {
    if (provider === STTProvider.OPEN_AI) {
      service = new OpenAISTT();
    } else {
      service = new ElevenLabsSTT();
    }
    // Bind all registered speech callbacks to the new provider
    for (const callback of speechCallbacks) {
      service.onSpeechDetected(callback);
    }
    providers.set(provider, service);
  }
  return service;
}

// Facades to ensure zero breaking changes in voiceHandler/voicePipeline
const speechCallbacks: ((sessionId: string) => void)[] = [];

export function onSpeechDetected(callback: (sessionId: string) => void) {
  speechCallbacks.push(callback);
  // Also register on any already instantiated provider
  for (const provider of providers.values()) {
    provider.onSpeechDetected(callback);
  }
}

export async function transcribeAudio(audio: string): Promise<SttResult> {
  return getSTTService().transcribe(audio);
}

export async function handleAudioChunk(sessionId: string, base64Chunk: string): Promise<void> {
  return getSTTService().handleAudioChunk(sessionId, base64Chunk);
}

export async function handleAudioEnd(sessionId: string): Promise<SttResult> {
  return getSTTService().handleAudioEnd(sessionId);
}

export function cleanupSession(sessionId: string): void {
  // Clean up session state in ALL instantiated STT providers
  for (const provider of providers.values()) {
    provider.cleanupSession(sessionId);
  }
}

export function getRetryCount(sessionId: string): number {
  return retryCounts.get(sessionId) || 0;
}

export function incrementRetry(sessionId: string): number {
  const count = (retryCounts.get(sessionId) || 0) + 1;
  retryCounts.set(sessionId, count);
  return count;
}

export function resetRetry(sessionId: string): void {
  retryCounts.delete(sessionId);
}

export function getMaxRetries(): number {
  return MAX_EMPTY_RETRIES;
}

export type { SttResult };
