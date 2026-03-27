// Time utility functions for calendar calculations

const SLOT_HEIGHT_PX = 40; // pixels per 15-minute slot
const MINUTES_PER_SLOT = 15;
const DAY_START_HOUR = 9; // 9 AM
const DAY_END_HOUR = 24; // Midnight (next day)
const DAY_START_MINUTES = DAY_START_HOUR * 60; // 540 minutes from midnight

/**
 * Calculate minutes from day start (9 AM = 0, 9:15 AM = 15, etc.)
 */
export function minutesFromDayStart(timeStr) {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes;
  return totalMinutes - DAY_START_MINUTES;
}

/**
 * Calculate minutes from midnight
 */
export function minutesFromMidnight(timeStr) {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes from day start back to time string (HH:MM)
 */
export function minutesToTimeString(minutesFromStart) {
  const totalMinutes = DAY_START_MINUTES + minutesFromStart;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Calculate pixel position (top) for a time within the day
 */
export function getTopPosition(timeStr) {
  const minutesFromStart = minutesFromDayStart(timeStr);
  return (minutesFromStart / MINUTES_PER_SLOT) * SLOT_HEIGHT_PX;
}

/**
 * Calculate height in pixels for a given duration
 */
export function getHeightFromDuration(durationMinutes) {
  const slotCount = durationMinutes / MINUTES_PER_SLOT;
  const heightPx = slotCount * SLOT_HEIGHT_PX;
  return Math.max(heightPx, SLOT_HEIGHT_PX); // minimum 1 slot height
}

/**
 * Snap a pixel Y position to nearest 15-minute slot
 */
export function snapToNearestSlot(pixelY) {
  const rawMinutes = (pixelY / SLOT_HEIGHT_PX) * MINUTES_PER_SLOT;
  const snappedMinutes = Math.round(rawMinutes / MINUTES_PER_SLOT) * MINUTES_PER_SLOT;
  return snappedMinutes;
}

/**
 * Calculate end time given start time and duration
 */
export function calculateEndTime(startTimeStr, durationMinutes) {
  const startMinutes = minutesFromMidnight(startTimeStr);
  const endMinutes = startMinutes + durationMinutes;

  // Clamp to 24-hour boundary (shouldn't happen with valid business hours)
  const clampedMinutes = Math.min(endMinutes, 24 * 60 - 1);

  const hours = Math.floor(clampedMinutes / 60);
  const minutes = clampedMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Check if two time slots overlap
 */
export function doTimeSlotsOverlap(start1, duration1, start2, duration2) {
  const end1Minutes = minutesFromMidnight(start1) + duration1;
  const end2Minutes = minutesFromMidnight(start2) + duration2;
  const start1Minutes = minutesFromMidnight(start1);
  const start2Minutes = minutesFromMidnight(start2);

  // No overlap if one ends before or at the time the other starts
  return !(end1Minutes <= start2Minutes || end2Minutes <= start1Minutes);
}

/**
 * Check if a time is within business hours (9 AM - 12 AM / midnight)
 */
export function isWithinBusinessHours(timeStr) {
  const [hours] = timeStr.split(':').map(Number);
  return hours >= DAY_START_HOUR && hours <= 23; // 9 AM through 11:59 PM
}

/**
 * Check if end time is within business hours (allow up to midnight)
 */
export function isEndTimeWithinBusinessHours(startTimeStr, durationMinutes) {
  const endTimeStr = calculateEndTime(startTimeStr, durationMinutes);
  const [hours] = endTimeStr.split(':').map(Number);
  // Allow up to 23:59 (just before midnight)
  if (hours > 23) return false;
  return true;
}

/**
 * Get slot index from time (0-55 for 9 AM - 11 PM in 15-min slots)
 */
export function getSlotIndex(timeStr) {
  const minutesFromStart = minutesFromDayStart(timeStr);
  return Math.floor(minutesFromStart / MINUTES_PER_SLOT);
}

/**
 * Get time from slot index
 */
export function getTimeFromSlotIndex(slotIndex) {
  const minutesFromStart = slotIndex * MINUTES_PER_SLOT;
  return minutesToTimeString(minutesFromStart);
}

/**
 * Get total number of slots in a day
 */
export function getTotalSlotCount() {
  // 9 AM to 12 AM (midnight) = 15 hours = 60 slots of 15 minutes each
  return 60;
}

/**
 * Format duration for display
 */
export function formatDuration(durationMinutes) {
  if (durationMinutes < 60) {
    return `${durationMinutes}m`;
  }
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${minutes}m`;
}

// Constants for use in components
export const DAY_START = DAY_START_HOUR;
export const DAY_END = DAY_END_HOUR;
export const SLOT_HEIGHT = SLOT_HEIGHT_PX;
export const TOTAL_SLOTS = getTotalSlotCount();
