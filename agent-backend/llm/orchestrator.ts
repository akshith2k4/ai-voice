// ============================================
// LLM Orchestrator
// LangChain + Google Gemini setup + invocation
// ============================================

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { allTools } from "./tools.js";
import { buildIdlePrompt, buildWalkthroughPrompt } from "./prompts.js";
import { walkthroughDriver } from "../src/walkthrough/driver.js";

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || "";
const GOOGLE_MODEL = process.env.GOOGLE_MODEL || "gemini-2.5-flash";

let model: ReturnType<typeof createModel> | null = null;

function createModel() {
  if (!GOOGLE_API_KEY) {
    throw new Error("GOOGLE_API_KEY not configured");
  }
  return new ChatGoogleGenerativeAI({
    model: GOOGLE_MODEL,
    temperature: 0,
    apiKey: GOOGLE_API_KEY,
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

/**
 * Send user text to the LLM and get tool calls back
 */
export async function orchestrate(
  userText: string,
  sessionId: string,
  languageCode?: string
): Promise<LLMResult> {
  let systemPrompt = buildIdlePrompt();

  const activeSession = walkthroughDriver.getSession(sessionId);
  if (activeSession) {
    const ctx = activeSession.stateMachine.currentContext;
    const currentField = activeSession.schema.fields[ctx.fieldIndex];
    systemPrompt = buildWalkthroughPrompt(activeSession.schema, currentField?.key || "unknown");
    console.log(`[Orchestrator] Active session detected. Routing using walkthrough layout context slices.`);
  }

  const languageHint = languageCode
    ? `\n\nThe user's speech was detected as language code: ${languageCode}. Respond in that language.`
    : "";

  try {
    const result = await getModel().invoke([
      new SystemMessage(systemPrompt + languageHint),
      new HumanMessage(userText),
    ]);

    const toolCalls: LLMToolCall[] = [];

    const normalizedCalls = (result as { tool_calls?: unknown[] }).tool_calls;
    if (Array.isArray(normalizedCalls) && normalizedCalls.length > 0) {
      for (const call of normalizedCalls) {
        const c = call as { name?: unknown; args?: unknown };
        if (typeof c.name === "string" && c.args && typeof c.args === "object") {
          toolCalls.push({
            name: c.name,
            args: c.args as Record<string, unknown>,
          });
        }
      }
    }

    if (toolCalls.length === 0 && result.additional_kwargs?.tool_calls) {
      const rawCalls = result.additional_kwargs.tool_calls as Array<{
        function?: { name?: string; arguments?: string };
      }>;
      for (const call of rawCalls) {
        if (call.function?.name && call.function?.arguments) {
          try {
            toolCalls.push({
              name: call.function.name,
              args: JSON.parse(call.function.arguments),
            });
          } catch {
            console.error("[LLM] Failed to parse tool call arguments");
          }
        }
      }
    }

    if (toolCalls.length === 0 && Array.isArray(result.content)) {
      for (const block of result.content) {
        if (
          typeof block === "object" &&
          block !== null &&
          "type" in block &&
          block.type === "tool_use" &&
          "name" in block &&
          typeof block.name === "string" &&
          "input" in block
        ) {
          toolCalls.push({
            name: block.name as string,
            args: block.input as Record<string, unknown>,
          });
        }
      }
    }

    let rawContent: string | null = null;
    if (typeof result.content === "string" && result.content.trim()) {
      rawContent = result.content;
    } else if (Array.isArray(result.content)) {
      for (const block of result.content) {
        if (typeof block === "string") {
          rawContent = block;
          break;
        }
        if (
          typeof block === "object" &&
          block !== null &&
          "type" in block &&
          block.type === "text" &&
          "text" in block &&
          typeof block.text === "string"
        ) {
          rawContent = block.text;
          break;
        }
      }
    }

    console.log(
      `[LLM] ${toolCalls.length} tool call(s)` +
        (toolCalls.length > 0
          ? ` — [${toolCalls.map((tc) => tc.name).join(", ")}]`
          : "") +
        (rawContent ? ` | text: "${rawContent.substring(0, 80)}"` : "")
    );

    return { toolCalls, rawContent };
  } catch (error) {
    console.error("[LLM] Orchestration failed:", error);
    return {
      toolCalls: [],
      rawContent: "I'm having trouble understanding. Could you try again?",
    };
  }
}
