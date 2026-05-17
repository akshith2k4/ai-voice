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
  // NOT [role="dialog"] which may be a wrapper
  const root = container.querySelector(".MuiDialog-paper") || 
               container.querySelector('[role="dialog"]') || 
               container;

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

  // Sub-form fields are repeated — the Nth match corresponds to the Nth item
  // Group by vertical position (each item row is at a different Y)
  const grouped = groupByPosition(matches);

  const targetGroup = grouped[itemIndex] || grouped[0];
  if (!targetGroup) return null;

  return (
    targetGroup.closest(".MuiFormControl-root") ||
    targetGroup.closest(".MuiAutocomplete-root") ||
    targetGroup.closest(".MuiFormControlLabel-root")
  );
}

function groupByPosition(labels) {
  // Group labels that are in the same horizontal row (similar Y position)
  const rows = [];
  const tolerance = 20; // pixels

  for (const label of labels) {
    const rect = label.getBoundingClientRect();
    const y = Math.round(rect.top);

    let foundRow = rows.find((row) => Math.abs(row.y - y) < tolerance);
    if (!foundRow) {
      foundRow = { y, labels: [] };
      rows.push(foundRow);
    }
    foundRow.labels.push(label);
  }

  // Sort rows by Y position
  rows.sort((a, b) => a.y - b.y);

  // Return the first label from each row
  return rows.map((row) => row.labels[0]);
}

function scrollToElement(element) {
  element.scrollIntoView({ behavior: "smooth", block: "center" });
  return element;
}
