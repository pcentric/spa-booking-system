import React, { useCallback } from 'react';
import { getTimeFromSlotIndex, SLOT_HEIGHT } from '../../utils/timeUtils';
import useUI from '../../hooks/useUI';
import logger from '../../utils/logger';

/**
 * EmptySlot — Clickable area for creating new bookings
 * Grid the same as BookingCards (40px height for 15-min slot)
 * Click opens booking form with date+time pre-filled
 * NOTE: Removed nested Droppable to avoid conflict with TherapistColumn Droppable
 * DnD handled at column level only
 */
function EmptySlot({ slotIndex, therapistId, selectedDate, therapistIndex }) {
  const { openPanel } = useUI();

  const slotTime = getTimeFromSlotIndex(slotIndex);

  const handleClick = useCallback(() => {
    logger.debug('EmptySlot', 'Empty slot clicked', {
      slotIndex,
      slotTime,
      therapistId,
      therapistIndex,
      selectedDate,
    });

    // Convert selectedDate to YYYY-MM-DD format for the form
    let htmlDate = '';
    if (selectedDate) {
      if (typeof selectedDate === 'string') {
        htmlDate = selectedDate; // Already in YYYY-MM-DD format
      } else if (selectedDate instanceof Date) {
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        htmlDate = `${year}-${month}-${day}`;
      }
    }

    // Open create panel with pre-filled date/time/therapist and click position
    openPanel('create', null, {
      date: htmlDate,
      time: slotTime,
      therapist_id: therapistId,
    }, {
      slotIndex,
      therapistIndex,
    });
  }, [slotIndex, slotTime, therapistId, therapistIndex, selectedDate, openPanel]);

  return (
    <div
      className="absolute left-0 right-0 border-b border-gray-200 hover:bg-blue-50 cursor-pointer transition-all duration-200 group"
      style={{
        top: `${slotIndex * SLOT_HEIGHT}px`,
        height: `${SLOT_HEIGHT}px`,
        minHeight: `${SLOT_HEIGHT}px`,
      }}
      onClick={handleClick}
    >
      <div className="h-full flex items-center justify-center text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
        +
      </div>
    </div>
  );
}

export default React.memo(EmptySlot);
