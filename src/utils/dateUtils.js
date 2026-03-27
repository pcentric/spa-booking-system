// Date utility functions — API uses DD-MM-YYYY format, not ISO
import { format, parse, isToday, isSameDay } from 'date-fns';

const API_DATE_FORMAT = 'dd-MM-yyyy';
const API_DATETIME_FORMAT = 'dd-MM-yyyy HH:mm:ss';
const DISPLAY_DATE_FORMAT = 'MMM d, yyyy';

/**
 * Convert HTML date input (YYYY-MM-DD) to API date format (DD-MM-YYYY)
 */
export function htmlDateToApiDate(htmlDate) {
  if (!htmlDate) return null;
  // If already in API format, return as-is
  if (htmlDate.includes('-') && htmlDate.split('-')[0].length === 2) {
    return htmlDate;
  }
  // Convert from YYYY-MM-DD to DD-MM-YYYY
  const [year, month, day] = htmlDate.split('-');
  return `${day}-${month}-${year}`;
}

/**
 * Convert API date format (DD-MM-YYYY) to HTML date input format (YYYY-MM-DD)
 */
export function apiDateToHtmlDate(apiDate) {
  if (!apiDate) return '';
  // If already in HTML format (YYYY-MM-DD), return as-is
  if (apiDate.split('-')[0].length === 4) {
    return apiDate;
  }
  // Convert from DD-MM-YYYY to YYYY-MM-DD
  const [day, month, year] = apiDate.split('-');
  return `${year}-${month}-${day}`;
}

/**
 * Convert Date to API format (DD-MM-YYYY)
 */
export function toApiDate(date) {
  if (!date) return null;
  // Handle HTML date input format (YYYY-MM-DD)
  if (typeof date === 'string') {
    return htmlDateToApiDate(date);
  }
  return format(new Date(date), API_DATE_FORMAT);
}

/**
 * Convert Date + time to API format (DD-MM-YYYY HH:MM:SS)
 */
export function toApiDateTime(date, time) {
  if (!date || !time) return null;
  const dateStr = typeof date === 'string' ? date : toApiDate(date);
  return `${dateStr} ${time}:00`;
}

/**
 * Parse date from API format (DD-MM-YYYY) to Date object
 */
export function parseApiDate(dateStr) {
  if (!dateStr) return null;
  try {
    return parse(dateStr, API_DATE_FORMAT, new Date());
  } catch {
    return null;
  }
}

/**
 * Parse datetime from API format (DD-MM-YYYY HH:MM:SS) to Date object
 */
export function parseApiDateTime(dateTimeStr) {
  if (!dateTimeStr) return null;
  try {
    return parse(dateTimeStr, API_DATETIME_FORMAT, new Date());
  } catch {
    return null;
  }
}

/**
 * Format date for display (e.g., "Mar 25, 2026")
 */
export function toDisplayDate(date) {
  if (!date) return '';
  if (typeof date === 'string') {
    const parsed = parseApiDate(date);
    return parsed ? format(parsed, DISPLAY_DATE_FORMAT) : date;
  }
  return format(new Date(date), DISPLAY_DATE_FORMAT);
}

/**
 * Format time for display (e.g., "14:30")
 */
export function toDisplayTime(time) {
  if (!time) return '';
  if (time.length === 5) return time; // already HH:MM
  return time.substring(0, 5);
}

/**
 * Calculate end time from start time and duration (in minutes)
 * @param {string} startTime - Time in HH:MM or HH:MM:SS format
 * @param {number} duration - Duration in minutes
 * @returns {string} End time in HH:MM format
 */
export function calculateEndTime(startTime, duration) {
  if (!startTime || !duration) return '';
  const [hours, minutes] = startTime.substring(0, 5).split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + duration;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;
  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
}

/**
 * Format time range for display (e.g., "14:30 - 15:30")
 */
export function toDisplayTimeRange(startTime, endTime, duration) {
  if (!startTime) return '';
  const start = toDisplayTime(startTime);
  // If end_time is not available, calculate from duration
  const end = endTime ? toDisplayTime(endTime) : (duration ? calculateEndTime(startTime, duration) : '');
  return end ? `${start} - ${end}` : start;
}

/**
 * Parse a date range string (DD-MM-YYYY / DD-MM-YYYY)
 */
export function parseDateRange(rangeStr) {
  if (!rangeStr) return { start: null, end: null };
  const [startStr, endStr] = rangeStr.split(' / ').map(s => s.trim());
  return {
    start: parseApiDate(startStr),
    end: parseApiDate(endStr),
  };
}

/**
 * Create a date range string from two dates
 */
export function toDateRangeString(startDate, endDate) {
  return `${toApiDate(startDate)} / ${toApiDate(endDate)}`;
}

/**
 * Check if two dates are the same day
 */
export function isSameDayCheck(date1, date2) {
  if (!date1 || !date2) return false;
  const d1 = typeof date1 === 'string' ? parseApiDate(date1) : new Date(date1);
  const d2 = typeof date2 === 'string' ? parseApiDate(date2) : new Date(date2);
  return isSameDay(d1, d2);
}

/**
 * Check if date is today
 */
export function isTodayCheck(date) {
  if (!date) return false;
  const d = typeof date === 'string' ? parseApiDate(date) : new Date(date);
  return isToday(d);
}

/**
 * Get today's date in API format
 */
export function getTodayApiDate() {
  return toApiDate(new Date());
}

/**
 * Get tomorrow's date in API format
 */
export function getTomorrowApiDate() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return toApiDate(tomorrow);
}

/**
 * Get date N days from now in API format
 */
export function getDateNDaysFromNow(days) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  return toApiDate(futureDate);
}

/**
 * Get date N days ago in API format
 */
export function getDateNDaysAgo(days) {
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - days);
  return toApiDate(pastDate);
}
