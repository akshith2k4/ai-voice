import { buildIdlePrompt, buildWalkthroughPrompt } from "./prompts.js";
import { traceable } from "langsmith/traceable";
import { walkthroughExecutor } from "../src/walkthrough/executor.js";
import { LLMProvider } from "../src/services/providersConfig.js";
import { type SchemaNode, type FieldNode, findFieldInNodes } from "../src/schema/loader.js";
import { OpenAILLM } from "./providers/openAiLLM.js";
import { ClaudeLLM } from "./providers/claudeLLM.js";
import { ILLMService, LLMToolCall, LLMResult, LLMStreamChunk } from "../src/services/interfaces.js";
import { config } from "../src/config.js";
import { db, turns } from "../src/services/db.js";
import { eq, desc } from "drizzle-orm";
import { getTurnId } from "../src/services/latencyTracker.js";

export type { LLMToolCall, LLMResult, LLMStreamChunk };

const providers = new Map<LLMProvider, ILLMService>();

function getLLMProvider(): LLMProvider {
  return config.providers.llm === LLMProvider.CLAUDE ? LLMProvider.CLAUDE : LLMProvider.OPEN_AI;
}

export function getLLMService(): ILLMService {
  const provider = getLLMProvider();
  if (!providers.has(provider)) {
    providers.set(provider, provider === LLMProvider.CLAUDE ? new ClaudeLLM() : new OpenAILLM());
  }
  return providers.get(provider)!;
}

// Selects the right system prompt based on walkthrough state, then streams
// the LLM response, yielding text and tool-call chunks as they arrive.
export const streamLLM = traceable(async function* (
  userText: string,
  sessionId: string,
  languageCode?: string,
  signal?: AbortSignal
): AsyncGenerator<LLMStreamChunk, LLMResult, unknown> {
  let systemPrompt = buildIdlePrompt();

  const activeSession = walkthroughExecutor.getSession(sessionId);
  if (activeSession) {
    const nav = activeSession.currentNav;
    const currentField = nav ? findFieldInNodes(activeSession.schema.nodes, nav.fieldKey).matchedField : undefined;
    
    systemPrompt = buildWalkthroughPrompt(activeSession.schema, currentField, activeSession.languageCode || "en");
    console.log(`[LLMService] Active walkthrough — using walkthrough prompt`);
  }

  // Rely on LLM's native detection + system prompt rules
  const languageHint = "";

  let history: { role: "user" | "assistant"; content: string }[] = [];
  try {
    const currentTurnId = getTurnId();
    const recentTurns = await db.select({
      id: turns.id,
      userTranscript: turns.userTranscript,
      llmRawContent: turns.llmRawContent,
    })
    .from(turns)
    .where(eq(turns.sessionId, sessionId))
    .orderBy(desc(turns.createdAt))
    .limit(6);

    const filteredTurns = recentTurns
      .filter((t) => t.id !== currentTurnId)
      .slice(0, 5);

    // Sort chronologically (oldest first)
    filteredTurns.reverse();

    for (const t of filteredTurns) {
      if (t.userTranscript) {
        history.push({ role: "user", content: t.userTranscript });
      }
      if (t.llmRawContent) {
        history.push({ role: "assistant", content: t.llmRawContent });
      }
    }
  } catch (error) {
    console.error("[LLMService] Error fetching history from DB:", error);
  }

  const toolCalls: LLMToolCall[] = [];
  let rawContent = "";

  try {
    const generator = getLLMService().generateStream(systemPrompt, userText, languageHint, signal, history);

    while (true) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      const { done, value } = await generator.next();
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

      if (done) {
        const result = value as LLMResult;
        toolCalls.push(...result.toolCalls);
        rawContent = result.rawContent || "";
        break;
      }

      const chunk = value as LLMStreamChunk;
      if (chunk.type === "text" && chunk.text) {
        yield { type: "text", text: chunk.text };
      } else if (chunk.type === "tool_call" && chunk.toolCall) {
        yield { type: "tool_call", toolCall: chunk.toolCall };
      }
    }

    console.log(
      `[LLMService] Stream done. ${toolCalls.length} tool call(s)` +
        (toolCalls.length > 0 ? ` — [${toolCalls.map((tc) => tc.name).join(", ")}]` : "") +
        (rawContent ? ` | text: "${rawContent.substring(0, 80)}"` : "")
    );

    return { toolCalls, rawContent: rawContent.trim() || null };
  } catch (error) {
    console.error("[LLMService] Stream failed:", error);
    return { toolCalls: [], rawContent: "I'm having trouble understanding. Could you try again?" };
  }
}, { name: "streamLLM" });
