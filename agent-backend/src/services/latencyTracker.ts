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
  llmModel?: string | null;
  llmInputTokens?: number | null;
  llmOutputTokens?: number | null;
  ttsModel?: string | null;
  ttsChars?: number | null;
  sttModel?: string | null;
  sttSeconds?: number | null;
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
      llmModel: parent?.llmModel ?? null,
      llmInputTokens: parent?.llmInputTokens ?? 0,
      llmOutputTokens: parent?.llmOutputTokens ?? 0,
      ttsModel: parent?.ttsModel ?? null,
      ttsChars: parent?.ttsChars ?? 0,
      sttModel: parent?.sttModel ?? null,
      sttSeconds: parent?.sttSeconds ?? 0,
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

export function recordLlmUsage(modelId: string, inputTokens: number, outputTokens: number): void {
  const t = storage.getStore();
  if (t) {
    t.llmModel = modelId;
    t.llmInputTokens = (t.llmInputTokens ?? 0) + inputTokens;
    t.llmOutputTokens = (t.llmOutputTokens ?? 0) + outputTokens;
  }
}

export function recordTtsUsage(chars: number, modelId?: string): void {
  const t = storage.getStore();
  if (t) {
    t.ttsChars = (t.ttsChars ?? 0) + chars;
    if (modelId) {
      t.ttsModel = modelId;
    }
  }
}

export function recordSttUsage(seconds: number, modelId?: string): void {
  const t = storage.getStore();
  if (t) {
    t.sttSeconds = (t.sttSeconds ?? 0) + seconds;
    if (modelId) {
      t.sttModel = modelId;
    }
  }
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
        // Use ON CONFLICT to ensure the row exists before updating
        // This requires `id` to be the Primary Key (which it is in your schema)
        await db.insert(turns)
          .values({
            id: turnId,
            sessionId: t.sessionId || undefined,
          })
          .onConflictDoUpdate({
            target: turns.id,
            set: {
              latencyStt: latencies.stt,
              latencyLlm: latencies.llm,
              latencyTts: latencies.tts,
              latencyTotal: latencies.total,
              llmModel: t.llmModel || process.env.OPENAI_MODEL || "gpt-4o",
              llmInputTokens: t.llmInputTokens,
              llmOutputTokens: t.llmOutputTokens,
              ttsModel: t.ttsModel || (process.env.TTS_PROVIDER === 'OPEN_AI' ? 'tts-1' : process.env.ELEVENLABS_TTS_MODEL || 'eleven_v3'),
              ttsChars: t.ttsChars,
              sttModel: t.sttModel || (process.env.STT_PROVIDER === 'SARVAM' ? process.env.STT_MODEL || 'saaras:v3' : process.env.STT_PROVIDER === 'OPEN_AI' ? 'whisper-1' : process.env.ELEVENLABS_STT_MODEL || 'scribe_v2'),
              sttSeconds: t.sttSeconds ? Math.round(t.sttSeconds * 100) / 100 : 0,
            }
          })
          .execute();
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

