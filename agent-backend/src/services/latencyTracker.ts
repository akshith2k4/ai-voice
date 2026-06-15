import { AsyncLocalStorage } from "node:async_hooks";

export type LatencyTracker = {
  startTime: number;
  sttDuration: number;
  llmDuration: number;
  ttsDuration: number;
};

const storage = new AsyncLocalStorage<LatencyTracker>();

export function startTracking<T>(fn: () => T): T {
  return storage.run(
    { startTime: Date.now(), sttDuration: 0, llmDuration: 0, ttsDuration: 0 },
    fn
  );
}

export function recordStt(ms: number): void {
  const t = storage.getStore();
  if (t) t.sttDuration = ms;
}

export function recordLlm(ms: number): void {
  const t = storage.getStore();
  if (t) t.llmDuration = ms;
}

export function recordTts(ms: number): void {
  const t = storage.getStore();
  if (t) t.ttsDuration = ms;
}

export function logLatency(label?: string): void {
  const t = storage.getStore();
  if (!t) return;
  const prefix = label ? `[Latency] ${label} — ` : "[Latency] ";
  console.log(`${prefix}STT: ${t.sttDuration}ms | LLM: ${t.llmDuration}ms | TTS: ${t.ttsDuration}ms | Total: ${Date.now() - t.startTime}ms`);
}

export function getLatency() {
  const t = storage.getStore();
  if (!t) return undefined;
  return { stt: t.sttDuration, llm: t.llmDuration, tts: t.ttsDuration, total: Date.now() - t.startTime };
}
