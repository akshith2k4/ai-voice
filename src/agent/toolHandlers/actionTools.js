import { registerTool } from "../toolRegistry";
import { TOOL_TYPES, STATUS_EVENTS, TIMING } from "../protocol";
import * as filler from "../fieldFiller/index";
import { agentFormRegistry } from "../agentFormRegistry";
import { sendStatus, sendError } from "../wsConnection";
import { wait } from "../utils";
import { CursorManager } from "../CursorManager";

registerTool(TOOL_TYPES.OPEN_DIALOG, async (args, { send, formId }) => {
  let success = false;

  if (args.selector) {
    const el = document.querySelector(args.selector);
    if (el) {
      await CursorManager.animateToAndClick(el);
      el.click();
      success = true;
    }
  }

  if (!success && args.fallbackText) {
    const result = await filler.clickButton(args.fallbackText);
    success = result.success;
  }

  if (success) {
    await wait(TIMING.DIALOG_ANIMATION_MS); // dialog animation

    // Poll for registry registration
    if (formId) {
      const regStart = Date.now();
      while (!agentFormRegistry.has(formId) && Date.now() - regStart < TIMING.BUTTON_TIMEOUT_MS) {
        await wait(TIMING.POLL_INTERVAL_MS);
      }
      if (agentFormRegistry.has(formId)) {
        console.log(`[WalkthroughHandler] Form registered: ${formId}`);
      } else {
        console.warn(`[WalkthroughHandler] Form not registered after 3s: ${formId} — using DOM fallback`);
      }
    }

    sendStatus(STATUS_EVENTS.DIALOG_OPENED);
  } else {
    sendError(TOOL_TYPES.OPEN_DIALOG, `Trigger not found: ${args.selector || args.fallbackText}`);
  }
});

registerTool(TOOL_TYPES.CLOSE_DIALOG, async (args, { send }) => {
  sendStatus(STATUS_EVENTS.DIALOG_CLOSED);
  await wait(TIMING.POLL_INTERVAL_MS);
  await filler.closeDialog();
});

registerTool(TOOL_TYPES.SELECT_ITEM, async (args, { send }) => {
  let success = false;

  if (args.selector) {
    const el = document.querySelector(args.selector);
    if (el) {
      await CursorManager.animateToAndClick(el);
      el.click();
      success = true;
    }
  }

  if (!success && args.label) {
    const rows = document.querySelectorAll("tr, [role='row'], [data-agent-row]");
    for (const row of rows) {
      if (row.textContent && row.textContent.includes(args.label)) {
        await CursorManager.animateToAndClick(row);
        row.click();
        success = true;
        break;
      }
    }
  }

  if (success) {
    await wait(800); // Let sidebar/drawer open (Wait for render)
    sendStatus(STATUS_EVENTS.ITEM_SELECTED);
  } else {
    sendError(TOOL_TYPES.SELECT_ITEM, `Item not found: ${args.label || args.selector}`);
  }
});

registerTool(TOOL_TYPES.CLICK_ELEMENT, async (args, { send }) => {
  let clicked = false;

  if (args.selector) {
    const el = document.querySelector(args.selector);
    if (el) {
      await CursorManager.animateToAndClick(el);
      el.click();
      clicked = true;
    }
  }

  if (!clicked && args.fallbackText) {
    const result = await filler.clickButton(args.fallbackText);
    clicked = result.success;
  }

  if (clicked) {
    await wait(TIMING.FIELD_RENDER_MS);
    sendStatus(STATUS_EVENTS.ELEMENT_CLICKED);
  } else {
    sendError(TOOL_TYPES.CLICK_ELEMENT, `Element not found: ${args.selector || args.fallbackText}`);
  }
});

registerTool(TOOL_TYPES.ADD_ITEM, async (args, { send, formId }) => {
  if (formId && agentFormRegistry.has(formId)) {
    const { addRegistryItem } = await import("../formExecutor");
    const result = await addRegistryItem(formId, args.subFormId);
    if (!result.success) {
      sendError(TOOL_TYPES.ADD_ITEM, result.reason);
      return;
    }
  } else {
    const result = await filler.clickButton(args.triggerText);
    if (!result.success) {
      sendError(TOOL_TYPES.ADD_ITEM, result.reason);
      return;
    }
  }

  await wait(TIMING.FIELD_RENDER_MS); // wait for new fields to render
  sendStatus(STATUS_EVENTS.ITEM_ADDED);
});

registerTool(TOOL_TYPES.CLICK_CHECKBOX, async (args, { send }) => {
  const result = await filler.clickCheckbox(args.labelText);
  if (result.success) {
    sendStatus(STATUS_EVENTS.CHECKBOX_CLICKED);
  } else {
    sendError(TOOL_TYPES.CLICK_CHECKBOX, result.reason);
  }
});
