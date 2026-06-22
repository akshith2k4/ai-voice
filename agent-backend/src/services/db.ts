import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { pgTable, uuid, varchar, text, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey(),
  userName: varchar('username'),
  startedAt: timestamp('started_at').defaultNow(),
  endedAt: timestamp('ended_at'),
  status: varchar('status'), // 'active', 'completed', 'errored'
  formId: varchar('form_id'),
});

export const turns = pgTable('turns', {
  id: uuid('id').primaryKey(),
  sessionId: uuid('session_id').references(() => sessions.id),
  
  // Text
  userTranscript: text('user_transcript'),
  llmRawContent: text('llm_raw_content'),
  llmToolCalls: jsonb('llm_tool_calls'),
  agentTranscript: text('agent_transcript'),
  
  // Audio URLs
  userAudioUrl: text('user_audio_url'),
  agentAudioUrl: text('agent_audio_url'),
  
  // Latencies (ms)
  latencyStt: integer('latency_stt'),
  latencyLlm: integer('latency_llm'),
  latencyTts: integer('latency_tts'),
  latencyTotal: integer('latency_total'),
  
  createdAt: timestamp('created_at').defaultNow(),
});

const connectionString = process.env.DATABASE_URL || "postgres://localhost:5432/placeholder";
if (!process.env.DATABASE_URL) {
  console.warn("[Observability DB] Warning: DATABASE_URL not set in environment, using placeholder.");
}

const client = postgres(connectionString);
export const db = drizzle(client);

import { eq } from 'drizzle-orm';
export async function ensureSessionExists(sessionId: string, formId?: string, userName?: string): Promise<void> {
  try {
    const existing = await db.select({ id: sessions.id, status: sessions.status })
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(sessions).values({
        id: sessionId,
        status: "active",
        formId: formId || null,
        userName: userName || null,
      });
    } else {
      // Update formId if provided; reactivate if session was previously closed (reconnect)
      const updates: Record<string, any> = {};
      if (formId) updates.formId = formId;
      if (userName) updates.userName = userName;
      if (existing[0].status === "completed") {
        const { walkthroughExecutor } = await import("../walkthrough/executor.js");
        if (walkthroughExecutor.getSession(sessionId)) {
          updates.status = "active";
          updates.endedAt = null;
        }
      }
      if (Object.keys(updates).length > 0) {
        await db.update(sessions)
          .set(updates)
          .where(eq(sessions.id, sessionId));
      }
    }
  } catch (e: any) {
    if (e.code === '23505') {
      // Ignore concurrent insert unique violations
    } else {
      console.error("[Observability DB] Error in ensureSessionExists:", e);
    }
  }
}
