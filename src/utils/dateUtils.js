import { format, parseISO, isValid } from "date-fns";
import { DATE_PARSE_MODE } from "../config";

export const TIMEZONES = Object.freeze({
  UTC: "UTC",
  LOCAL: "local",
});

const DATE_FORMATS = {
  day: "EEE",
  fullDate: "MMM d, yyyy",
  time: "hh:mm aa",
  separator: {
    date: ", ",
    dateTime: " | ",
  },
};

export const DATE_ONLY = { showDate: true };
export const DATE_TIME = { showDate: true, showTime: true };
export const FULL_FORMAT = { showDay: true, showDate: true, showTime: true };

// Formats a date-like input into the given pattern safely
export function formatDateLabel(input, pattern = "do MMM, yyyy") {
  if (!input) return "";
  try {
    const d = input instanceof Date ? input : new Date(input);
    if (isNaN(d.getTime())) return "";
    return format(d, pattern);
  } catch {
    return "";
  }
}

// This function parses an incoming date string and converts it into a JavaScript Date object, based on how the date should be interpreted (UTC or Local timezone).
export function parseDate(dateString, inputDateTimezone = DATE_PARSE_MODE) {
  if (!dateString) return null;

  if (dateString instanceof Date) return dateString;

  const trimmed = dateString.trim();

  // Detect if input already has timezone (Z or +05:30 etc.)
  const hasTimezone = trimmed.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(trimmed);

  let date;

  // ---- Parse as UTC ----
  if (inputDateTimezone === TIMEZONES.UTC) {
    date = parseISO(hasTimezone ? trimmed : trimmed + "Z");
  }

  // ---- Parse as Local System Time ----
  else if (inputDateTimezone === TIMEZONES.LOCAL) {
    date = new Date(trimmed);
  }

  // ---- Default fallback
  else {
    date = parseISO(trimmed);
  }

  // ---- Validate ----
  if (!isValid(date)) {
    console.warn(`⚠️ Invalid date input: "${dateString}"`);
    return null;
  }

  return date;
}

// Formats a date string or Date object based on display options.
export function formatCustomDate(date, options = DATE_ONLY) {
  if (!date) return "-- : --";

  const parsedDate = date instanceof Date ? date : parseDate(date);
  if (!parsedDate) return "-- : --";

  const { showDay, showDate, showTime } = options;
  const parts = [];

  if (showDay) {
    parts.push(format(parsedDate, DATE_FORMATS.day));
  }

  if (showDate) {
    parts.push(format(parsedDate, DATE_FORMATS.fullDate));
  }

  let result = parts.join(DATE_FORMATS.separator.date);

  if (showTime) {
    const time = format(parsedDate, DATE_FORMATS.time);
    result = result
      ? `${result}${DATE_FORMATS.separator.dateTime}${time}`
      : time;
  }

  return result;
}

// Returns date formatted as YYYY-MM-DD (ISO 8601 Date only)
export function formatDateForApi(date) {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  if (!isValid(d)) return null;
  return format(d, "yyyy-MM-dd");
}

// Returns date formatted as YYYY-MM-DDT00:00:00 (Start of day timestamp)
export function formatDateForTimestamp(date) {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  if (!isValid(d)) return null;
  return format(d, "yyyy-MM-dd'T'00:00:00");
}

// Returns a date range object { startDate, endDate } for a given date.
// If offsetDays is provided, the range will handle start/end relative to that offset if logic dictates,
// but based on user request "if I give a (date, 3) as argument then it should return me that date range",
// I assume they mean a range covering [date - offset, date] or [date, date + offset].
// Looking at usage in DamageAssessmentDashboard: subDays(new Date(), 3).
// So this helper will simply return start/end of the specific single date if offset is 0,
// OR if offset > 0, it returns a range from (date - offset) to date.
export function getDayRange(date, offsetDays = 0) {
  if (!date) return {};
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return {};

  const end = new Date(d);
  end.setHours(23, 59, 59, 999);

  const start = new Date(d);
  if (offsetDays > 0) {
    start.setDate(start.getDate() - offsetDays);
  }
  start.setHours(0, 0, 0, 0);

  return { startDate: start.toISOString(), endDate: end.toISOString() };
}

/**
 * Generates a list of month options for dropdowns (labels like "January 2026", values like "2026-01").
 * @param {number} count - Number of months to generate including the current one.
 * @returns {Array<{label: string, value: string}>}
 */
export function generateMonthOptions(count = 24) {
  const options = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleString("en-US", { month: "long", year: "numeric" });
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    options.push({ label, value });
  }
  return options;
}

/**
 * Returns a UTC ISO date range { startAt, endAt } for a given month string "YYYY-MM".
 * Respects the user's local timezone for start/end boundaries.
 * @param {string} monthStr - Format "YYYY-MM"
 * @returns {{startAt: string, endAt: string}}
 */
export function getMonthRange(monthStr) {
  if (!monthStr) return { startAt: undefined, endAt: undefined };
  const [year, month] = monthStr.split("-").map(Number);
  
  // Local boundaries
  const start = new Date(year, month - 1, 1, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);

  return { 
    startAt: start.toISOString(), 
    endAt: end.toISOString() 
  };
}
