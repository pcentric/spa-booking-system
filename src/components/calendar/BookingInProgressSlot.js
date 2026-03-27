import React from 'react';
import { SLOT_HEIGHT } from '../../utils/timeUtils';

/**
 * BookingInProgressSlot — Shows a "Booking in Progress" card in the grid
 * Positioned at the exact slot and therapist where the booking is being created
 */
const BookingInProgressSlot = ({ slotIndex, initialData, therapist }) => {
  const duration = 60; // Default 1 hour
  const heightPx = (duration / 15) * SLOT_HEIGHT; // Calculate height based on duration
  const topPx = slotIndex * SLOT_HEIGHT;

  return (
    <div
      className="absolute left-0 right-0 bg-orange-100 border-2 border-orange-500 rounded-md p-2 flex flex-col items-center justify-center text-center overflow-hidden"
      style={{
        top: `${topPx}px`,
        height: `${heightPx}px`,
        minHeight: `${SLOT_HEIGHT}px`,
      }}
    >
      <div className="w-6 h-6 border-2 border-orange-300 border-t-orange-500 rounded-full animate-spin mb-1" />
      <p className="text-xs font-bold text-gray-900">Booking in</p>
      <p className="text-xs font-bold text-gray-900">Progress</p>
      {initialData?.time && (
        <p className="text-xs text-gray-700 mt-1 font-semibold">{initialData.time}</p>
      )}
    </div>
  );
};

export default BookingInProgressSlot;
