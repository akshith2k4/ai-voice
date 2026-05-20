export function findField(fieldKey, label, subFormId, itemIndex, container = document) {
  let element = null;

  // Strategy 1: Look for data-agent-field attribute
  if (fieldKey) {
    element = container.querySelector(`[data-agent-field="${fieldKey}"]`);
    if (element) {
      return scrollToElement(element);
    }

    // Strategy 1.5: Look for name or id attribute (common in MUI/Forms)
    const input = container.querySelector(`[name="${fieldKey}"]`) || container.querySelector(`[id="${fieldKey}"]`);
    if (input) {
      element = input.closest(".MuiFormControl-root") || 
                input.closest(".MuiAutocomplete-root") || 
                input.closest(".MuiFormControlLabel-root") || 
                input;
      return scrollToElement(element);
    }
  }

  // Strategy 2: Find by label text
  if (label) {
    element = findFieldByLabel(label, subFormId, itemIndex, container);
    if (element) {
      return scrollToElement(element);
    }
  }

  return null;
}

function findFieldByLabel(label, subFormId, itemIndex, container) {
  // Search inside .MuiDialog-paper (the actual content container)
  // ONLY if the container is document. Otherwise, search container directly.
  const root = container === document
    ? (container.querySelector(".MuiDialog-paper") || container.querySelector('[role="dialog"]') || container)
    : container;

  if (subFormId !== undefined && subFormId !== null) {
    return findSubFormField(root, label, subFormId, itemIndex);
  }

  const labels = root.querySelectorAll("label");
  const matches = Array.from(labels).filter(
    (l) => l.textContent.trim() === label
  );

  if (matches.length === 0) return null;

  if (matches.length === 1) {
    return (
      matches[0].closest(".MuiAutocomplete-root") ||
      matches[0].closest(".MuiFormControl-root") ||
      matches[0].closest(".MuiFormControlLabel-root")
    );
  }

  // Multiple matches — prefer Autocomplete root
  for (const match of matches) {
    if (match.closest(".MuiAutocomplete-root")) {
      return match.closest(".MuiAutocomplete-root");
    }
  }

  return (
    matches[0].closest(".MuiFormControl-root") ||
    matches[0].closest(".MuiFormControlLabel-root")
  );
}

function findSubFormField(root, label, subFormId, itemIndex) {
  // Find all labels with this text inside the dialog
  const labels = root.querySelectorAll("label");
  const matches = Array.from(labels).filter(
    (l) => l.textContent.trim() === label
  );

  if (matches.length === 0) return null;

  // Sub-form fields are repeated — the Nth match corresponds to the Nth item (document order)
  const targetLabel = matches[itemIndex] || matches[0];
  if (!targetLabel) return null;

  return (
    targetLabel.closest(".MuiFormControl-root") ||
    targetLabel.closest(".MuiAutocomplete-root") ||
    targetLabel.closest(".MuiFormControlLabel-root")
  );
}

function scrollToElement(element) {
  element.scrollIntoView({ behavior: "smooth", block: "center" });
  return element;
}
