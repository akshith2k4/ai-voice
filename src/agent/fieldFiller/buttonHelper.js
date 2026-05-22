import { TIMING } from "../protocol";
import { findCheckboxInput } from "../utils";
import { CursorManager } from "../CursorManager";

export async function clickButton(text, timeout = TIMING.BUTTON_TIMEOUT_MS) {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    const buttons = document.querySelectorAll("button");
    const search = text.toLowerCase();
    
    // Try exact match first
    const exact = Array.from(buttons).find(b =>
      b.textContent.trim().toLowerCase() === search
    );
    let chosen = exact;
    
    if (!chosen) {
      // Fuzzy fallback with strict word boundaries
      const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const fuzzyCandidates = Array.from(buttons).filter((b) => {
        const content = b.textContent.trim().toLowerCase();
        const regex = new RegExp("\\b" + escapeRegExp(search) + "\\b", "i");
        return regex.test(content);
      });
      if (fuzzyCandidates.length > 0) {
        // Sort to select the shortest text string (highest similarity)
        fuzzyCandidates.sort((a, b) => a.textContent.trim().length - b.textContent.trim().length);
        chosen = fuzzyCandidates[0];
        console.warn(`[fieldFiller] clickButton: Fuzzy match used instead of exact match for "${text}". Matched: "${chosen.textContent.trim()}"`);
      }
    }

    if (chosen) {
      await CursorManager.animateToAndClick(chosen);
      chosen.click();
      return { success: true };
    }

    await new Promise(r => setTimeout(r, TIMING.POLL_INTERVAL_MS));
  }

  return { success: false, reason: `Button not found: ${text}` };
}

export async function clickCheckbox(labelText) {
  const labels = Array.from(document.querySelectorAll("label"));
  const match = labels.find((l) =>
    l.textContent.toLowerCase().includes(labelText.toLowerCase())
  );
  if (!match) {
    return { success: false, reason: `Checkbox not found: ${labelText}` };
  }

  const checkbox = findCheckboxInput(match);
  if (checkbox) {
    await CursorManager.animateToAndClick(checkbox);
    checkbox.click();
    return { success: true };
  }
  return { success: false, reason: `Checkbox input not found: ${labelText}` };
}

