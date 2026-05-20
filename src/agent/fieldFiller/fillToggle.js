import { findCheckboxInput, isChecked, isTruthyValue } from "../utils";

export function fillToggleField(element, value) {
  // Use shared helper to find input
  const switchInput = findCheckboxInput(element);

  // Last resort: find the MuiSwitch-root and click it
  if (!switchInput) {
    const switchRoot = element.querySelector(".MuiSwitch-root") || 
                       element.closest(".MuiSwitch-root");
    if (switchRoot) {
      switchRoot.click();
      element.setAttribute("data-agent-filled", "toggle");
      return { success: true };
    }
  }

  if (!switchInput) {
    return { success: false, reason: "Toggle input not found" };
  }

  const currentChecked = isChecked(switchInput);
  const wantChecked = isTruthyValue(value);

  if (currentChecked !== wantChecked) {
    switchInput.click();
  }

  element.setAttribute("data-agent-filled", "toggle");
  element.setAttribute("data-agent-original", String(currentChecked));
  return { success: true };
}

export function fillCheckboxField(element, value) {
  const checkbox = findCheckboxInput(element);
  if (!checkbox) {
    return { success: false, reason: "Checkbox not found" };
  }

  const currentChecked = isChecked(checkbox);
  const wantChecked = isTruthyValue(value);

  if (currentChecked !== wantChecked) {
    checkbox.click();
  }

  element.setAttribute("data-agent-filled", "toggle");
  element.setAttribute("data-agent-original", String(currentChecked));
  return { success: true };
}
