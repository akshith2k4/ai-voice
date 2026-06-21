import { registerTool } from "../toolRegistry";
import { TOOL_TYPES, STATUS_EVENTS } from "../protocol";
import * as filler from "../fieldFiller/index";
import { agentFormRegistry } from "../agentFormRegistry";
import { fillRegistryField, findRegistryField } from "../formExecutor";
import { SpotlightManager } from "../SpotlightManager";
import { sendStatus, sendError } from "../wsConnection";
import { CursorManager } from "../CursorManager";
import { walkthroughEngine } from "../WalkthroughEngine";

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

  if (type === "autocomplete" && element) {
    const input = element.querySelector("input");
    if (input && input.value && input.value.trim().toLowerCase() === String(value).trim().toLowerCase()) {
      console.log(`[fill_field] Autocomplete already has target value: "${value}". Skipping fill.`);
      element.setAttribute("data-agent-filled", "autocomplete");
      sendStatus(STATUS_EVENTS.FIELD_FILLED, { fieldKey, value });
      return;
    }
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

registerTool(TOOL_TYPES.FIELD_STEP, async (args, { send, formId }) => {
  const { fieldKey, label, fillValue, fillType, repeatingId, itemIndex, speechMessageId } = args;

  // Navigate to field
  let element = null;
  if (formId && agentFormRegistry.has(formId)) {
    try {
      const form = agentFormRegistry.get(formId);
      if (form) {
        const field = findRegistryField(form, fieldKey);
        if (field?.getElement) element = field.getElement(itemIndex);
      }
    } catch (e) {
      console.warn("[field_step] Registry findField failed:", e);
    }
  }
  if (!element) {
    const container = getActiveContainer();
    element = filler.findField(fieldKey, label, repeatingId, itemIndex, container);
  }
  if (!element) {
    console.warn(`[fieldTools] Field not found (registry or DOM): ${fieldKey}`);
    sendStatus(STATUS_EVENTS.FIELD_NOT_FOUND, { fieldKey, repeatingId, itemIndex });
    return; // Don't hang
  }
  await CursorManager.animateToAndClick(element);
  SpotlightManager.setSpotlight(element);

  // Fill if value was provided
  if (fillValue != null && fillType) {
    if (fillType === "autocomplete" && element) {
      const input = element.querySelector("input");
      if (input && input.value && input.value.trim().toLowerCase() === String(fillValue).trim().toLowerCase()) {
        console.log(`[field_step] Autocomplete already has target value: "${fillValue}". Skipping fill.`);
        element.setAttribute("data-agent-filled", "autocomplete");
        
        if (speechMessageId) {
          try {
            const audioCompleted = await walkthroughEngine.onAudioComplete(String(speechMessageId));
            if (!audioCompleted) {
              sendStatus("field_audio_timeout", { fieldKey, repeatingId, itemIndex });
              return;
            }
            sendStatus("field_done", { fieldKey });
          } catch (e) {
            console.log(`[field_step] Audio interrupted/cleared for ${fieldKey}`);
          }
        } else {
          sendStatus("field_done", { fieldKey });
        }
        return;
      }
    }

    try {
      if (formId && agentFormRegistry.has(formId)) {
        try {
          if (fillType === "autocomplete") {
            const { searchRegistryField, waitForRegistryOption } = await import("../formExecutor");
            searchRegistryField(formId, fieldKey, fillValue);
            const match = await waitForRegistryOption(formId, fieldKey, fillValue);
            if (!match) throw new Error(`No autocomplete results for: ${fillValue}`);
            const result = await fillRegistryField(formId, fieldKey, match, itemIndex);
            if (!result.success) throw new Error(result.reason);
          } else {
            const result = await fillRegistryField(formId, fieldKey, fillValue, itemIndex);
            if (!result.success) throw new Error(result.reason);
            if (fillType === "text") {
              await CursorManager.playKeystrokeSequence(Math.min(String(fillValue).length, 4));
            }
          }
        } catch (regError) {
          console.warn(`[field_step] Registry fill failed for ${fieldKey}, falling back to DOM:`, regError);
          await fillViaDOM(fieldKey, label, fillType, fillValue, repeatingId, itemIndex);
        }
      } else {
        await fillViaDOM(fieldKey, label, fillType, fillValue, repeatingId, itemIndex);
      }
    } catch (err) {
      console.warn(`[field_step] Fill failed for ${fieldKey}:`, err.message);
    }
  }

  if (speechMessageId) {
    try {
      const audioCompleted = await walkthroughEngine.onAudioComplete(String(speechMessageId));
      if (!audioCompleted) {
        sendStatus("field_audio_timeout", { fieldKey, repeatingId, itemIndex });
        return;
      }
      sendStatus("field_done", { fieldKey });
    } catch (e) {
      console.log(`[field_step] Audio interrupted/cleared for ${fieldKey}`);
    }
  } else {
    sendStatus("field_done", { fieldKey });
  }
});

// Wait for the exact TTS audio for this speak step, then signal the backend.
// Uses messageId (included in speak tool args) so we don't react to LLM response TTS
// or other concurrent audio finishing first.
registerTool(TOOL_TYPES.SPEAK, async (args) => {
  const { messageId } = args;
  if (messageId) {
    try {
      const audioCompleted = await walkthroughEngine.onAudioComplete(String(messageId));
      if (!audioCompleted) {
        sendStatus("speak_audio_timeout", { messageId });
        return;
      }
      sendStatus("walkthrough_speak_done");
    } catch (e) {
      console.log(`[speak] Audio interrupted/cleared:`, e.message);
    }
  } else {
    sendStatus("walkthrough_speak_done");
  }
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
