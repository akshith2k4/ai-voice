// ============================================
// Field Filling Engine
// Takes tool calls from the driver and executes
// them on the real DOM using proven POC techniques
// ============================================

const MAX_RETRIES = 3;
const AUTOCOMPLETE_POLL_INTERVAL = 300;
const AUTOCOMPLETE_POLL_TIMEOUT = 6000;
const FIELD_RENDER_WAIT = 500;

// ========================================
// PUBLIC API
// ========================================

/**
 * Find a field in the DOM and scroll to it.
 * Returns the field element or null.
 */
export function findField(fieldKey, label, subFormId, itemIndex) {
  let element = null;

  // Strategy 1: Look for data-agent-field attribute
  if (fieldKey) {
    element = document.querySelector(`[data-agent-field="${fieldKey}"]`);
    if (element) {
      return scrollToElement(element);
    }

    // Strategy 1.5: Look for name or id attribute (common in MUI/Forms)
    const input = document.querySelector(`[name="${fieldKey}"]`) || document.querySelector(`[id="${fieldKey}"]`);
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
    element = findFieldByLabel(label, subFormId, itemIndex);
    if (element) {
      return scrollToElement(element);
    }
  }

  return null;
}

/**
 * Fill a field with a value.
 * Returns { success: true } or { success: false, reason: string }
 */
export function fillField(fieldKey, label, type, value, subFormId, itemIndex) {
  const element = findField(fieldKey, label, subFormId, itemIndex);
  if (!element) {
    return { success: false, reason: `Field not found: ${fieldKey || label}` };
  }

  switch (type) {
    case "text":
      return fillTextField(element, value);
    case "date":
      return fillDateField(element, value);
    case "select":
      return fillSelectField(element, value);
    case "autocomplete":
      // Autocomplete is async — caller must await
      return { success: false, reason: "Use fillAutocompleteField for autocomplete fields" };
    case "toggle":
      return fillToggleField(element, value);
    case "checkbox":
      return fillCheckboxField(element, value);
    default:
      return { success: false, reason: `Unknown field type: ${type}` };
  }
}

/**
 * Fill an autocomplete field (async — waits for API + dropdown).
 * Returns Promise<{ success: true }> or { success: false, reason: string }
 */
export async function fillAutocompleteField(fieldKey, label, value, subFormId, itemIndex) {
  const element = findField(fieldKey, label, subFormId, itemIndex);
  if (!element) {
    return { success: false, reason: `Field not found: ${fieldKey || label}` };
  }

  return await doFillAutocomplete(element, value);
}

/**
 * Click a button by text content.
 */
export function clickButton(text) {
  const buttons = document.querySelectorAll("button");
  const match = Array.from(buttons).find(
    (b) => {
      const btnText = b.textContent.trim().toLowerCase();
      const search = text.toLowerCase();
      // Fuzzy match: either one contains the other
      return btnText.includes(search) || search.includes(btnText);
    }
  );
  if (match) {
    match.click();
    return { success: true };
  }
  return { success: false, reason: `Button not found: ${text}` };
}

/**
 * Click a checkbox by label text.
 */
export function clickCheckbox(labelText) {
  const labels = Array.from(document.querySelectorAll("label"));
  const match = labels.find((l) =>
    l.textContent.toLowerCase().includes(labelText.toLowerCase())
  );
  if (!match) {
    return { success: false, reason: `Checkbox not found: ${labelText}` };
  }

  const formControlLabel = match.closest(".MuiFormControlLabel-root");
  const checkbox = formControlLabel?.querySelector(
    'input[type="checkbox"]'
  );
  if (checkbox) {
    checkbox.click();
    return { success: true };
  }
  return { success: false, reason: `Checkbox input not found: ${labelText}` };
}

/**
 * Clear all fields that were filled by the agent.
 * Uses the data-agent-filled attribute to track what we touched.
 */
export function clearAllFields() {
  const filled = document.querySelectorAll("[data-agent-filled]");
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
        const isChecked =
          switchInput.checked ||
          switchInput.getAttribute("aria-checked") === "true";
        if (isChecked) {
          switchInput.click();
          cleared++;
        }
      }
    }

    el.removeAttribute("data-agent-filled");
  });

  // Also click any delete buttons for sub-form items
  const deleteButtons = Array.from(
    document.querySelectorAll('[aria-label="delete item"]')
  );
  // Delete in reverse order so indices don't shift
  deleteButtons.reverse().forEach((btn) => {
    btn.click();
    cleared++;
  });

  return { success: true, cleared };
}

/**
 * Close the currently open dialog.
 */
export function closeDialog() {
  // Find the close/backdrop button
  const backdrop = document.querySelector(".MuiDialog-container");
  if (backdrop) {
    // Try the X button first
    const closeBtn = document.querySelector(
      '.MuiDialog-root [aria-label="close"], .MuiDialog-root [aria-label="Close"]'
    );
    if (closeBtn) {
      closeBtn.click();
      return { success: true };
    }

    // Try the Cancel button
    const cancelBtn = Array.from(
      document.querySelectorAll(".MuiDialog-root button")
    ).find((b) => b.textContent.trim() === "Cancel");
    if (cancelBtn) {
      cancelBtn.click();
      return { success: true };
    }

    // Last resort: click the backdrop
    const overlay = document.querySelector(".MuiDialog-backdrop");
    if (overlay) {
      overlay.click();
      return { success: true };
    }
  }

  return { success: false, reason: "No dialog found" };
}

// ========================================
// FIELD FINDING
// ========================================

function findFieldByLabel(label, subFormId, itemIndex) {
  // Search inside .MuiDialog-paper (the actual content container)
  // NOT [role="dialog"] which may be a wrapper
  const root = document.querySelector(".MuiDialog-paper") || 
               document.querySelector('[role="dialog"]') || 
               document;

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

function findSubFormField(dialog, label, subFormId, itemIndex) {
  // Find all labels with this text inside the dialog
  const labels = dialog.querySelectorAll("label");
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

// ========================================
// FIELD FILLING TECHNIQUES
// ========================================

async function fillTextField(element, value) {
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

function fillDateField(element, value) {
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

function fillSelectField(element, value) {
  const displayValue = getSelectDisplayValue(value);

  const selectTrigger = element.querySelector('[role="combobox"]');
  if (!selectTrigger) {
    return { success: false, reason: "Select trigger not found" };
  }

  // Record existing menus/listboxes BEFORE clicking
  const menusBefore = new Set(
    Array.from(
      document.querySelectorAll(
        '[role="listbox"], .MuiMenu-root, .MuiPopover-root, .MuiPaper-root.MuiPopover-paper'
      )
    )
  );

  // Click to open the dropdown
  selectTrigger.click();

  // Find the NEWLY appeared menu (wasn't there before the click)
  return new Promise((resolve) => {
    setTimeout(() => {
      const allMenus = document.querySelectorAll(
        '[role="listbox"], .MuiMenu-root, .MuiPopover-root, .MuiPaper-root.MuiPopover-paper'
      );

      // Find the menu that appeared AFTER the click
      let newMenu = null;
      for (const menu of allMenus) {
        if (!menusBefore.has(menu)) {
          newMenu = menu;
          break;
        }
      }

      if (!newMenu) {
        // Fallback: find any listbox with options
        newMenu = document.querySelector('[role="listbox"]');
      }

      if (!newMenu) {
        selectTrigger.click(); // Close
        resolve({
          success: false,
          reason: `No dropdown menu appeared for "${value}"`,
        });
        return;
      }

      const options = newMenu.querySelectorAll(
        '[role="option"], .MuiMenuItem-root, li'
      );

      if (options.length === 0) {
        selectTrigger.click(); // Close
        resolve({
          success: false,
          reason: `No options in dropdown for "${value}"`,
        });
        return;
      }

      const match = Array.from(options).find((o) => {
        const text = o.textContent.trim();
        return (
          text === value ||
          text === displayValue ||
          text.toUpperCase() === value.toUpperCase() ||
          text.toLowerCase() === value.toLowerCase()
        );
      });

      if (match) {
        match.click();
        element.setAttribute("data-agent-filled", "select");
        resolve({ success: true });
      } else {
        const available = Array.from(options)
          .map((o) => o.textContent.trim())
          .join(", ");
        selectTrigger.click(); // Close
        resolve({
          success: false,
          reason: `Option "${value}" not found. Available: [${available}]`,
        });
      }
    }, 500);
  });
}

function fillToggleField(element, value) {
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
  return { success: true };
}

function fillCheckboxField(element, value) {
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
  return { success: true };
}

async function doFillAutocomplete(element, value) {
  const autocompleteRoot = element.closest(".MuiAutocomplete-root") || element;
  const input = autocompleteRoot.querySelector("input");

  if (!input) {
    return { success: false, reason: "Autocomplete input not found" };
  }

  // Focus
  input.focus();
  await new Promise(r => setTimeout(r, 50));

  // Set the visual value
  setNativeValue(input, String(value));
  input.dispatchEvent(new Event("input", { bubbles: true }));

  // Trigger Autocomplete's onInputChange through React fiber
  const fiberKey = Object.keys(autocompleteRoot).find((k) =>
    k.startsWith("__reactFiber")
  );
  if (fiberKey) {
    let fiber = autocompleteRoot[fiberKey];
    let depth = 0;
    while (fiber && depth < 20) {
      const props = fiber.memoizedProps || fiber.pendingProps;
      if (props?.onInputChange) {
        props.onInputChange({}, String(value), "input");
        break;
      }
      fiber = fiber.return;
      depth++;
    }
  }

  // Wait for dropdown options to appear
  const optionFound = await pollForAutocompleteOption(value);

  if (!optionFound) {
    return {
      success: false,
      reason: `No autocomplete results for "${value}"`,
    };
  }

  optionFound.click();

  element.setAttribute("data-agent-filled", "autocomplete");
  return { success: true };
}

async function pollForAutocompleteOption(searchValue) {
  const startTime = Date.now();

  while (Date.now() - startTime < AUTOCOMPLETE_POLL_TIMEOUT) {
    await new Promise((r) => setTimeout(r, AUTOCOMPLETE_POLL_INTERVAL));

    const listbox = document.querySelector('[role="listbox"]');
    if (!listbox) continue;

    const options = listbox.querySelectorAll("li");
    if (options.length === 0) continue;

    const match = Array.from(options).find((o) =>
      o.textContent.toLowerCase().includes(searchValue.toLowerCase())
    );

    if (match) return match;
  }

  return null;
}

// ========================================
// UTILITIES
// ========================================

function setNativeValue(element, value) {
  const prototype = Object.getPrototypeOf(element);
  const nativeSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
  
  if (nativeSetter) {
    nativeSetter.call(element, value);
  } else {
    // Fallback to simpler setter if prototype chain is weird
    const inputProto = HTMLInputElement.prototype;
    const textAreaProto = HTMLTextAreaElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(inputProto, "value")?.set || 
                   Object.getOwnPropertyDescriptor(textAreaProto, "value")?.set;
    
    if (setter) {
      setter.call(element, value);
    } else {
      element.value = value;
    }
  }
}

function getSelectDisplayValue(internalValue) {
  // Convert internal values like "LEASING" to display values like "Leasing"
  const map = {
    LEASING: "Leasing",
    RENTAL: "Rental",
    WASHING: "Washing",
    DELIVERY: "Delivery",
    PICKUP: "Pickup",
    BOTH: "Both",
  };
  return map[internalValue] || internalValue;
}
