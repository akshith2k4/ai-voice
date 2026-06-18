import { findField as findFieldInternal } from "./finder";
import { fillTextField, fillDateField } from "./fillText";
import { fillSelectField } from "./fillSelect";
import { doFillAutocomplete } from "./fillAutocomplete";
import { fillToggleField, fillCheckboxField } from "./fillToggle";
import { setNativeValue } from "./nativeSetValue";

export { clickButton, clickCheckbox } from "./buttonHelper";
export { closeDialog } from "./dialogHelper";

export function findField(fieldKey, label, subFormId, itemIndex, container = document) {
  return findFieldInternal(fieldKey, label, subFormId, itemIndex, container);
}

export async function fillField(fieldKey, label, type, value, subFormId, itemIndex, container = document) {
  const element = findField(fieldKey, label, subFormId, itemIndex, container);
  if (!element) {
    return { success: false, reason: `Field not found: ${fieldKey || label}` };
  }

  switch (type) {
    case "text":
      return fillTextField(element, value);
    case "date":
      return fillDateField(element, value);
    case "select":
      return await fillSelectField(element, value);
    case "autocomplete":
      return { success: false, reason: "Use fillAutocompleteField for autocomplete fields" };
    case "toggle":
      return fillToggleField(element, value);
    case "checkbox":
      return fillCheckboxField(element, value);
    default:
      return { success: false, reason: `Unknown field type: ${type}` };
  }
}

export async function fillAutocompleteField(fieldKey, label, value, subFormId, itemIndex, container = document) {
  const element = findField(fieldKey, label, subFormId, itemIndex, container);
  if (!element) {
    return { success: false, reason: `Field not found: ${fieldKey || label}` };
  }

  return await doFillAutocomplete(element, value);
}

export function clearAllFields(container) {
  if (!container) {
    console.error("[fieldFiller] clearAllFields requires an explicit container.");
    return { success: false, reason: "Container is required" };
  }

  const filled = container.querySelectorAll("[data-agent-filled]");
  let cleared = 0;

  filled.forEach((el) => {
    const type = el.getAttribute("data-agent-filled");

    if (type === "text" || type === "date") {
      const input = el.querySelector("input");
      if (input) {
        setNativeValue(input, "");
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        cleared++;
      }
    } else if (type === "select") {
      const select = el.querySelector('[role="combobox"]');
      const nativeInput = el.querySelector(".MuiSelect-nativeInput") || el.querySelector("input");
      if (nativeInput) {
        setNativeValue(nativeInput, "");
        nativeInput.dispatchEvent(new Event("input", { bubbles: true }));
        nativeInput.dispatchEvent(new Event("change", { bubbles: true }));
      }
      if (select) {
        select.dispatchEvent(new Event("input", { bubbles: true }));
        select.dispatchEvent(new Event("change", { bubbles: true }));
        const display = el.querySelector(".MuiSelect-select");
        if (display) {
          display.textContent = "";
        }
      }
      cleared++;
    } else if (type === "autocomplete") {
      const input = el.querySelector("input");
      if (input) {
        setNativeValue(input, "");
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        cleared++;
      }
    } else if (type === "toggle") {
      const switchInput = el.querySelector(
        'input[type="checkbox"], [role="switch"]'
      );
      if (switchInput) {
        const original = el.getAttribute("data-agent-original") === "true";
        const current =
          switchInput.checked ||
          switchInput.getAttribute("aria-checked") === "true";
        if (current !== original) {
          switchInput.click();
          cleared++;
        }
      }
    }

    el.removeAttribute("data-agent-filled");
  });

  // Also click any delete buttons for sub-form items
  // Scoped strictly to the active container, and not the full document unless absolutely required.
  const isDocument = container === document;
  let deleteButtons = [];
  if (!isDocument) {
    deleteButtons = Array.from(
      container.querySelectorAll('[aria-label="delete item"]')
    );
  } else {
    // If it is document, let's scope to active dialog, form container, or fallback to the document itself
    const activeForm = document.querySelector(".MuiDialog-paper") || document.querySelector("form") || document;
    deleteButtons = Array.from(
      activeForm.querySelectorAll('[aria-label="delete item"]')
    );
  }

  // Delete in reverse order so indices don't shift
  deleteButtons.reverse().forEach((btn) => {
    btn.click();
    cleared++;
  });

  return { success: true, cleared };
}
