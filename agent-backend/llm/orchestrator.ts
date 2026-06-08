// ============================================
// LLM Orchestrator
// LangChain + OpenAI setup + invocation
// ============================================

import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { allTools } from "./tools.js";
import { buildIdlePrompt, buildWalkthroughPrompt } from "./prompts.js";
import { walkthroughDriver } from "../src/walkthrough/driver.js";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o";

let model: ReturnType<typeof createModel> | null = null;

function createModel() {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }
  return new ChatOpenAI({
    model: OPENAI_MODEL,
    temperature: 0,
    apiKey: OPENAI_API_KEY,
  }).bindTools(allTools);
}

function getModel() {
  if (!model) {
    model = createModel();
  }
  return model;
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
    const stream = await getModel().stream([
      new SystemMessage(systemPrompt + languageHint),
      new HumanMessage(userText),
    ]);

    let finalMessage: any = null;

    for await (const chunk of stream) {
      finalMessage = finalMessage ? finalMessage.concat(chunk) : chunk;

      let textContent = "";
      if (typeof chunk.content === "string") {
        textContent = chunk.content;
      } else if (Array.isArray(chunk.content)) {
        for (const block of chunk.content) {
          if (typeof block === "string") {
            textContent += block;
          } else if (block && typeof block === "object" && "text" in block && typeof block.text === "string") {
            textContent += block.text;
          }
        }
      }

      if (textContent) {
        rawContent += textContent;
        yield { type: "text", text: textContent };
      }
    }

    if (finalMessage && finalMessage.tool_calls && finalMessage.tool_calls.length > 0) {
      for (const tc of finalMessage.tool_calls) {
        const toolCall = {
          name: tc.name,
          args: tc.args as Record<string, unknown>,
        };
        toolCalls.push(toolCall);
        yield { type: "tool_call", toolCall };
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
