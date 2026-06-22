import { addDays, format, isValid, parseISO } from "date-fns";

export const normalizeDate = (value) => {
  if (!value) return null;
  const parsed = typeof value === "string" ? parseISO(value) : new Date(value);
  if (isValid(parsed)) return parsed;
  const fallback = new Date(value);
  return isValid(fallback) ? fallback : null;
};

export const getWeekLabel = (value) => {
  const date = normalizeDate(value);
  if (!date) return null;
  return `Week ${Math.floor((date.getDate() - 1) / 7) + 1}`;
};

export const getDayLabel = (value) => {
  const date = normalizeDate(value);
  if (!date) return null;
  return format(date, "dd MMM");
};

export const getFullDayLabel = (value) => {
  const date = normalizeDate(value);
  if (!date) return null;
  return format(date, "dd MMM yyyy");
};

export const getWeekTooltipLabel = (weekIndex, monthStart, monthEnd) => {
  const rangeStart = addDays(monthStart, weekIndex * 7);
  if (rangeStart > monthEnd) return null;

  const maxRangeEnd = addDays(rangeStart, 6);
  const rangeEnd = maxRangeEnd > monthEnd ? monthEnd : maxRangeEnd;

  return `${format(rangeStart, "dd MMM")} - ${format(rangeEnd, "dd MMM yyyy")}`;
};
