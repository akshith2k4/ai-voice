import { AsyncLocalStorage } from "node:async_hooks";
import { db, turns } from "./db.js";
import { eq } from "drizzle-orm";
import { fireAndForget } from "./observability.js";

export type LatencyTracker = {
  startTime: number;
  sttDuration: number;
  llmDuration: number;
  ttsDuration: number;
  sessionId: string | null;
  turnId: string | null;
  userName: string | null;
};

const storage = new AsyncLocalStorage<LatencyTracker>();

export function startTracking<T>(
  sessionId: string | null | undefined,
  userNameOrFn: string | null | undefined | (() => T),
  fn?: () => T
): T {
  const parent = storage.getStore();

  let userName: string | null = null;
  let callback: () => T;

  if (typeof userNameOrFn === "function") {
    callback = userNameOrFn as () => T;
    userName = parent?.userName ?? null;
  } else {
    userName = userNameOrFn ?? parent?.userName ?? null;
    callback = fn!;
  }

  return storage.run(
    {
      startTime: Date.now(),
      sttDuration: parent?.sttDuration ?? 0,
      llmDuration: parent?.llmDuration ?? 0,
      ttsDuration: parent?.ttsDuration ?? 0,
      sessionId: sessionId ?? parent?.sessionId ?? null,
      userName: userName,
      turnId: parent?.turnId ?? null,
    },
    callback
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

  const turnId = t.turnId;
  const latencies = getLatency();
  if (turnId && latencies) {
    fireAndForget(
      (async () => {
        await db.update(turns)
          .set({
            latencyStt: latencies.stt,
            latencyLlm: latencies.llm,
            latencyTts: latencies.tts,
            latencyTotal: latencies.total,
          })
          .where(eq(turns.id, turnId));
      })()
    );
  }
}

export function getLatency() {
  const t = storage.getStore();
  if (!t) return undefined;
  return { stt: t.sttDuration, llm: t.llmDuration, tts: t.ttsDuration, total: Date.now() - t.startTime };
}

export function getSessionId(): string | null {
  const t = storage.getStore();
  return t ? t.sessionId : null;
}

export function getTurnId(): string | null {
  const t = storage.getStore();
  return t ? t.turnId : null;
}

export function setTurnId(turnId: string): void {
  const t = storage.getStore();
  if (t) t.turnId = turnId;
}

export function getUserName(): string | null {
  const t = storage.getStore();
  return t ? t.userName : null;
}

