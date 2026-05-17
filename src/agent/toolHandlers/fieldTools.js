import { registerTool } from "../toolRegistry";
import { TOOL_TYPES, STATUS_EVENTS } from "../protocol";
import * as filler from "../fieldFiller/index";
import { agentFormRegistry } from "../agentFormRegistry";
import { fillRegistryField, findRegistryField } from "../formExecutor";
import { SpotlightManager } from "../SpotlightManager";
import { sendStatus, sendError } from "../wsConnection";

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
    const form = agentFormRegistry.get(formId);
    if (form) {
      const field = findRegistryField(form, args.fieldKey);
      if (field?.getElement) {
        element = field.getElement(args.itemIndex);
      }
    }
  }

  if (!element) {
    const container = getActiveContainer();
    element = filler.findField(args.fieldKey, args.label, args.subFormId, args.itemIndex, container);
  }

  if (element) {
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

  try {
    if (formId && agentFormRegistry.has(formId)) {
      if (type === "autocomplete") {
         // Should import searchRegistryField, waitForRegistryOption
         const { searchRegistryField, waitForRegistryOption } = await import("../formExecutor");
         searchRegistryField(formId, fieldKey, value);
         const match = await waitForRegistryOption(formId, fieldKey, value);
         if (!match) throw new Error(`No autocomplete results for: ${value}`);
         const result = await fillRegistryField(formId, fieldKey, match, itemIndex);
         if (!result.success) throw new Error(result.reason);
      } else {
         const result = await fillRegistryField(formId, fieldKey, value, itemIndex);
         if (!result.success) throw new Error(result.reason);
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
    const { clearRegistryForm } = await import("../formExecutor");
    await clearRegistryForm(formId);
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
