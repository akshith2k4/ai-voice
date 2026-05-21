import type { HandlerContext, StatusMessage } from "../types.js";
import { executeAutoResume } from "../services/voicePipeline.js";


// ============================================
// Status Handler
// Handles frontend status messages
// ============================================

export function handleStatus(
  message: StatusMessage,
  context: HandlerContext
): void {
  const { event, fieldKey, value, reason } = message;

  console.log(
    `[StatusHandler] ${event}` +
      (fieldKey ? ` | field: ${fieldKey}` : "") +
      (value ? ` | value: ${value}` : "") +
      (reason ? ` | reason: ${reason}` : "") +
      ` | from: ${context.sessionId}`
  );

  switch (event) {
    case "resume_walkthrough":
      console.log(
        `[StatusHandler] Resuming walkthrough for ${context.sessionId}`
      );
      executeAutoResume(context).catch((err) => {
        console.error("[StatusHandler] Failed to auto-resume:", err);
      });
      break;

    case "tts_playback_complete":
      console.log(
        `[StatusHandler] TTS playback complete for ${context.sessionId}`
      );
      // In later slices, this will trigger the next walkthrough step
      break;

    case "navigation_complete":
      // handled by walkthrough driver — just log
      console.log(
        `[StatusHandler] Navigation complete for ${context.sessionId}`
      );
      break;

    case "field_reached":
    case "field_filled":
    case "dialog_opened":
    case "dialog_closed":
    case "fields_cleared":
    case "checkbox_clicked":
    case "item_added":
    case "form_registered":
    case "walkthrough_begun":
    case "explain_complete":
      // Acknowledge — will be used by walkthrough driver in later slices
      break;

    case "dialog_closed_by_user":
      console.log(
        `[StatusHandler] User closed dialog for ${context.sessionId}`
      );
      // Will trigger CANCELLED state in later slices
      break;

    case "page_changed":
      console.log(
        `[StatusHandler] User navigated to ${message.newRoute} for ${context.sessionId}`
      );
      // Will trigger CANCELLED state in later slices
      break;

    case "error":
      console.error(
        `[StatusHandler] Frontend error: ${reason} (tool: ${message.tool}) for ${context.sessionId}`
      );
      break;

    default:
      console.log(`[StatusHandler] Unknown event: ${event}`);
  }

  // Always acknowledge
  context.send({
    type: "status_ack",
    event,
  });
}
