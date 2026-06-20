// ToolDispatcher — routes each LLM tool call to the right handler.
// Uses WorkflowResolver to get content, Responder to deliver it.
// Has no knowledge of voice format, TTS, or WebSocket protocol.

import type { LLMToolCall } from "../services/interfaces.js";
import type { IResponder } from "../adapters/responders/IResponder.js";
import * as responseSender from "../services/responseSender.js";
import { logLatency, getLatency } from "../services/latencyTracker.js";
import { walkthroughExecutor } from "../walkthrough/executor.js";
import { connectionManager } from "../connectionManager.js";

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
        // Send navigate directly to frontend — no speech needed
        const send = (msg: any) => connectionManager.send(sessionId, msg);
        responseSender.sendNavigate(send, tc.args);
        if (!hadTextResponse) logLatency("Navigate (no speech)");
        break;
      }

      case "start_walkthrough": {
        await walkthroughExecutor.start(
          String(tc.args.formId),
          sessionId,
          responder,
          true,
          lang,
          hadTextResponse ? undefined : (tc.args.message ? String(tc.args.message) : undefined)
        );
        break;
      }

      case "answer_question": {
        if (!hadTextResponse) {
          await responder.speakAndWait(String(tc.args.response));
        }
        break;
      }

      case "ask_clarification": {
        if (!hadTextResponse) {
          await responder.speakAndWait(String(tc.args.message));
        }
        break;
      }

      case "detour_to_field":
        walkthroughExecutor.detour(String(tc.args.fieldKey), sessionId, responder, hadTextResponse);
        break;

      case "resume_walkthrough":
        walkthroughExecutor.resumeWalkthrough(sessionId);
        break;
    }
  }
}

export const toolDispatcher = new ToolDispatcher();
