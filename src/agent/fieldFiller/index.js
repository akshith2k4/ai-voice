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

export function clearAllFields(container = document) {
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
      if (select) {
        // Re-click to deselect — complex. Just clear the display value
        const display = el.querySelector(".MuiSelect-select");
        if (display) {
          display.textContent = "";
        }
        cleared++;
      }
    } else if (type === "autocomplete") {
      const input = el.querySelector("input");
      if (input) {
        setNativeValue(input, "");
        input.dispatchEvent(new Event("input", { bubbles: true }));
        // Also trigger onChange to clear React state
        const reactKey = Object.keys(input).find((k) =>
          k.startsWith("__reactProps")
        );
        if (reactKey && input[reactKey]?.onChange) {
          input[reactKey].onChange({ target: { value: "" } });
        }
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
  const deleteButtons = Array.from(
    container.querySelectorAll('[aria-label="delete item"]')
  );
  // Delete in reverse order so indices don't shift
  deleteButtons.reverse().forEach((btn) => {
    btn.click();
    cleared++;
  });

  return { success: true, cleared };
}
