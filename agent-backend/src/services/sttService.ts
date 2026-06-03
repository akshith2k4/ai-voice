import { transcribe, handleAudioChunk, handleAudioEnd, onSpeechDetected, type SttResult } from "./sarvamSTT.js";

const MAX_EMPTY_RETRIES = 2;
const retryCounts = new Map<string, number>();

export async function transcribeAudio(audio: string): Promise<SttResult> {
  return transcribe(audio);
}

export { handleAudioChunk, handleAudioEnd, onSpeechDetected };

export function getRetryCount(sessionId: string): number {
  return retryCounts.get(sessionId) || 0;
}

export function incrementRetry(sessionId: string): number {
  const count = (retryCounts.get(sessionId) || 0) + 1;
  retryCounts.set(sessionId, count);
  return count;
}

export function resetRetry(sessionId: string): void {
  retryCounts.set(sessionId, 0);
}

export function getMaxRetries(): number {
  return MAX_EMPTY_RETRIES;
}

export type { SttResult };
