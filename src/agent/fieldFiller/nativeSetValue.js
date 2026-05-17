export function setNativeValue(element, value) {
  const setter = Object.getOwnPropertyDescriptor(
    Object.getPrototypeOf(element), "value"
  )?.set;
  if (setter) {
    setter.call(element, value);
  } else {
    element.value = value;
  }
}
