import type { VoiceMessage, HandlerContext } from "../types.js";
import { orchestrate } from "../../llm/orchestrator.js";
import { walkthroughDriver } from "../walkthrough/driver.js";
import * as sttService from "./sttService.js";
import * as ttsService from "./ttsService.js";
import * as responseSender from "./responseSender.js";

export async function handleVoiceMessage(
  message: VoiceMessage,
  context: HandlerContext
): Promise<void> {
  const { sessionId, send } = context;

  // Test command fast path
  if (message.text && message.text.startsWith("test:")) {
    const formId = message.text.slice(5).trim();
    walkthroughDriver.start(formId, sessionId, false);
    return;
  }

  // Text path for dev testing
  if (message.text && !message.audio) {
    await handleText(message.text, undefined, context);
    return;
  }

  // Audio path
  if (!message.audio) return;

  try {
    const stt = await sttService.transcribeAudio(message.audio);

    if (!stt.text) {
      const count = sttService.incrementRetry(sessionId);

      if (count <= sttService.getMaxRetries()) {
        responseSender.sendRespond(
          send,
          "I didn't catch that, could you repeat?",
          true
        );
      } else {
        sttService.resetRetry(sessionId);
      }
      return;
    }

    sttService.resetRetry(sessionId);

    // Echo what we heard for UI
    responseSender.sendRespond(send, `You said: "${stt.text}"`, false);

    await handleText(stt.text, stt.languageCode, context);
  } catch (error) {
    console.error("[VoiceHandler] STT error:", error);
    responseSender.sendRespond(
      send,
      "Sorry, I had trouble hearing you. Please try again.",
      true
    );
  }
}

async function handleText(
  text: string,
  languageCode: string | undefined,
  context: HandlerContext
): Promise<void> {
  const { send, sessionId } = context;
  const lang = languageCode || "en";

  const { toolCalls, rawContent } = await orchestrate(text, sessionId, languageCode);

  for (const tc of toolCalls) {
    switch (tc.name) {
      case "navigate": {
        responseSender.sendNavigate(send, tc.args);
        break;
      }
      case "start_walkthrough": {
        const msg = String(tc.args.message || "Starting walkthrough");
        const formId = String(tc.args.formId);
        await speakAndSend(send, msg, lang);
        walkthroughDriver.start(formId, context.sessionId);
        break;
      }
      case "answer_question": {
        await speakAndSend(send, String(tc.args.response), lang);
        break;
      }
      case "detour_to_field": {
        const session = walkthroughDriver.getSession(sessionId);
        if (session) {
          session.stateMachine.transition("DETOUR");
          const targetFieldKey = String(tc.args.fieldKey);
          let matchedField = session.schema.fields.find(f => f.key === targetFieldKey);
          if (!matchedField) {
            for (const subForm of session.schema.subForms) {
              const f = subForm.fields.find(field => field.key === targetFieldKey);
              if (f) {
                matchedField = f;
                break;
              }
            }
          }

          // Move visual spotlight overlay on the client app immediately
          context.send({ type: "tool", tool: "detour_start", args: { fieldKey: targetFieldKey } });
          context.send({ type: "tool", tool: "go_to_field", args: { fieldKey: targetFieldKey, label: matchedField?.label } });

          const narrationText = matchedField?.explanation || "Let me highlight that field on your form.";
          await speakAndSend(send, narrationText, lang);
        }
        break;
      }
      case "resume_walkthrough": {
        await executeAutoResume(context);
        break;
      }
      case "ask_clarification": {
        await speakAndSend(send, String(tc.args.message), lang);
        break;
      }
    }
  }

  if (toolCalls.length === 0 && rawContent) {
    await speakAndSend(send, rawContent, lang);
  }
}

async function speakAndSend(
  send: HandlerContext["send"],
  text: string,
  languageCode: string
): Promise<void> {
  const messageId = responseSender.sendRespond(send, text, true);

  try {
    const base64 = await ttsService.synthesizeToBase64(text, languageCode);
    responseSender.sendTtsAudio(send, base64, messageId);
  } catch (e) {
    console.error("[VoiceHandler] TTS failed:", e);
  }
}

/**
 * Recovers execution states back down to original tracking coordinates seamlessly.
 */
export async function executeAutoResume(context: HandlerContext): Promise<void> {
  const session = walkthroughDriver.getSession(context.sessionId);
  if (session && session.stateMachine.currentState === "DETOUR_QA") {
    session.stateMachine.transition("DETOUR_COMPLETE");
    context.send({ type: "tool", tool: "detour_end", args: {} });

    const originalCtx = session.stateMachine.currentContext;
    let targetField = session.schema.fields[originalCtx.fieldIndex];

    if (originalCtx.subFormId) {
      const subForm = session.schema.subForms.find(sf => sf.id === originalCtx.subFormId);
      if (subForm) {
        targetField = subForm.fields[originalCtx.subFormFieldIndex];
        if (targetField) {
          context.send({
            type: "tool",
            tool: "go_to_field",
            args: {
              fieldKey: targetField.key,
              label: targetField.label,
              subFormId: originalCtx.subFormId,
              itemIndex: originalCtx.subFormItemIndex,
            },
          });
          await speakAndSend(context.send, `Returning to our walkthrough. Let's look at ${targetField.label}.`, "en");
          return;
        }
      }
    }

    if (targetField) {
      context.send({ type: "tool", tool: "go_to_field", args: { fieldKey: targetField.key, label: targetField.label } });
      await speakAndSend(context.send, `Returning to our walkthrough. Let's look at ${targetField.label}.`, "en");
    }
  }
}
