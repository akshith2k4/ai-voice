export async function clickButton(text, timeout = 3000) {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    const buttons = document.querySelectorAll("button");
    const search = text.toLowerCase();
    
    // Try exact match first
    const exact = Array.from(buttons).find(b =>
      b.textContent.trim().toLowerCase() === search
    );
    if (exact) {
      exact.click();
      return { success: true };
    }
    
    // Fuzzy fallback
    const fuzzy = Array.from(buttons).find(b =>
      b.textContent.trim().toLowerCase().includes(search)
    );
    if (fuzzy) {
      fuzzy.click();
      return { success: true };
    }

    await new Promise(r => setTimeout(r, 200));
  }

  return { success: false, reason: `Button not found: ${text}` };
}

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
