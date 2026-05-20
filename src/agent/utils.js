export function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function findCheckboxInput(element) {
  if (!element) return null;

  // If the element itself is the target input or switch
  if (
    element.tagName === "INPUT" && 
    (element.type === "checkbox" || element.classList.contains("MuiSwitch-input") || element.classList.contains("MuiCheckbox-input"))
  ) {
    return element;
  }
  if (element.getAttribute("role") === "checkbox" || element.getAttribute("role") === "switch") {
    return element;
  }

  // 1. Direct query of input or switch in descendants
  const directInput = element.querySelector('input[type="checkbox"], [role="switch"], [role="checkbox"], .MuiSwitch-input, .MuiCheckbox-input');
  if (directInput) return directInput;

  // 2. Query in closest label root container (for inputs alongside labels)
  const labelRoot = element.closest(".MuiFormControlLabel-root") || element.closest("label");
  if (labelRoot) {
    const labelInput = labelRoot.querySelector('input[type="checkbox"], [role="switch"], [role="checkbox"], .MuiSwitch-input, .MuiCheckbox-input');
    if (labelInput) return labelInput;
  }

  return null;
}

export function isChecked(element) {
  if (!element) return false;
  return element.checked || element.getAttribute("aria-checked") === "true";
}

export function isTruthyValue(value) {
  return value === true || value === "true";
}
