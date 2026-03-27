import React, { useState } from 'react';
import { logger } from '../../utils/logger';
import { isWithinBusinessHours } from '../../utils/timeUtils';

const TimeSlotPicker = ({ value, onChange, date, label = 'Start Time' }) => {
  const [error, setError] = useState(null);

  // Snap to nearest 15-minute interval
  const snapToNearestQuarter = (timeStr) => {
    if (!timeStr) return '';

    const [hours, minutes] = timeStr.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;

    // Find nearest 15-minute boundary
    const remainder = totalMinutes % 15;
    let snappedMinutes;

    if (remainder < 8) {
      // Closer to previous boundary
      snappedMinutes = totalMinutes - remainder;
    } else {
      // Closer to next boundary
      snappedMinutes = totalMinutes - remainder + 15;
    }

    // Clamp to valid time range
    snappedMinutes = Math.max(9 * 60, Math.min(snappedMinutes, 23 * 60));

    const snappedHours = Math.floor(snappedMinutes / 60);
    const snappedMins = snappedMinutes % 60;

    return `${String(snappedHours).padStart(2, '0')}:${String(snappedMins).padStart(2, '0')}`;
  };

  const validateTime = (timeStr) => {
    if (!timeStr) {
      setError('Time is required');
      return false;
    }

    // Check format
    if (!/^\d{2}:\d{2}$/.test(timeStr)) {
      setError('Invalid time format (HH:MM)');
      return false;
    }

    // Check business hours (9 AM - 11 PM)
    if (!isWithinBusinessHours(timeStr)) {
      setError('Time must be between 9:00 AM and 11:00 PM');
      return false;
    }

    setError(null);
    return true;
  };

  const handleChange = (e) => {
    let timeStr = e.target.value;

    if (!timeStr) {
      onChange('');
      setError(null);
      return;
    }

    // Snap to nearest 15-minute interval
    const snappedTime = snapToNearestQuarter(timeStr);

    // Validate
    if (!validateTime(snappedTime)) {
      return;
    }

    logger.debug('TimeSlotPicker', 'Time selected', { original: timeStr, snapped: snappedTime });
    onChange(snappedTime);
  };

  const handleBlur = () => {
    if (value) {
      const snappedTime = snapToNearestQuarter(value);
      if (snappedTime !== value) {
        onChange(snappedTime);
      }
    }
  };

  return (
    <div className="w-full">
      <label htmlFor="start-time" className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        <span className="text-red-600 ml-1">*</span>
      </label>

      <input
        id="start-time"
        type="time"
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        min="09:00"
        max="23:00"
        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
          error ? 'border-red-500' : 'border-gray-300'
        }`}
      />

      {error && (
        <p className="text-red-600 text-sm mt-1">{error}</p>
      )}

      <p className="text-gray-500 text-xs mt-1">
        15-minute slots: 9:00 AM - 11:00 PM
      </p>
    </div>
  );
};

export default TimeSlotPicker;
