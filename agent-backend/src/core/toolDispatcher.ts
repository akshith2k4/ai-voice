// ToolDispatcher — routes each LLM tool call to the right handler.
// Uses WorkflowResolver to get content, Responder to deliver it.
// Has no knowledge of voice format, TTS, or WebSocket protocol.

import type { LLMToolCall } from "../services/interfaces.js";
import type { IResponder } from "../adapters/responders/IResponder.js";
import * as responseSender from "../services/responseSender.js";
import { logLatency, getLatency, getUserName, getTurnId } from "../services/latencyTracker.js";
import { walkthroughExecutor } from "../walkthrough/executor.js";
import { connectionManager } from "../connectionManager.js";
import { db, sessions, ensureSessionExists, turns } from "../services/db.js";
import { fireAndForget } from "../services/observability.js";
import { eq } from "drizzle-orm";

class ToolDispatcher {
  async dispatch(
    toolCalls: LLMToolCall[],
    sessionId: string,
    lang: string,
    responder: IResponder,
    hadTextResponse: boolean
  ): Promise<void> {
    for (const tc of toolCalls) {
      await this.dispatchOne(tc, sessionId, lang, responder, hadTextResponse);
    }
  }

  private async dispatchOne(
    tc: LLMToolCall,
    sessionId: string,
    lang: string,
    responder: IResponder,
    hadTextResponse: boolean
  ): Promise<void> {
    switch (tc.name) {
      case "navigate": {
        if (!tc.args || typeof tc.args.route !== "string") {
          console.warn("[ToolDispatcher] Invalid navigate arguments:", tc.args);
          break;
        }
        // Send navigate directly to frontend — no speech needed
        const send = (msg: any) => connectionManager.send(sessionId, msg);
        responseSender.sendNavigate(send, tc.args);
        if (!hadTextResponse) logLatency("Navigate (no speech)");
        break;
      }

      case "start_walkthrough": {
        if (!tc.args || typeof tc.args.formId !== "string" || !tc.args.formId) {
          console.warn("[ToolDispatcher] Invalid start_walkthrough arguments:", tc.args);
          await responder.speak("I couldn't start the walkthrough because the form was not specified.");
          break;
        }
        const formId = String(tc.args.formId);
        fireAndForget(
          ensureSessionExists(sessionId, formId, getUserName() || undefined)
        );
        await walkthroughExecutor.start(
          formId,
          sessionId,
          responder,
          true,
          lang,
          hadTextResponse ? undefined : (tc.args.message ? String(tc.args.message) : undefined)
        );
        break;
      }

      case "answer_question": {
        if (!tc.args || typeof tc.args.response !== "string" || !tc.args.response) {
          console.warn("[ToolDispatcher] Invalid answer_question arguments:", tc.args);
          break;
        }
        const responseText = String(tc.args.response);
        if (!hadTextResponse) {
          await responder.speakAndWait(responseText);
        } else {
          const msgId = (responder as any).getStreamMessageId?.() ?? crypto.randomUUID();
          responseSender.sendRespond((responder as any).send, responseText, false, msgId);
          const turnId = getTurnId();
          if (turnId) {
            fireAndForget(
              db.update(turns)
                .set({ agentTranscript: responseText })
                .where(eq(turns.id, turnId))
            );
          }
        }
        break;
      }

      case "ask_clarification": {
        if (!tc.args || typeof tc.args.message !== "string" || !tc.args.message) {
          console.warn("[ToolDispatcher] Invalid ask_clarification arguments:", tc.args);
          break;
        }
        const messageText = String(tc.args.message);
        if (!hadTextResponse) {
          await responder.speakAndWait(messageText);
        } else {
          const msgId = (responder as any).getStreamMessageId?.() ?? crypto.randomUUID();
          responseSender.sendRespond((responder as any).send, messageText, false, msgId);
          const turnId = getTurnId();
          if (turnId) {
            fireAndForget(
              db.update(turns)
                .set({ agentTranscript: messageText })
                .where(eq(turns.id, turnId))
            );
          }
        }
        break;
      }

      case "detour_to_field": {
        if (!tc.args || typeof tc.args.fieldKey !== "string" || !tc.args.fieldKey) {
          console.warn("[ToolDispatcher] Invalid detour_to_field arguments:", tc.args);
          break;
        }
        await walkthroughExecutor.detour(String(tc.args.fieldKey), sessionId, responder, hadTextResponse);
        break;
      }

      case "resume_walkthrough":
        walkthroughExecutor.resumeWalkthrough(sessionId);
        break;

      case "cancel_walkthrough": {
        walkthroughExecutor.cancel(sessionId);
        await responder.speak("Okay, I've cancelled the walkthrough.");
        break;
      }
    }
  }
}

export const toolDispatcher = new ToolDispatcher();
