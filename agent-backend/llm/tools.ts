// ============================================
// LLM Tool Definitions
// Only 4 tools — the agent is a consultant, not a driver
// ============================================

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

/**
 * Navigate to a page in the application
 */
export const navigateTool = new DynamicStructuredTool({
  name: "navigate",
  description:
    "Navigate to a specific page in the application. Use this when the user asks to go to a page like 'orders', 'billing', 'hotels', etc.",
  schema: z.object({
    route: z
      .string()
      .describe(
        "The route path to navigate to, e.g. '/orders', '/billing'"
      ),
    message: z
      .string()
      .describe(
        "What to say to the user while navigating, e.g. 'Navigating to Orders'"
      ),
  }),
  func: async (input) => {
    // The function body doesn't matter — the orchestrator reads the tool call
    // and executes it. LangChain requires a func, so we return the input.
    return JSON.stringify(input);
  },
});

/**
 * Start a guided walkthrough for a form
 */
export const startWalkthroughTool = new DynamicStructuredTool({
  name: "start_walkthrough",
  description:
    "Start a guided walkthrough for a form. Use this when the user asks to learn how to use a form, e.g. 'show me how to create an order', 'teach me the order workflow', 'walk me through creating an order'.",
  schema: z.object({
    formId: z
      .string()
      .describe(
        "The form ID to start walkthrough for, e.g. 'createOrder'"
      ),
    message: z
      .string()
      .describe(
        "What to say to the user when starting, e.g. 'I will walk you through creating an order'"
      ),
  }),
  func: async (input) => {
    return JSON.stringify(input);
  },
});

/**
 * Answer a user's question
 */
export const answerQuestionTool = new DynamicStructuredTool({
  name: "answer_question",
  description:
    "Answer a question the user has asked about the application, a form field, or a workflow. Use this for any question that isn't a navigation or walkthrough request.",
  schema: z.object({
    response: z.string().describe("The answer to the user's question"),
  }),
  func: async (input) => {
    return JSON.stringify(input);
  },
});

/**
 * Ask the user to clarify their request
 */
export const askClarificationTool = new DynamicStructuredTool({
  name: "ask_clarification",
  description:
    "Ask the user to clarify or rephrase their request. Use this when the user's intent is unclear or ambiguous.",
  schema: z.object({
    message: z
      .string()
      .describe(
        "The clarification question to ask, e.g. 'Could you rephrase that?' or 'Did you want to learn about orders or billing?'"
      ),
  }),
  func: async (input) => {
    return JSON.stringify(input);
  },
});

export const detourToFieldTool = new DynamicStructuredTool({
  name: "detour_to_field",
  description:
    "Detour to explain a specific field on the active form without filling it. Use this when the user asks a question about what a field means, what data goes into it, how to use it, etc. Do NOT answer inline with text.",
  schema: z.object({
    fieldKey: z
      .string()
      .describe(
        "The exact field key from the critical field directory map."
      ),
  }),
  func: async (input) => {
    return JSON.stringify(input);
  },
});

export const resumeWalkthroughTool = new DynamicStructuredTool({
  name: "resume_walkthrough",
  description:
    "Resume the walkthrough sequence. Use this when the user says 'continue', 'next', or indicates they are ready to proceed.",
  schema: z.object({}),
  func: async (input) => {
    return JSON.stringify(input);
  },
});

export const allTools = [
  navigateTool,
  startWalkthroughTool,
  answerQuestionTool,
  askClarificationTool,
  detourToFieldTool,
  resumeWalkthroughTool,
];
