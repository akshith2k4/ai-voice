// ============================================
// System Prompt Builder
// Dynamically builds the LLM system prompt
// based on the current state and context
// ============================================

import routeRegistry from "../src/schema/routeRegistry.json" with { type: "json" };
import type { FormSchema, FieldSchema } from "../src/schema/loader.js";

function formatRoutes(): string {
  return routeRegistry.routes
    .map(
      (r) =>
        `- "${r.name}" → ${r.path} (aliases: ${r.aliases.join(", ")})`
    )
    .join("\n");
}

function formatForms(): string {
  return routeRegistry.forms
    .map(
      (f) =>
        `- "${f.name}" (id: ${f.id}, route: ${f.route}, aliases: ${f.aliases.join(", ")})`
    )
    .join("\n");
}

/**
 * Build the system prompt for the IDLE state.
 * This is the base prompt used when no walkthrough is active.
 */
export function buildIdlePrompt(): string {
  return `You are a voice-guided walkthrough assistant for the LinenGrass admin panel. Your job is to help users learn how to use the application through guided, step-by-step walkthroughs.

YOUR CAPABILITIES:
- Navigate the user to any page in the application
- Start a guided walkthrough for any available form
- Answer questions about forms and workflows

YOUR LIMITATIONS:
- You can ONLY help with form walkthroughs and navigation
- You CANNOT answer questions about data, reports, or account information
- You CANNOT perform actions on behalf of the user
- If asked about something outside your scope, politely redirect: "I can help you learn how to use forms in this application. Would you like a walkthrough of any form?"

AVAILABLE PAGES:
${formatRoutes()}

AVAILABLE FORM WALKTHROUGHS:
${formatForms()}

LANGUAGE RULES:
- Detect the language the user speaks and respond in the same language
- Always keep technical terms (field names, option values, page names) in English
- For example, if the user speaks Hindi: "मैं आपको Order creation का walkthrough दिखाता हूं"
- Be natural and helpful, not robotic

RESPONSE RULES:
- Keep responses concise — this is a voice interaction, not a chat
- For navigation requests: use the navigate tool
- For walkthrough requests: use the start_walkthrough tool
- For questions about forms/workflows: use the answer_question tool
- For unclear requests: use the ask_clarification tool
- Always include a message in your tool call — this is what the user hears via TTS`;
}

/**
 * Builds a highly optimized system prompt for active walkthrough sessions.
 * Compacts the field list to remain well under the token performance threshold.
 */
export function buildWalkthroughPrompt(schema: FormSchema, currentField: FieldSchema | undefined): string {
  // Collect simplified schema for ALL fields (both main form and sub-forms)
  const allFieldsSimplified: Array<{ key: string; label: string; explanation?: string; options?: string[]; aliases: string[] }> = [];

  for (const f of schema.fields) {
    allFieldsSimplified.push({
      key: f.key,
      label: f.label,
      explanation: f.explanation,
      options: f.options ?? undefined,
      aliases: f.commonQuestions?.map(q => q.question.toLowerCase()) || [],
    });
  }

  if (schema.subForms) {
    for (const sf of schema.subForms) {
      for (const f of sf.fields) {
        allFieldsSimplified.push({
          key: f.key,
          label: f.label,
          explanation: f.explanation,
          options: f.options ?? undefined,
          aliases: f.commonQuestions?.map(q => q.question.toLowerCase()) || [],
        });
      }
    }
  }

  const currentFieldKey = currentField?.key || "unknown";
  
  let currentFieldContextBlock = "";
  if (currentField) {
    const contextObj: Record<string, any> = {
      key: currentField.key,
      label: currentField.label,
      type: currentField.type,
      required: currentField.required ?? false,
    };
    if (currentField.options !== undefined && currentField.options !== null) {
      contextObj.options = currentField.options;
    }
    contextObj.explanation = currentField.explanation;
    if (currentField.tips) {
      contextObj.tips = currentField.tips;
    }
    if (currentField.commonQuestions && currentField.commonQuestions.length > 0) {
      contextObj.commonQuestions = currentField.commonQuestions;
    }
    currentFieldContextBlock = `CURRENT FIELD FULL CONTEXT:
${JSON.stringify(contextObj, null, 2)}`;
  } else {
    currentFieldContextBlock = "CURRENT FIELD FULL CONTEXT: No active field context available.";
  }

  return `You are an overlay monitor guiding a user through the "${schema.name}" form dialog.
CURRENT ACTION FRAME: The user is currently looking at the field: "${currentFieldKey}".

${currentFieldContextBlock}

DECISION GUIDE:
Choose the appropriate tool based on the user's intent:
1. Navigation / Focus: The user wants to locate, highlight, focus on, or go to a field (e.g., "show me the customer field", "where is the order date?", "highlight order reference id").
   - Action: Select the 'detour_to_field' tool with the target fieldKey.
2. Explanation / Q&A: The user asks a question about what a field means, how to use it, why it is needed, its options, or comparative questions (e.g., "what is this?", "what is the customer field?", "why do we use leasing?", "how do I use this?", "why do I need this?").
   - Action: Use the 'answer_question' tool and synthesize a tailored response using the explanations and options provided in the prompt. Do NOT call the 'detour_to_field' tool (do not navigate to the field).
3. Continue: The user indicates they are ready to proceed (e.g., "ok", "next", "got it", "continue").
   - Action: Select the 'resume_walkthrough' tool.
4. Off-topic: The user asks about something unrelated (e.g., "what's the weather?").
   - Action: Say you can't help with that, and add a polite, brief redirect back to the walkthrough.

CRITICAL FIELD DIRECTORY MAP:
${JSON.stringify(allFieldsSimplified)}

RESPONSE RULES:
- For explanation, generate 1-3 sentences directly answering the question. Do NOT replay the field's standard explanation.
- Keep text parameters inside tools concise for natural text-to-speech rendering.
- Preserve all interface and technical naming fields strictly in English language strings.`;
}
