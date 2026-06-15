import { ILLMService, LLMStreamChunk, LLMResult } from "../../src/services/interfaces.js";
import { config } from "../../src/config.js";

// Note: To use ChatAnthropic in production, install `@langchain/anthropic`
// and import: import { ChatAnthropic } from "@langchain/anthropic";

export class ClaudeLLM implements ILLMService {
  constructor() {}

  async *generateStream(
    systemPrompt: string,
    userPrompt: string,
    languageHint = ""
  ): AsyncGenerator<LLMStreamChunk, LLMResult, unknown> {
    console.log("[ClaudeLLM] Streaming started (boilerplate/placeholder active)");

    const ANTHROPIC_API_KEY = config.anthropic.apiKey;
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    // Boilerplate placeholder for ChatAnthropic usage:
    /*
    import { allTools } from "../tools.js";
    import { HumanMessage, SystemMessage } from "@langchain/core/messages";

    const model = new ChatAnthropic({
      apiKey: ANTHROPIC_API_KEY,
      modelName: "claude-3-5-sonnet-20241022",
      temperature: 0,
    }).bindTools(allTools);

    const stream = await model.stream([
      new SystemMessage(systemPrompt + languageHint),
      new HumanMessage(userPrompt),
    ]);

    // Iterate chunks and yield type: "text" / "tool_call" similar to OpenAI
    */

    // Simulate mock stream response for verification
    const mockResponse = `This is a mock Claude response to your query: "${userPrompt}"`;
    const words = mockResponse.split(" ");
    for (const word of words) {
      yield { type: "text", text: word + " " };
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    return {
      toolCalls: [],
      rawContent: mockResponse,
    };
  }
}
