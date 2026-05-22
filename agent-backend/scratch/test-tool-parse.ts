import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { navigateTool, startWalkthroughTool, askClarificationTool, detourToFieldTool, resumeWalkthroughTool } from "../llm/tools";
import dotenv from "dotenv";

dotenv.config();

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || "";
const GOOGLE_MODEL = process.env.GOOGLE_MODEL || "gemini-2.5-flash";

async function main() {
  if (!GOOGLE_API_KEY) {
    console.error("GOOGLE_API_KEY not configured");
    return;
  }

  const tools = [
    navigateTool,
    startWalkthroughTool,
    askClarificationTool,
    detourToFieldTool,
    resumeWalkthroughTool
  ];

  const model = new ChatGoogleGenerativeAI({
    model: GOOGLE_MODEL,
    temperature: 0,
    apiKey: GOOGLE_API_KEY,
  }).bindTools(tools);

  console.log("Starting tool stream...");
  const stream = await model.stream([
    new SystemMessage("You are a helpful assistant. Use tools for actions."),
    new HumanMessage("What is the capital of France?"),
  ]);

  let finalMessage: any = null;
  for await (const chunk of stream) {
    if (!finalMessage) {
      finalMessage = chunk;
    } else {
      finalMessage = finalMessage.concat(chunk);
    }
  }

  console.log("--- FINAL MESSAGE ---");
  console.log("Content:", JSON.stringify(finalMessage.content));
  console.log("Tool Calls:", JSON.stringify(finalMessage.tool_calls));
  console.log("Additional Kwargs Tool Calls:", JSON.stringify(finalMessage.additional_kwargs?.tool_calls));
}

main().catch(console.error);
