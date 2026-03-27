import React from 'react';
import { logger } from '../../utils/logger';
import { calculateEndTime } from '../../utils/timeUtils';
import { htmlDateToApiDate } from '../../utils/dateUtils';
import ServiceSelector from './ServiceSelector';
import TherapistSelector from './TherapistSelector';
import RoomSelector from './RoomSelector';
import TimeSlotPicker from './TimeSlotPicker';

const BookingItemRow = ({ item, itemIndex, date, onUpdate, onRemove, error, therapists = [] }) => {
  // Extract field-level errors from error object if it's an object
  const fieldErrors = (error && typeof error === 'object') ? error : {};
  const errorMessage = (error && typeof error === 'string') ? error : '';

  // Get selected therapist info for display
  const selectedTherapist = item.therapist_id
    ? therapists.find(t => Number(t.id) === Number(item.therapist_id))
    : null;

  const handleServiceChange = (e) => {
    const serviceId = e.target.value ? parseInt(e.target.value) : '';
    // Keep pre-selected therapist if it exists, otherwise reset
    const updatedItem = {
      ...item,
      service_id: serviceId,
      // Only reset therapist if none was pre-selected
      therapist_id: item.therapist_id || '',
    };
    onUpdate(itemIndex, updatedItem);
    logger.debug('BookingItemRow', 'Service changed', { index: itemIndex, serviceId });
  };

  const handleTherapistChange = (therapistId) => {
    const updatedItem = {
      ...item,
      therapist_id: therapistId,
    };
    onUpdate(itemIndex, updatedItem);
    logger.debug('BookingItemRow', 'Therapist changed', { index: itemIndex, therapistId });
  };

  const handleStartTimeChange = (timeStr) => {
    // Calculate end time based on duration
    const endTime = calculateEndTime(timeStr, item.duration);
    const updatedItem = {
      ...item,
      start_time: timeStr,
      end_time: endTime,
    };
    onUpdate(itemIndex, updatedItem);
    logger.debug('BookingItemRow', 'Start time changed', { index: itemIndex, startTime: timeStr });
  };

  const handleDurationChange = (e) => {
    const duration = parseInt(e.target.value) || 60;
    // Recalculate end time if start time exists
    let endTime = item.end_time;
    if (item.start_time) {
      endTime = calculateEndTime(item.start_time, duration);
    }
    const updatedItem = {
      ...item,
      duration,
      end_time: endTime,
    };
    onUpdate(itemIndex, updatedItem);
    logger.debug('BookingItemRow', 'Duration changed', { index: itemIndex, duration });
  };

  const handleRoomChange = (roomId) => {
    const updatedItem = {
      ...item,
      room_id: roomId,
    };
    onUpdate(itemIndex, updatedItem);
    logger.debug('BookingItemRow', 'Room changed', { index: itemIndex, roomId });
  };

  const durationOptions = [
    { value: 30, label: '30 minutes' },
    { value: 45, label: '45 minutes' },
    { value: 60, label: '1 hour' },
    { value: 90, label: '1.5 hours' },
    { value: 120, label: '2 hours' },
    { value: 150, label: '2.5 hours' },
    { value: 180, label: '3 hours' },
  ];

  const getServiceAtDateTime = () => {
    // Ensure start_time is in HH:MM:SS format
    let timeStr = item.start_time || '09:00';
    // Remove seconds if already present, then add them
    if (timeStr.includes(':')) {
      const parts = timeStr.split(':');
      timeStr = `${parts[0]}:${parts[1]}`;
    }
    return `${htmlDateToApiDate(date)} ${timeStr}:00`;
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-900">Service {itemIndex + 1}</h4>
        {itemIndex > 0 && (
          <button
            type="button"
            onClick={() => onRemove(itemIndex)}
            className="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-sm font-semibold transition-colors"
          >
            Remove
          </button>
        )}
      </div>

      <div className="space-y-3">
        {/* Show selected therapist badge if pre-selected from grid click */}
        {item.therapist_id && !item.service_id && selectedTherapist && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Therapist Selected</p>
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-gray-900">
                {selectedTherapist.alias || selectedTherapist.name}
              </p>
              <button
                type="button"
                onClick={() => handleTherapistChange(null)}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
              >
                Change
              </button>
            </div>
            {selectedTherapist.gender && (
              <p className="text-xs text-gray-600 mt-1">({selectedTherapist.gender})</p>
            )}
            <p className="text-xs text-gray-600 mt-2">
              Now select a service available with this therapist
            </p>
          </div>
        )}

        {/* Therapist Selection - Show full selector if no service selected yet but want to change */}
        {item.therapist_id && !item.service_id && !selectedTherapist && date && (
          <TherapistSelector
            serviceId={item.service_id}
            serviceAt={getServiceAtDateTime()}
            value={item.therapist_id}
            onChange={handleTherapistChange}
            label="Therapist"
            error={fieldErrors.therapist_id}
          />
        )}

        {/* Service Selection */}
        <ServiceSelector
          value={item.service_id}
          onChange={handleServiceChange}
          label="Service"
          error={fieldErrors.service_id}
        />

        {/* Therapist Selection - Show after service is selected or to change selection */}
        {item.service_id && date && (
          <TherapistSelector
            serviceId={item.service_id}
            serviceAt={getServiceAtDateTime()}
            value={item.therapist_id}
            onChange={handleTherapistChange}
            label="Therapist"
            error={fieldErrors.therapist_id}
          />
        )}

        {/* Time Selection */}
        <div className="grid grid-cols-2 gap-3">
          <TimeSlotPicker
            value={item.start_time}
            onChange={handleStartTimeChange}
            date={date}
            label="Start Time"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Time
            </label>
            <input
              type="text"
              value={item.end_time || calculateEndTime(item.start_time || '09:00', item.duration)}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
            />
          </div>
        </div>

        {/* Duration Selection */}
        <div>
          <label htmlFor={`duration-${itemIndex}`} className="block text-sm font-medium text-gray-700 mb-1">
            Duration
          </label>
          <select
            id={`duration-${itemIndex}`}
            value={item.duration}
            onChange={handleDurationChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            {durationOptions.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Room Selection */}
        {date && item.duration && (
          <RoomSelector
            value={item.room_id}
            onChange={handleRoomChange}
            date={date}
            duration={item.duration}
            label="Room"
          />
        )}
      </div>

      {errorMessage && (
        <div className="mt-3 p-2 bg-red-50 rounded border border-red-200">
          <p className="text-red-600 text-sm">{errorMessage}</p>
        </div>
      )}
    </div>
  );
};

export default BookingItemRow;
