import { useEffect, useRef } from "react";
import { useAgent } from "./AgentBridge";
import * as filler from "./fieldFiller";

/**
 * WalkthroughHandler
 * Uses the fieldFiller engine to execute agent tool calls.
 */
export default function WalkthroughHandler() {
  const { pendingTool, sendMessage, clearPendingTool, addMessage } = useAgent();
  const lastToolIdRef = useRef(null);

  useEffect(() => {
    if (!pendingTool) return;

    // Deduplicate calls
    const toolId = JSON.stringify(pendingTool);
    if (toolId === lastToolIdRef.current) return;
    lastToolIdRef.current = toolId;

    const execute = async () => {
      const { type, args } = pendingTool;
      console.log(`[WalkthroughHandler] Executing: ${type}`, args);

      try {
        switch (type) {
          case "open_dialog": {
            const { selector, fallbackText } = args;
            let result = { success: false, reason: "No trigger found" };

            // Try selector first
            if (selector) {
              const el = document.querySelector(selector);
              if (el) {
                el.click();
                result = { success: true };
              }
            }

            // Fallback to button text
            if (!result.success && fallbackText) {
              result = filler.clickButton(fallbackText);
            }

            if (result.success) {
              await new Promise((r) => setTimeout(r, 1000)); // Wait for animation
              sendMessage({ type: "status", event: "dialog_opened" });
            } else {
              throw new Error(result.reason || `Trigger not found: ${selector || fallbackText}`);
            }
            break;
          }

          case "close_dialog": {
            sendMessage({ type: "status", event: "dialog_closed" });
            await new Promise(r => setTimeout(r, 200));
            filler.closeDialog();
            break;
          }

          case "go_to_field": {
            const element = filler.findField(
              args.fieldKey,
              args.label,
              args.subFormId,
              args.itemIndex
            );
            if (element) {
              // Remove previous spotlight
              document
                .querySelectorAll(".agent-spotlight")
                .forEach((el) => el.classList.remove("agent-spotlight"));
              // Add spotlight
              element.classList.add("agent-spotlight");
              sendMessage({ type: "status", event: "field_reached", fieldKey: args.fieldKey });
            } else {
              throw new Error(`Field not found: ${args.fieldKey || args.label}`);
            }
            break;
          }

          case "fill_field": {
            let result;
            if (args.type === "autocomplete") {
              result = await filler.fillAutocompleteField(
                args.fieldKey,
                args.label,
                args.value,
                args.subFormId,
                args.itemIndex
              );
            } else {
              result = await filler.fillField(
                args.fieldKey,
                args.label,
                args.type,
                args.value,
                args.subFormId,
                args.itemIndex
              );
            }

            if (result.success) {
              sendMessage({
                type: "status",
                event: "field_filled",
                fieldKey: args.fieldKey,
                value: args.value,
              });
            } else {
              throw new Error(result.reason);
            }
            break;
          }

          case "click_checkbox": {
            const result = filler.clickCheckbox(args.labelText);
            if (result.success) {
              sendMessage({ type: "status", event: "checkbox_clicked" });
            } else {
              throw new Error(result.reason);
            }
            break;
          }

          case "add_item": {
            const result = filler.clickButton(args.triggerText);
            if (result.success) {
              await new Promise((r) => setTimeout(r, 500));
              sendMessage({ type: "status", event: "item_added" });
            } else {
              throw new Error(result.reason);
            }
            break;
          }

          case "clear_all_fields": {
            filler.clearAllFields();
            // Remove spotlight
            document
              .querySelectorAll(".agent-spotlight")
              .forEach((el) => el.classList.remove("agent-spotlight"));
            sendMessage({ type: "status", event: "fields_cleared" });
            break;
          }

          case "explain_field": {
            if (args.text) {
              addMessage("agent", args.text);
            }
            // explain_field doesn't expect a status back usually, 
            // but the driver waits for it if we don't handle it.
            // Actually, the driver uses null for status in sendTool for explain_field.
            break;
          }

          default:
            break;
        }
      } catch (err) {
        console.error(`[WalkthroughHandler] Error executing ${type}:`, err);
        sendMessage({
          type: "status",
          event: "error",
          tool: type,
          reason: err.message,
        });
      } finally {
        clearPendingTool();
      }
    };

    execute();
  }, [pendingTool, sendMessage, clearPendingTool, addMessage]);

  return null;
}
