export function fillToggleField(element, value) {
  // The element might be .MuiFormControlLabel-root
  // The switch/checkbox input is inside it
  
  let switchInput = element.querySelector(
    'input[type="checkbox"], [role="switch"], .MuiSwitch-input'
  );

  // If not found directly, look in the broader parent
  if (!switchInput) {
    const formControlLabel = element.closest(".MuiFormControlLabel-root") || element;
    switchInput = formControlLabel.querySelector(
      'input[type="checkbox"], [role="switch"], .MuiSwitch-input'
    );
  }

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

  const currentChecked =
    switchInput.checked ||
    switchInput.getAttribute("aria-checked") === "true";
  const wantChecked = value === true || value === "true";

  if (currentChecked !== wantChecked) {
    switchInput.click();
  }

  element.setAttribute("data-agent-filled", "toggle");
  element.setAttribute("data-agent-original", String(currentChecked));
  return { success: true };
}

export function fillCheckboxField(element, value) {
  const checkbox = element.querySelector('input[type="checkbox"]');
  if (!checkbox) {
    return { success: false, reason: "Checkbox not found" };
  }

  const currentChecked = checkbox.checked;
  const wantChecked = value === true || value === "true";

  if (currentChecked !== wantChecked) {
    checkbox.click();
  }

  element.setAttribute("data-agent-filled", "toggle");
  element.setAttribute("data-agent-original", String(currentChecked));
  return { success: true };
}
