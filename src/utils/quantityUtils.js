export const normalizeQuantity = (value, defaultValue = 0) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return defaultValue;
  }

  return value;
};
