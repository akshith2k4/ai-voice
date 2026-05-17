// ============================================
// WalkthroughHandler (v2 — registry-first)
// Processes tool calls from the agent backend.
// Uses form registry when available, falls back
// to DOM manipulation for unregistered forms.
// ============================================

import { useEffect, useRef } from "react";
import { useAgent } from "./AgentBridge";
import { agentFormRegistry } from "./agentFormRegistry";
import * as filler from "./fieldFiller";

const SPOTLIGHT_CLASS = "agent-spotlight";

export default function WalkthroughHandler() {
  const { pendingTool, sendMessage, clearPendingTool, addMessage } = useAgent();

  // Stable refs — always current, never stale in async closures
  const sendRef = useRef(sendMessage);
  const addRef = useRef(addMessage);
  sendRef.current = sendMessage;
  addRef.current = addMessage;

  // Tool queue — prevents lost tools when two arrive in the same tick
  const queueRef = useRef([]);
  const executingRef = useRef(false);
  const lastEnqueuedRef = useRef(null);

  // Active form tracking
  const activeFormIdRef = useRef(null);

  // ---- Enqueue incoming tools ----
  useEffect(() => {
    if (!pendingTool) return;

    // Deduplicate (React can re-fire effect with same value)
    const toolId = JSON.stringify(pendingTool);
    if (toolId === lastEnqueuedRef.current) return;
    lastEnqueuedRef.current = toolId;

    queueRef.current.push(pendingTool);
    clearPendingTool();
    drain();
  }, [pendingTool, clearPendingTool]);

  function drain() {
    if (executingRef.current || queueRef.current.length === 0) return;
    executingRef.current = true;

    const tool = queueRef.current.shift();
    execute(tool)
      .catch((err) => console.error("[WalkthroughHandler] Uncaught:", err))
      .finally(() => {
        executingRef.current = false;
        if (queueRef.current.length > 0) drain();
      });
  }

  // ---- Execute a single tool ----
  async function execute(tool) {
    const { type, args } = tool;
    const send = sendRef.current;
    const add = addRef.current;
    const formId = activeFormIdRef.current;

    switch (type) {
      // ---- Walkthrough lifecycle ----

      case "begin_walkthrough": {
        activeFormIdRef.current = args.formId;
        console.log(`[WalkthroughHandler] Walkthrough started: ${args.formId}`);
        break;
      }

      // ---- Dialog management ----

      case "open_dialog": {
        let success = false;

        if (args.selector) {
          const el = document.querySelector(args.selector);
          if (el) {
            el.click();
            success = true;
          }
        }

        if (!success && args.fallbackText) {
          const result = await filler.clickButton(args.fallbackText);
          success = result.success;
        }

        if (success) {
          await wait(1000); // dialog animation

          // Poll for registry registration (form component needs time to mount)
          const targetFormId = activeFormIdRef.current;
          if (targetFormId) {
            const regStart = Date.now();
            while (!agentFormRegistry.has(targetFormId) && Date.now() - regStart < 3000) {
              await wait(200);
            }
            if (agentFormRegistry.has(targetFormId)) {
              console.log(`[WalkthroughHandler] Form registered: ${targetFormId}`);
            } else {
              console.warn(`[WalkthroughHandler] Form not registered after 3s: ${targetFormId} — using DOM fallback`);
            }
          }

          send({ type: "status", event: "dialog_opened" });
        } else {
          send({
            type: "status",
            event: "error",
            tool: "open_dialog",
            reason: `Trigger not found: ${args.selector || args.fallbackText}`,
          });
        }
        break;
      }

      case "close_dialog": {
        send({ type: "status", event: "dialog_closed" });
        await wait(200);
        filler.closeDialog();
        break;
      }

      // ---- Item selection (e.g. click a hotel row) ----

      case "select_item": {
        let success = false;

        // Try CSS selector first
        if (args.selector) {
          const el = document.querySelector(args.selector);
          if (el) {
            el.click();
            success = true;
          }
        }

        // Fallback: find a row/element containing the label text
        if (!success && args.label) {
          const rows = document.querySelectorAll("tr, [role='row'], [data-agent-row]");
          for (const row of rows) {
            if (row.textContent && row.textContent.includes(args.label)) {
              row.click();
              success = true;
              break;
            }
          }
        }

        if (success) {
          await wait(800); // Let sidebar/drawer open
          send({ type: "status", event: "item_selected" });
        } else {
          send({
            type: "status",
            event: "error",
            tool: "select_item",
            reason: `Item not found: ${args.label || args.selector}`,
          });
        }
        break;
      }

      case "click_element": {
        let clicked = false;

        if (args.selector) {
          const el = document.querySelector(args.selector);
          if (el) {
            el.click();
            clicked = true;
          }
        }

        if (!clicked && args.fallbackText) {
          const result = await filler.clickButton(args.fallbackText);
          clicked = result.success;
        }

        if (clicked) {
          await wait(500);
          send({ type: "status", event: "element_clicked" });
        } else {
          send({
            type: "status",
            event: "error",
            tool: "click_element",
            reason: `Element not found: ${args.selector || args.fallbackText}`,
          });
        }
        break;
      }

      // ---- Field navigation + spotlight ----

      case "go_to_field": {
        let element = null;

        // Registry: get element from form's refs (reliable)
        if (formId && agentFormRegistry.has(formId)) {
          element = agentFormRegistry.getFieldElement(
            formId,
            args.fieldKey,
            args.itemIndex
          );
        }

        // Fallback: find by label in DOM (works for unregistered forms)
        if (!element) {
          element = filler.findField(
            args.fieldKey,
            args.label,
            args.subFormId,
            args.itemIndex
          );
        }

        if (element) {
          // Spotlight: remove previous, add to current
          document
            .querySelectorAll(`.${SPOTLIGHT_CLASS}`)
            .forEach((el) => el.classList.remove(SPOTLIGHT_CLASS));
          element.classList.add(SPOTLIGHT_CLASS);
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }

        // Always report reached for registry forms, even if we could not spotlight
        if (formId && agentFormRegistry.has(formId)) {
          send({
            type: "status",
            event: "field_reached",
            fieldKey: args.fieldKey,
          });
        } else if (element) {
          send({
            type: "status",
            event: "field_reached",
            fieldKey: args.fieldKey,
          });
        } else {
          send({
            type: "status",
            event: "error",
            tool: "go_to_field",
            reason: `Field not found: ${args.fieldKey || args.label}`,
          });
        }
        break;
      }

      // ---- Field filling ----

      case "fill_field": {
        const { fieldKey, label, type, value, subFormId, itemIndex } = args;

        try {
          if (formId && agentFormRegistry.has(formId)) {
            await fillViaRegistry(formId, fieldKey, type, value, itemIndex, send);
          } else {
            await fillViaDOM(fieldKey, label, type, value, subFormId, itemIndex);
          }

          send({
            type: "status",
            event: "field_filled",
            fieldKey,
            value,
          });
        } catch (err) {
          console.error(`[WalkthroughHandler] fill_field failed: ${fieldKey}`, err.message);
          send({
            type: "status",
            event: "error",
            tool: "fill_field",
            fieldKey,
            reason: err.message,
          });
        }
        break;
      }

      // ---- Sub-form actions ----

      case "add_item": {
        if (formId && agentFormRegistry.has(formId)) {
          const result = await agentFormRegistry.addItem(formId, args.subFormId);
          if (!result.success) {
            send({
              type: "status",
              event: "error",
              tool: "add_item",
              reason: result.reason,
            });
            break;
          }
        } else {
          const result = await filler.clickButton(args.triggerText);
          if (!result.success) {
            send({
              type: "status",
              event: "error",
              tool: "add_item",
              reason: result.reason,
            });
            break;
          }
        }

        await wait(500); // wait for new fields to render
        send({ type: "status", event: "item_added" });
        break;
      }

      case "click_checkbox": {
        const result = filler.clickCheckbox(args.labelText);
        if (result.success) {
          send({ type: "status", event: "checkbox_clicked" });
        } else {
          send({
            type: "status",
            event: "error",
            tool: "click_checkbox",
            reason: result.reason,
          });
        }
        break;
      }

      // ---- Cleanup ----

      case "clear_all_fields": {
        if (formId && agentFormRegistry.has(formId)) {
          await agentFormRegistry.clearForm(formId);
        } else {
          filler.clearAllFields();
        }

        document
          .querySelectorAll(`.${SPOTLIGHT_CLASS}`)
          .forEach((el) => el.classList.remove(SPOTLIGHT_CLASS));

        send({ type: "status", event: "fields_cleared" });
        break;
      }

      // ---- Text display ----

      case "explain_field": {
        if (args.text) {
          add("agent", args.text);
        }
        break;
      }

      default:
        console.log(`[WalkthroughHandler] Unhandled tool: ${type}`, args);
    }
  }

  // ---- Fill via registry (clean path) ----
  async function fillViaRegistry(formId, fieldKey, type, value, itemIndex, send) {
    if (type === "autocomplete") {
      // 1. Trigger the form's own search function
      agentFormRegistry.searchField(formId, fieldKey, value);

      // 2. Poll until options appear
      const match = await agentFormRegistry.waitForOption(formId, fieldKey, value);
      if (!match) {
        throw new Error(`No autocomplete results for: ${value}`);
      }

      // 3. Set the value using the form's own setter
      const result = await agentFormRegistry.fillField(
        formId,
        fieldKey,
        match,
        itemIndex
      );
      if (!result.success) throw new Error(result.reason);
    } else {
      const result = await agentFormRegistry.fillField(
        formId,
        fieldKey,
        value,
        itemIndex
      );
      if (!result.success) throw new Error(result.reason);
    }
  }

  // ---- Fill via DOM (fallback for unregistered forms) ----
  async function fillViaDOM(fieldKey, label, type, value, subFormId, itemIndex) {
    let result;

    if (type === "autocomplete") {
      result = await filler.fillAutocompleteField(
        fieldKey,
        label,
        value,
        subFormId,
        itemIndex
      );
    } else {
      result = await filler.fillField(
        fieldKey,
        label,
        type,
        value,
        subFormId,
        itemIndex
      );
    }

    if (!result.success) throw new Error(result.reason);
  }

  return null;
}

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
