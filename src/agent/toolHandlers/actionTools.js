import { registerTool } from "../toolRegistry";
import { TOOL_TYPES, STATUS_EVENTS } from "../protocol";
import * as filler from "../fieldFiller/index";
import { agentFormRegistry } from "../agentFormRegistry";
import { sendStatus, sendError } from "../wsConnection";

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

registerTool(TOOL_TYPES.OPEN_DIALOG, async (args, { send, formId }) => {
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

    // Poll for registry registration
    if (formId) {
      const regStart = Date.now();
      while (!agentFormRegistry.has(formId) && Date.now() - regStart < 3000) {
        await wait(200);
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
  await wait(200);
  filler.closeDialog();
});

registerTool(TOOL_TYPES.SELECT_ITEM, async (args, { send }) => {
  let success = false;

  if (args.selector) {
    const el = document.querySelector(args.selector);
    if (el) {
      el.click();
      success = true;
    }
  }

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

  await wait(500); // wait for new fields to render
  sendStatus(STATUS_EVENTS.ITEM_ADDED);
});

registerTool(TOOL_TYPES.CLICK_CHECKBOX, async (args, { send }) => {
  const result = filler.clickCheckbox(args.labelText);
  if (result.success) {
    sendStatus(STATUS_EVENTS.CHECKBOX_CLICKED);
  } else {
    sendError(TOOL_TYPES.CLICK_CHECKBOX, result.reason);
  }
});
