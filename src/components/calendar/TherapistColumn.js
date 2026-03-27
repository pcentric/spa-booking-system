import React, { useMemo } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import BookingCard from './BookingCard';
import EmptySlot from './EmptySlot';
import BookingInProgressSlot from './BookingInProgressSlot';
import { SLOT_HEIGHT, TOTAL_SLOTS } from '../../utils/timeUtils';
import logger from '../../utils/logger';
import { useUI } from '../../hooks/useUI';
import useMergedTherapists from '../../hooks/useMergedTherapists';

/**
 * TherapistColumn — Single therapist's column
 * Droppable from @hello-pangea/dnd
 * Renders BookingCard for each booking in that therapist
 * Height matches total day height (TOTAL_SLOTS * SLOT_HEIGHT = 60 * 40 = 2400px)
 * Booking cards absolutely positioned by time/duration
 * Memoized with custom comparator
 */
function TherapistColumn({
  therapist,
  therapistIndex,
  bookings = [],
  selectedDate,
  onBookingClick,
  columnWidth = 180,
}) {
  const { isPanelOpen, panelMode, panelInitialData, panelClickPosition } = useUI();
  const therapists = useMergedTherapists();
  const totalHeight = TOTAL_SLOTS * SLOT_HEIGHT;

  // Check if a booking is being created in this column
  const isBookingInProgressHere =
    isPanelOpen &&
    panelMode === 'create' &&
    panelClickPosition &&
    panelClickPosition.therapistIndex === therapistIndex;

  // Get the therapist for the booking in progress
  const selectedTherapist = isBookingInProgressHere
    ? therapists?.find(t => Number(t.id) === Number(panelInitialData?.therapist_id))
    : null;

  // Filter bookings for this therapist
  // Normalize both IDs to number for safe comparison
  const therapistBookings = useMemo(() => {
    if (!Array.isArray(bookings) || !therapist?.id) {
      logger.warn('TherapistColumn', 'Invalid bookings or therapist', {
        bookingsIsArray: Array.isArray(bookings),
        bookingsLength: bookings?.length,
        therapistId: therapist?.id,
      });
      return [];
    }

    const therapistIdNum = Number(therapist.id);
    const filtered = bookings.filter(booking => {
      const bookingTherapistId = Number(booking.therapist_id);
      const matches = bookingTherapistId === therapistIdNum;

      if (!matches && bookings.length > 0) {
        logger.debug('TherapistColumn', 'Booking filter check', {
          therapistId: therapistIdNum,
          bookingId: booking.id,
          bookingTherapistId,
          bookingTherapistName: booking.therapist_name,
          matches,
        });
      }

      return matches;
    });

    if (filtered.length > 0) {
      logger.debug('TherapistColumn', 'Filtered bookings for therapist', {
        therapistId: therapistIdNum,
        therapistName: therapist.name,
        foundCount: filtered.length,
        bookingSamples: filtered.slice(0, 2).map(b => ({
          id: b.id,
          service: b.service_name,
          time: b.start_time,
          duration: b.duration,
        })),
      });
    }

    return filtered;
  }, [bookings, therapist?.id, therapist?.name]);

  logger.debug('TherapistColumn', 'Rendering therapist column', {
    therapistId: therapist.id,
    therapistName: therapist.name,
    therapistIndex,
    totalBookingsReceived: Array.isArray(bookings) ? bookings.length : 0,
    bookingCount: therapistBookings.length,
  });

  return (
    <Droppable
      droppableId={`therapist-${therapist.id}`}
      type="BOOKING"
      isDropDisabled={false}
    >
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={`relative flex-shrink-0 border-r border-gray-300 ${
            snapshot.isDraggingOver ? 'bg-blue-50' : 'bg-white'
          } transition-all duration-200`}
          style={{
            width: `${columnWidth}px`,
            minWidth: `${columnWidth}px`,
            height: `${totalHeight}px`,
            minHeight: `${totalHeight}px`,
            backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${SLOT_HEIGHT - 1}px, #f0f0f0 ${SLOT_HEIGHT - 1}px, #f0f0f0 ${SLOT_HEIGHT}px)`,
          }}
        >
          {/* Render all empty slots (grid background) */}
          {Array.from({ length: TOTAL_SLOTS }).map((_, slotIndex) => (
            <EmptySlot
              key={`empty-${therapist.id}-${slotIndex}`}
              slotIndex={slotIndex}
              therapistId={therapist.id}
              selectedDate={selectedDate}
              therapistIndex={therapistIndex}
            />
          ))}

          {/* Render booking cards on top */}
          {therapistBookings.map((booking, idx) => (
            <BookingCard
              key={`booking-${booking.id}`}
              booking={booking}
              therapistIndex={therapistIndex}
              bookingIndexInTherapist={idx}
              onBookingClick={onBookingClick}
            />
          ))}

          {/* Render booking in progress card if creating in this column */}
          {isBookingInProgressHere && panelClickPosition && (
            <BookingInProgressSlot
              slotIndex={panelClickPosition.slotIndex}
              initialData={panelInitialData}
              therapist={selectedTherapist}
            />
          )}

          {/* Drag overlay placeholder */}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
}

export default React.memo(TherapistColumn);
