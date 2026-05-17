import { setNativeValue } from "./nativeSetValue";

export async function fillTextField(element, value) {
  const input = element.querySelector('input:not([type="hidden"]), textarea');
  if (!input) {
    return { success: false, reason: "Input not found inside element" };
  }

  input.focus();
  await new Promise(r => setTimeout(r, 50)); // Small delay for focus state to settle

  setNativeValue(input, String(value));
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));

  // For some React versions, we need to blur to trigger final change
  input.blur();

  element.setAttribute("data-agent-filled", "text");
  return { success: true };
}

export function fillDateField(element, value) {
  const input = element.querySelector('input[type="date"]');
  if (!input) {
    // Might be a text input with type="date" rendered differently
    const textInput = element.querySelector('input:not([type="hidden"])');
    if (textInput) {
      textInput.focus();
      setNativeValue(textInput, String(value));
      textInput.dispatchEvent(new Event("input", { bubbles: true }));
      textInput.dispatchEvent(new Event("change", { bubbles: true }));
      element.setAttribute("data-agent-filled", "date");
      return { success: true };
    }
    return { success: false, reason: "Date input not found" };
  }

  input.focus();
  setNativeValue(input, String(value));
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));

  element.setAttribute("data-agent-filled", "date");
  return { success: true };
}
