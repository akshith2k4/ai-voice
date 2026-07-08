import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { allTools } from "../tools.js";
import { ILLMService, LLMStreamChunk, LLMResult, LLMToolCall } from "../../src/services/interfaces.js";
import { config } from "../../src/config.js";
import { recordLlmUsage } from "../../src/services/latencyTracker.js";

export class OpenAILLM implements ILLMService {
  private model: ChatOpenAI | null = null;

  constructor() {}

  private getModel(): any {
    if (!this.model) {
      const { apiKey: OPENAI_API_KEY, model: OPENAI_MODEL } = config.openai;

      if (!OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY not configured");
      }

      this.model = new ChatOpenAI({
        model: OPENAI_MODEL,
        temperature: 0,
        apiKey: OPENAI_API_KEY,
        maxRetries: 2,
        streaming: true,
        streamUsage: true,
      });
    }
    return this.model.bindTools(allTools);
  }

  async *generateStream(
    systemPrompt: string,
    userPrompt: string,
    languageHint = "",
    signal?: AbortSignal,
    history: { role: "user" | "assistant"; content: string }[] = []
  ): AsyncGenerator<LLMStreamChunk, LLMResult, unknown> {
    const modelWithTools = this.getModel();
    const toolCalls: LLMToolCall[] = [];
    let rawContent = "";

    const controller = new AbortController();
    if (signal) {
      if (signal.aborted) {
        throw new DOMException("Aborted", "AbortError");
      }
      signal.addEventListener("abort", () => controller.abort());
    }
    const timeoutTimer = setTimeout(() => {
      controller.abort();
    }, 10000);
    const combinedSignal = controller.signal;

    try {
      const messages: any[] = [
        new SystemMessage(systemPrompt + languageHint)
      ];

      for (const h of history) {
        if (h.role === "user") {
          messages.push(new HumanMessage(h.content));
        } else {
          messages.push(new AIMessage(h.content));
        }
      }

      messages.push(new HumanMessage(userPrompt));

      const stream = await modelWithTools.stream(messages, { signal: combinedSignal });

      let finalMessage: any = null;

      for await (const chunk of stream) {
        if (combinedSignal.aborted) {
          throw new DOMException("Aborted", "AbortError");
        }
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

      if (finalMessage && finalMessage.usage_metadata) {
        const { input_tokens = 0, output_tokens = 0 } = finalMessage.usage_metadata;
        const modelId = config.openai.model || "gpt-4o";
        recordLlmUsage(modelId, input_tokens, output_tokens);
      }

      return {
        toolCalls,
        rawContent: rawContent.trim() || null,
      };
    } finally {
      clearTimeout(timeoutTimer);
    }
  }
}
