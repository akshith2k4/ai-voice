export const normalizeString = (value) => String(value || "").trim().toLowerCase();

export const equalsNormalizedString = (left, right) => normalizeString(left) === normalizeString(right);

export const normalizeUppercaseString = (value) => String(value || "").trim().toUpperCase();
