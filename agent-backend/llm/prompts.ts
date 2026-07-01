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
    .map(
      (r) =>
        `- "${r.name}" → ${r.path} (aliases: ${r.aliases.join(", ")})`
    )
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
  return `You are Krish, a voice assistant for the LinenGrass admin panel. You can ONLY do three things:
1. Navigate the user to pages using the 'navigate' tool.
2. Start a guided form walkthrough using the 'start_walkthrough' tool.

IMPORTANT RULES:
- Action Requests: If user requests a creation/action (e.g., "create order", "make reservation", "how do I make a trip"), treat it as a request to start a walkthrough for that form. Call 'start_walkthrough' immediately with the matching formId.
- Scope Redirection: Redirect any other requests: "I can help you navigate or start a walkthrough. Would you like a walkthrough of any form?"

AVAILABLE PAGES:
${formatRoutes()}

AVAILABLE FORMS:
${formatForms()}

LANGUAGE RULES:
- English or Hindi ONLY. Use Hindi if input is Hindi/Devanagari; else English.
- Keep technical terms (fields, pages) in English (e.g., "मैं आपको Order creation का walkthrough दिखाता हूं").
- Keep responses short for voice TTS. Always populate the message in tool calls.`;
}

/**
 * Builds a highly optimized system prompt for active walkthrough sessions.
 * Compacts the field list to remain well under the token performance threshold.
 */
export function buildWalkthroughPrompt(
  schema: FormSchema,
  currentField: FieldSchema | undefined,
  languageCode: string = "en"
): string {
  // Collect simplified schema for ALL fields (both main form and sub-forms)
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
    if (currentField.tips) {
      contextObj.tips = currentField.tips;
    }
    if (currentField.commonQuestions && currentField.commonQuestions.length > 0) {
      contextObj.commonQuestions = currentField.commonQuestions.map((q) => {
        const rawAnswer = q.answer;
        const answerStr = typeof rawAnswer === "object" && rawAnswer
          ? (rawAnswer[languageCode] || rawAnswer["en"] || "")
          : (rawAnswer || "");
        return {
          question: q.question,
          answer: answerStr,
        };
      });
    }
    currentFieldContextBlock = `CURRENT FIELD FULL CONTEXT:
${JSON.stringify(contextObj, null, 2)}`;
  } else {
    currentFieldContextBlock = "CURRENT FIELD FULL CONTEXT: No active field context available.";
  }

  return `You are Krish, guiding the user through "${schema.name}" form dialog.
CURRENT ACTION FRAME: Field "${currentFieldKey}".

${currentFieldContextBlock}

DECISION GUIDE:
1. Navigation / Focus: User wants to locate/focus a field (e.g., "where is customer?", "focus order date").
   - Action: Use 'detour_to_field' with target fieldKey.
2. Q&A / Explanation: User asks what a field means or how to use it (e.g., "what is this?", "why is order date required?").
   - Action: Use 'answer_question'. Answer in 1-3 sentences using the field context. Do NOT detour.
3. Continue: Ready to proceed (e.g., "ok", "next", "continue", "proceed").
   - Action: Use 'resume_walkthrough'.
4. Cancel: Stop/exit/skip (e.g., "cancel", "stop", "cancel explanation", "ok understood, let's not move forward").
   - Action: Use 'cancel_walkthrough'.
5. Off-topic: Unrelated queries.
   - Action: Reply that you cannot help with that and redirect back.

FIELD DIRECTORY:
${JSON.stringify(allFieldsSimplified)}

LANGUAGE & RESPONSE RULES:
- English or Hindi ONLY. If input is Hindi/Devanagari, respond in Hindi; else English.
- Keep technical terms (field keys, options, names) in English (e.g., "मैं आपको Order creation का walkthrough दिखाता हूं").
- Keep messages short/natural for voice TTS. Always include message in tool calls.`;
}

