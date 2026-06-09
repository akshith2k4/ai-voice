// ============================================
// LLM Orchestrator
// LangChain setup + invocation
// ============================================

import { buildIdlePrompt, buildWalkthroughPrompt } from "./prompts.js";
import { walkthroughDriver } from "../src/walkthrough/driver.js";
import { LLMProvider } from "../src/services/providersConfig.js";
import { OpenAILLM } from "./providers/openAiLLM.js";
import { ClaudeLLM } from "./providers/claudeLLM.js";
import { ILLMService } from "../src/services/interfaces.js";

const providers = new Map<LLMProvider, ILLMService>();

function getLLMProvider(): LLMProvider {
  const envVal = process.env.LLM_PROVIDER;
  if (envVal === LLMProvider.CLAUDE) {
    return LLMProvider.CLAUDE;
  }
  return LLMProvider.OPEN_AI;
}

export function getLLMService(): ILLMService {
  const provider = getLLMProvider();
  let service = providers.get(provider);
  if (!service) {
    if (provider === LLMProvider.CLAUDE) {
      service = new ClaudeLLM();
    } else {
      service = new OpenAILLM();
    }
    providers.set(provider, service);
  }
  return service;
}

export interface LLMToolCall {
  name: string;
  args: Record<string, unknown>;
}

export interface LLMResult {
  toolCalls: LLMToolCall[];
  rawContent: string | null;
}

export interface LLMStreamChunk {
  type: "text" | "tool_call";
  text?: string;
  toolCall?: LLMToolCall;
}

export async function* orchestrateStream(
  userText: string,
  sessionId: string,
  languageCode?: string
): AsyncGenerator<LLMStreamChunk, LLMResult, unknown> {
  let systemPrompt = buildIdlePrompt();

  const activeSession = walkthroughDriver.getSession(sessionId);
  if (activeSession) {
    const ctx = activeSession.stateMachine.currentContext;
    let currentField = activeSession.schema.fields[ctx.fieldIndex];
    if (ctx.subFormId) {
      const subForm = activeSession.schema.subForms.find(sf => sf.id === ctx.subFormId);
      if (subForm && subForm.fields[ctx.subFormFieldIndex]) {
        currentField = subForm.fields[ctx.subFormFieldIndex];
      }
    }
    systemPrompt = buildWalkthroughPrompt(activeSession.schema, currentField);
    console.log(`[Orchestrator] Active session detected. Routing using walkthrough layout context slices.`);
  }

  const languageHint = languageCode
    ? `\n\nThe user's speech was detected as language code: ${languageCode}. Respond in that language.`
    : "";

  const toolCalls: LLMToolCall[] = [];
  let rawContent = "";

  try {
    const generator = getLLMService().generateStream(systemPrompt, userText, languageHint);

    while (true) {
      const { done, value } = await generator.next();

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
      `[LLM Stream] Stream finished. ${toolCalls.length} tool call(s)` +
        (toolCalls.length > 0
          ? ` — [${toolCalls.map((tc) => tc.name).join(", ")}]`
          : "") +
        (rawContent ? ` | text: "${rawContent.substring(0, 80)}"` : "")
    );

    return {
      toolCalls,
      rawContent: rawContent.trim() || null,
    };
  } catch (error) {
    console.error("[LLM Stream] Orchestration stream failed:", error);
    return {
      toolCalls: [],
      rawContent: "I'm having trouble understanding. Could you try again?",
    };
  }
}
