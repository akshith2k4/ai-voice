import { setNativeValue } from "./nativeSetValue";
import { TIMING } from "../protocol";

export async function doFillAutocomplete(element, value) {
  const root = element.closest(".MuiAutocomplete-root") || element;
  const input = root.querySelector("input");
  if (!input) {
    return { success: false, reason: "Autocomplete input not found" };
  }

  // Focus and open
  input.focus();
  input.click();
  await new Promise(r => setTimeout(r, 50));

  // Clear first
  setNativeValue(input, "");
  input.dispatchEvent(new Event("input", { bubbles: true }));

  // Type character by character to trigger debounce + API
  const str = String(value);
  for (let i = 0; i < str.length; i++) {
    const partial = str.slice(0, i + 1);
    setNativeValue(input, partial);
    input.dispatchEvent(new InputEvent("input", {
      bubbles: true,
      data: str[i],
      inputType: "insertText"
    }));
    await new Promise(r => setTimeout(r, 80));
  }

  // Wait for options
  const option = await pollForAutocompleteOption(str);
  if (!option) {
    console.error(`[fieldFiller] Autocomplete option not found for value "${value}".`);
    input.blur();
    return { success: false, reason: `Autocomplete option not found for value: ${value}` };
  }

  option.click();
  element.setAttribute("data-agent-filled", "autocomplete");
  return { success: true };
}

async function pollForAutocompleteOption(searchValue) {
  const start = Date.now();
  const needle = searchValue.toLowerCase();

  while (Date.now() - start < TIMING.AUTOCOMPLETE_TIMEOUT_MS) {
    await new Promise(r => setTimeout(r, TIMING.AUTOCOMPLETE_POLL_MS));

    const listbox = document.querySelector('[role="listbox"]');
    if (!listbox) continue;

    const options = Array.from(listbox.querySelectorAll('[role="option"], li'));
    if (options.length === 0) continue;

    const match = options.find(o =>
      o.textContent.toLowerCase().includes(needle)
    );
    if (match) return match;
  }
  return null;
}
