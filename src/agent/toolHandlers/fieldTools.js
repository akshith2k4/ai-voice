import { registerTool } from "../toolRegistry";
import { TOOL_TYPES, STATUS_EVENTS } from "../protocol";
import * as filler from "../fieldFiller/index";
import { agentFormRegistry } from "../agentFormRegistry";
import { fillRegistryField, findRegistryField } from "../formExecutor";
import { SpotlightManager } from "../SpotlightManager";
import { sendStatus, sendError } from "../wsConnection";
import { CursorManager } from "../CursorManager";

function getActiveContainer() {
  const dialogs = document.querySelectorAll(".MuiDialog-paper");
  if (dialogs.length > 0) {
    return dialogs[dialogs.length - 1]; // Top-most dialog
  }
  return document;
}

async function fillViaDOM(fieldKey, label, type, value, subFormId, itemIndex) {
  const container = getActiveContainer();
  if (type === "autocomplete") {
    const result = await filler.fillAutocompleteField(fieldKey, label, value, subFormId, itemIndex, container);
    if (!result.success) throw new Error(result.reason);
  } else {
    const result = await filler.fillField(fieldKey, label, type, value, subFormId, itemIndex, container);
    if (!result.success) throw new Error(result.reason);
  }
}

registerTool(TOOL_TYPES.GO_TO_FIELD, async (args, { send, formId }) => {
  let element = null;

  if (formId && agentFormRegistry.has(formId)) {
    try {
      const form = agentFormRegistry.get(formId);
      if (form) {
        const field = findRegistryField(form, args.fieldKey);
        if (field?.getElement) {
          element = field.getElement(args.itemIndex);
        }
      }
    } catch (e) {
      console.warn("[WalkthroughHandler] Registry findField failed, falling back to DOM search:", e);
    }
  }

  if (!element) {
    const container = getActiveContainer();
    element = filler.findField(args.fieldKey, args.label, args.subFormId, args.itemIndex, container);
  }

  if (element) {
    await CursorManager.animateToAndClick(element);
    SpotlightManager.setSpotlight(element);
  }

  if (formId && agentFormRegistry.has(formId)) {
    sendStatus(STATUS_EVENTS.FIELD_REACHED, { fieldKey: args.fieldKey });
  } else if (element) {
    sendStatus(STATUS_EVENTS.FIELD_REACHED, { fieldKey: args.fieldKey });
  } else {
    sendError(TOOL_TYPES.GO_TO_FIELD, `Field not found: ${args.fieldKey || args.label}`);
  }
});

registerTool(TOOL_TYPES.FILL_FIELD, async (args, { send, formId }) => {
  const { fieldKey, label, type, value, subFormId, itemIndex } = args;

  let element = null;
  if (formId && agentFormRegistry.has(formId)) {
    try {
      const form = agentFormRegistry.get(formId);
      if (form) {
        const field = findRegistryField(form, fieldKey);
        if (field?.getElement) {
          element = field.getElement(itemIndex);
        }
      }
    } catch (e) {
      console.warn("[WalkthroughHandler] Registry findField failed, falling back to DOM search:", e);
    }
  }

  if (!element) {
    const container = getActiveContainer();
    element = filler.findField(fieldKey, label, subFormId, itemIndex, container);
  }

  const skipFocusClick = type === "text";
  if (element) {
    await CursorManager.animateToAndClick(element, skipFocusClick);
  }

  try {
    if (formId && agentFormRegistry.has(formId)) {
      try {
        if (type === "autocomplete") {
           const { searchRegistryField, waitForRegistryOption } = await import("../formExecutor");
           searchRegistryField(formId, fieldKey, value);
           const match = await waitForRegistryOption(formId, fieldKey, value);
           if (!match) throw new Error(`No autocomplete results for: ${value}`);
           const result = await fillRegistryField(formId, fieldKey, match, itemIndex);
           if (!result.success) throw new Error(result.reason);
        } else {
           const result = await fillRegistryField(formId, fieldKey, value, itemIndex);
           if (!result.success) throw new Error(result.reason);
           
           // Play typing sounds for text fields in registry mode
           if (type === "text") {
             await CursorManager.playKeystrokeSequence(Math.min(String(value).length, 4));
           }
        }
      } catch (regError) {
        console.warn(`[WalkthroughHandler] Registry fill failed for ${fieldKey}, falling back to DOM:`, regError);
        await fillViaDOM(fieldKey, label, type, value, subFormId, itemIndex);
      }
    } else {
      await fillViaDOM(fieldKey, label, type, value, subFormId, itemIndex);
    }

    sendStatus(STATUS_EVENTS.FIELD_FILLED, { fieldKey, value });
  } catch (err) {
    console.error(`[WalkthroughHandler] fill_field failed: ${fieldKey}`, err.message);
    sendError(TOOL_TYPES.FILL_FIELD, err.message, { fieldKey });
  }
});

registerTool(TOOL_TYPES.CLEAR_ALL_FIELDS, async (args, { send, formId }) => {
  if (formId && agentFormRegistry.has(formId)) {
    try {
      const { clearRegistryForm } = await import("../formExecutor");
      await clearRegistryForm(formId);
    } catch (regError) {
      console.warn(`[WalkthroughHandler] Registry clear failed, falling back to DOM clear:`, regError);
      const container = getActiveContainer();
      filler.clearAllFields(container);
    }
  } else {
    const container = getActiveContainer();
    filler.clearAllFields(container);
  }

  SpotlightManager.clearSpotlight();

  sendStatus(STATUS_EVENTS.FIELDS_CLEARED);
});

registerTool(TOOL_TYPES.EXPLAIN_FIELD, async (args, { send, add }) => {
  if (args.text) {
    add("agent", args.text);
  }
  sendStatus(STATUS_EVENTS.EXPLAIN_COMPLETE, { fieldKey: args.fieldKey });
});

registerTool(TOOL_TYPES.GET_OPTIONS_COUNT, async (args, { send, formId }) => {
  let count = 0;
  if (formId && agentFormRegistry.has(formId)) {
    const form = agentFormRegistry.get(formId);
    const field = findRegistryField(form, args.fieldKey);
    if (field?.getOptions) {
      const opts = field.getOptions();
      count = Array.isArray(opts) ? opts.length : 0;
    }
  } else {
    const container = getActiveContainer();
    const element = filler.findField(args.fieldKey, args.label, args.subFormId, args.itemIndex, container);
    if (element) {
      const select = element.querySelector('select') || element;
      count = select.querySelectorAll('option, [role="option"]').length;
    }
  }
  sendStatus("options_count_retrieved", { fieldKey: args.fieldKey, count });
});
