import { setNativeValue } from "./nativeSetValue";

const AUTOCOMPLETE_POLL_INTERVAL = 300;
const AUTOCOMPLETE_POLL_TIMEOUT = 6000;

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

  // Also call React's onInputChange via fiber with a proper event
  const fiberKey = Object.keys(root).find(k => k.startsWith("__reactFiber"));
  if (fiberKey) {
    let fiber = root[fiberKey];
    let depth = 0;
    while (fiber && depth < 25) {
      const props = fiber.memoizedProps || fiber.pendingProps;
      if (props?.onInputChange) {
        const fakeEvent = { target: { value: str } };
        props.onInputChange(fakeEvent, str, "input");
        break;
      }
      fiber = fiber.return;
      depth++;
    }
  }

  // Wait for options
  const option = await pollForAutocompleteOption(str);
  if (!option) {
    console.warn(`[fieldFiller] Autocomplete poll timeout for "${value}". Attempting Enter fallback.`);
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await new Promise(r => setTimeout(r, 100));
    input.blur();
    element.setAttribute("data-agent-filled", "autocomplete");
    return { success: true };
  }

  option.click();
  element.setAttribute("data-agent-filled", "autocomplete");
  return { success: true };
}

async function pollForAutocompleteOption(searchValue) {
  const start = Date.now();
  const needle = searchValue.toLowerCase();

  while (Date.now() - start < AUTOCOMPLETE_POLL_TIMEOUT) {
    await new Promise(r => setTimeout(r, AUTOCOMPLETE_POLL_INTERVAL));

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
