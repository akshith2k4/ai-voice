import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { allTools } from "../tools.js";
import { ILLMService, LLMStreamChunk, LLMResult, LLMToolCall } from "../../src/services/interfaces.js";
import { config } from "../../src/config.js";

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
      });
    }
    return this.model.bindTools(allTools);
  }

  async *generateStream(
    systemPrompt: string,
    userPrompt: string,
    languageHint = ""
  ): AsyncGenerator<LLMStreamChunk, LLMResult, unknown> {
    const modelWithTools = this.getModel();
    const toolCalls: LLMToolCall[] = [];
    let rawContent = "";

    const stream = await modelWithTools.stream([
      new SystemMessage(systemPrompt + languageHint),
      new HumanMessage(userPrompt),
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

    return {
      toolCalls,
      rawContent: rawContent.trim() || null,
    };
  }
}
