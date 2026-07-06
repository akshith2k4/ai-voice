import { buildIdlePrompt, buildWalkthroughPrompt } from "./prompts.js";
import { traceable } from "langsmith/traceable";
import { walkthroughExecutor } from "../src/walkthrough/executor.js";
import { LLMProvider } from "../src/services/providersConfig.js";
import { type SchemaNode, type FieldNode, findFieldInNodes } from "../src/schema/loader.js";
import { OpenAILLM } from "./providers/openAiLLM.js";
import { ClaudeLLM } from "./providers/claudeLLM.js";
import { ILLMService, LLMToolCall, LLMResult, LLMStreamChunk } from "../src/services/interfaces.js";
import { config } from "../src/config.js";
import { getUserName } from "../src/services/latencyTracker.js";

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
  let systemPrompt = buildIdlePrompt(getUserName() || undefined);

  const activeSession = walkthroughExecutor.getSession(sessionId);
  let dynamicContext = "";

  if (activeSession) {
    const nav = activeSession.currentNav;
    const currentField = nav ? findFieldInNodes(activeSession.schema.nodes, nav.fieldKey).matchedField : undefined;
    
    systemPrompt = buildWalkthroughPrompt(activeSession.schema, currentField, activeSession.languageCode || "en", getUserName() || undefined);
    
    // Build a dynamic state string so the LLM knows exactly what's happening
    const stateMap: Record<string, string> = {
      "ACTIVE": "Actively explaining/filling fields",
      "PAUSED": "Paused because the user interrupted with a question",
      "DETOUR_QA": "Answering a user's question about a specific field",
      "IDLE": "Idle"
    };
    const currentState = stateMap[activeSession.stateMachine.currentState] || activeSession.stateMachine.currentState;
    dynamicContext = `\n\n[CURRENT SYSTEM STATE: You are guiding the "${activeSession.schema.name}" form. Current Field: ${nav?.label || "Overview"}. Conversation State: ${currentState}.]`;
    console.log(`[LLMService] Active walkthrough — using walkthrough prompt`);
  }

  // Combine prompt, dynamic state, and language hint
  const finalSystemPrompt = systemPrompt + dynamicContext;

  // Rely on LLM's native detection + system prompt rules
  const languageHint = "";

  // Get history from memory cache (0ms latency)
  const history = sessionHistoryCache.get(sessionId) || [];

  const toolCalls: LLMToolCall[] = [];
  let rawContent = "";

  try {
    const generator = getLLMService().generateStream(finalSystemPrompt, userText, languageHint, signal, history);

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
    const updatedHistory = [...history, { role: "user" as const, content: userText }];

    // 1. Format tool calls into a readable action tag
    let assistantMemory = rawContent || "";
    if (toolCalls.length > 0) {
      const actions = toolCalls.map(tc => {
        if (tc.name === "navigate") return `navigated to ${tc.args.route}`;
        if (tc.name === "start_walkthrough") return `started ${tc.args.formId} walkthrough`;
        if (tc.name === "answer_question") return `answered a question`;
        if (tc.name === "detour_to_field") return `highlighted ${tc.args.fieldKey}`;
        if (tc.name === "resume_walkthrough") return `resumed walkthrough`;
        return tc.name;
      }).join(", ");
      
      // Append a hidden context tag so the LLM remembers what it JUST did
      assistantMemory += ` [Action taken: ${actions}]`;
    }

    if (assistantMemory) {
      updatedHistory.push({ role: "assistant" as const, content: assistantMemory });
    }

    // Keep last 12 messages (6 pairs) for better short-term memory
    sessionHistoryCache.set(sessionId, updatedHistory.slice(-12));

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
