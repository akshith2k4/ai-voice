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
    new SystemMessage("You are a helpful assistant. If you want to answer a question, reply with plain text. Do not use any tools unless navigation or walkthroughs are needed."),
    new HumanMessage("Take me to the orders page"),
  ]);

  for await (const chunk of stream) {
    console.log("--- CHUNK ---");
    console.log("Content:", JSON.stringify(chunk.content));
    console.log("Tool Call Chunks:", JSON.stringify(chunk.tool_call_chunks));
  }
}

main().catch(console.error);
