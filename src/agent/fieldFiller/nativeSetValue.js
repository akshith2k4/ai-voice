export function setNativeValue(element, value) {
  const proto = Object.getPrototypeOf(element);
  // Try HTMLInputElement.prototype first (most reliable for React)
  const setter = 
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set ||
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set ||
    Object.getOwnPropertyDescriptor(proto, "value")?.set;

  if (setter) {
    setter.call(element, value);
  } else {
    // Last resort — set value AND manually trigger React's internal tracking
    element.value = value;
  }

  // ALWAYS dispatch these events to ensure React picks up the change
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

export const nativeSetValue = setNativeValue;
