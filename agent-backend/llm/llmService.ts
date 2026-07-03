import { buildIdlePrompt, buildWalkthroughPrompt } from "./prompts.js";
import { traceable } from "langsmith/traceable";
import { walkthroughExecutor } from "../src/walkthrough/executor.js";
import { LLMProvider } from "../src/services/providersConfig.js";
import { type SchemaNode, type FieldNode, findFieldInNodes } from "../src/schema/loader.js";
import { OpenAILLM } from "./providers/openAiLLM.js";
import { ClaudeLLM } from "./providers/claudeLLM.js";
import { ILLMService, LLMToolCall, LLMResult, LLMStreamChunk } from "../src/services/interfaces.js";
import { config } from "../src/config.js";

export type { LLMToolCall, LLMResult, LLMStreamChunk };

const providers = new Map<LLMProvider, ILLMService>();
const sessionHistoryCache = new Map<string, { role: "user" | "assistant"; content: string }[]>();

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

  // Get history from memory cache (0ms latency)
  const history = sessionHistoryCache.get(sessionId) || [];

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

    // Update memory cache after LLM finishes
    // Keep only the last 10 messages (5 pairs) to prevent memory leaks
    const updatedHistory = [...history, { role: "user" as const, content: userText }];
    if (rawContent) {
      updatedHistory.push({ role: "assistant" as const, content: rawContent });
    }
    sessionHistoryCache.set(sessionId, updatedHistory.slice(-10));

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
