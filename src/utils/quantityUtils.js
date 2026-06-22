export const safeNumber = (value, defaultValue = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
};

export const normalizeQuantity = (value, defaultValue = 0) => {
  return safeNumber(value, defaultValue);
};
