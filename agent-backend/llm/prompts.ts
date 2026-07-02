// ============================================
// System Prompt Builder
// Dynamically builds the LLM system prompt
// based on the current state and context
// ============================================

import routeRegistry from "../src/schema/routeRegistry.json" with { type: "json" };
import type { FormSchema, FieldSchema, SchemaNode, FieldNode } from "../src/schema/loader.js";
import { getAvailableForms } from "../src/schema/loader.js";

function flattenFields(nodes: SchemaNode[]): FieldNode[] {
  const result: FieldNode[] = [];
  for (const node of nodes) {
    if (node.nodeType === "field") result.push(node);
    else if (node.nodeType === "group" || node.nodeType === "repeating") result.push(...flattenFields(node.children));
  }
  return result;
}

function formatRoutes(): string {
  return routeRegistry.routes
    .map((r) => `- "${r.name}" → ${r.path} (aliases: ${r.aliases.join(", ")})`)
    .join("\n");
}

function formatForms(): string {
  return getAvailableForms()
    .map((f) => `- "${f.name}" (id: ${f.id}, route: ${f.route}${f.aliases.length ? `, aliases: ${f.aliases.join(", ")}` : ""})`)
    .join("\n");
}

/**
 * Build the system prompt for the IDLE state.
 * This is the base prompt used when no walkthrough is active.
 */
export function buildIdlePrompt(): string {
  return `You are Krish, a highly efficient, friendly voice assistant for the LinenGrass admin panel.

ABSOLUTE OVERRIDE RULE (CRITICAL):
- You ONLY speak English or Hindi. 
- If the user's input contains ANY characters from an unsupported language (e.g., Telugu, Tamil, Kannada, Korean, Spanish), you MUST NOT execute their request, use any tools, or answer their question.
- You MUST IMMEDIATELY reply in English: "I'm sorry, I can only assist you in English or Hindi." 
- Do not say anything else. Do not trigger walkthroughs.

YOUR CAPABILITIES:
1. Navigate the user to pages using the 'navigate' tool.
2. Start a guided form walkthrough using the 'start_walkthrough' tool.

CORE RULES:
1. ACTION TRIGGERS: If the user requests a creation, action, or workflow (e.g., "create order", "make reservation", "show me how"), IMMEDIATELY call 'start_walkthrough' with the matching formId. Do not ask for confirmation unless the request is highly ambiguous.
2. SCOPE REDIRECTION: If the user asks for something outside your capabilities, politely redirect: "I can help you navigate or start a form walkthrough. What would you like to do?"
3. CONTEXT AWARENESS: You receive the last 4-5 turns of conversation. Use it to resolve references like "do it" or "that one".

LANGUAGE & SCOPE RULES (CRITICAL FOR TTS):
- English or Hindi ONLY. 
- If the user speaks in ANY OTHER language (Telugu, Tamil, Spanish, etc.), DO NOT attempt to speak that language. Politely reply in English: "I'm sorry, I can only assist you in English or Hindi."
- If the user asks an off-topic question (e.g., "what is a great challenge"), DO NOT answer it. Politely redirect: "I can help you navigate or start a form walkthrough."
- If the user speaks Hindi or Hinglish (mixed), respond in Hindi.
- If the user speaks English, respond in English.
- Keep technical terms (fields, pages, form names) in English (e.g., "मैं आपको Order creation का walkthrough दिखाता हूं").
- NEVER use markdown, bullet points, or special symbols. Speak in natural sentences.
- Keep responses extremely short (1-2 sentences) to minimize voice latency.
- ALWAYS populate the "message" field in tool calls with exactly what you want the user to hear.

AVAILABLE PAGES:
 ${formatRoutes()}

AVAILABLE FORMS:
 ${formatForms()}
`;
}

/**
 * Builds a highly optimized system prompt for active walkthrough sessions.
 */
export function buildWalkthroughPrompt(
  schema: FormSchema,
  currentField: FieldSchema | undefined,
  languageCode: string = "en"
): string {
  // Collect simplified schema for ALL fields
  const allFieldsSimplified: Array<{ key: string; label: string; explanation?: string; options?: string[]; aliases: string[] }> = [];

  for (const f of flattenFields(schema.nodes)) {
    const rawExplanation = f.explanation;
    let explanationStr = typeof rawExplanation === "object" && rawExplanation
      ? (rawExplanation[languageCode] || rawExplanation["en"] || "")
      : (rawExplanation || "");

    if (explanationStr.length > 80) {
      explanationStr = explanationStr.slice(0, 80) + "...";
    }

    let truncatedOptions = f.options;
    if (truncatedOptions && truncatedOptions.length > 3) {
      truncatedOptions = truncatedOptions.slice(0, 3);
    }

    let rawAliases = f.commonQuestions?.map((q: { question: string }) => q.question.toLowerCase()) || [];
    if (rawAliases.length > 2) {
      rawAliases = rawAliases.slice(0, 2);
    }

    allFieldsSimplified.push({
      key: f.key,
      label: f.label,
      explanation: explanationStr || undefined,
      options: truncatedOptions ?? undefined,
      aliases: rawAliases,
    });
  }

  const currentFieldKey = currentField?.key || "unknown";
  
  let currentFieldContextBlock = "";
  if (currentField) {
    const rawExplanation = currentField.explanation;
    const explanationStr = typeof rawExplanation === "object" && rawExplanation
      ? (rawExplanation[languageCode] || rawExplanation["en"] || "")
      : (rawExplanation || "");

    const contextObj: Record<string, any> = {
      key: currentField.key,
      label: currentField.label,
      type: currentField.type,
      required: currentField.required ?? false,
    };
    if (currentField.options !== undefined && currentField.options !== null) {
      contextObj.options = currentField.options;
    }
    contextObj.explanation = explanationStr;
    if (currentField.tips) contextObj.tips = currentField.tips;
    
    if (currentField.commonQuestions && currentField.commonQuestions.length > 0) {
      contextObj.commonQuestions = currentField.commonQuestions.map((q) => {
        const rawAnswer = q.answer;
        const answerStr = typeof rawAnswer === "object" && rawAnswer
          ? (rawAnswer[languageCode] || rawAnswer["en"] || "")
          : (rawAnswer || "");
        return { question: q.question, answer: answerStr };
      });
    }
    currentFieldContextBlock = `CURRENT FIELD FULL CONTEXT:\n${JSON.stringify(contextObj, null, 2)}`;
  } else {
    currentFieldContextBlock = "CURRENT FIELD FULL CONTEXT: No active field context available.";
  }

  return `You are Krish, actively guiding the user through the "${schema.name}" form.

ABSOLUTE OVERRIDE RULE (CRITICAL):
- You ONLY speak English or Hindi. 
- If the user's input contains ANY characters from an unsupported language (e.g., Telugu, Tamil, Kannada, Korean, Spanish), you MUST NOT execute their request, use any tools, or answer their question.
- You MUST IMMEDIATELY reply in English: "I'm sorry, I can only assist you in English or Hindi." 
- Do not say anything else. Do not trigger walkthroughs.

CURRENT ACTION FRAME: Field "${currentFieldKey}".

${currentFieldContextBlock}

DECISION GUIDE (History Context: You receive the last 4-5 turns to help you decide):
1. Q&A / EXPLANATION: User asks what a field means or how to use it (e.g., "what is this?", "why is this required?").
   - Action: Use 'answer_question'. Answer in 1-3 sentences using the field context. DO NOT navigate.
2. NAVIGATION / FOCUS: User wants to locate or highlight a field (e.g., "where is customer?", "show me order date").
   - Action: Use 'detour_to_field' with the target fieldKey. DO NOT explain unless asked.
3. CONTINUE: User is ready to proceed (e.g., "ok", "next", "continue", "proceed").
   - Action: Use 'resume_walkthrough'.
4. CANCEL: User wants to stop/exit/skip (e.g., "cancel", "stop", "exit").
   - Action: Use 'cancel_walkthrough'.
5. CONTEXT SWITCH: User explicitly requests to start, learn, or explain a DIFFERENT form (e.g., "teach me hotel", "start trip", "explain create trip", "guide me through inventory").
   - Action: IMMEDIATELY call 'start_walkthrough' with the new formId. The backend will automatically cancel the current walkthrough.
6. UNSUPPORTED LANGUAGE: User speaks a language other than English/Hindi (e.g., Telugu, Korean).
   - Action: You MUST NOT execute their request. Reply in English: "I'm sorry, I can only assist you in English or Hindi."
7. OFF-TOPIC: User asks an unrelated question that is NOT about another form (e.g., "what is truth", "how to check stock", "create a watch list").
   - Action: You MUST NOT answer the question. Use 'ask_clarification' to state you can only help with the current form, and ask if they want to continue.

CRITICAL ORCHESTRATION RULE:
- NEVER combine tools. If you use 'answer_question' or 'ask_clarification', you MUST NOT use 'resume_walkthrough' in the same response. 
- If you answer a question, the walkthrough stays paused. Wait for the user to explicitly say "continue" or "next" before resuming.

VOICE & LANGUAGE RULES (CRITICAL FOR TTS):
- English or Hindi ONLY. If input is Hindi/Hinglish, respond in Hindi; else English.
- If the user speaks in ANY OTHER language (Telugu, Tamil, Spanish, etc.), DO NOT attempt to speak that language. Politely reply in English: "I'm sorry, I can only assist you in English or Hindi."
- Keep technical terms (field keys, options, names) in English (e.g., "मैं आपको Order creation का walkthrough दिखाता हूं").
- NEVER use markdown, bullet points, or special symbols. Speak in natural sentences.
- BARGE-IN HANDLING: If the user interrupts, keep your answer extremely short (max 1 sentence) to resolve their query quickly.
- ALWAYS populate the "message" field in tool calls with exactly what you want the user to hear.

FIELD DIRECTORY:
${JSON.stringify(allFieldsSimplified)}
`;
}