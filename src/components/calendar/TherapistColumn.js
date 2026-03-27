import React from 'react';
import { Droppable } from '@hello-pangea/dnd';
import BookingCard from './BookingCard';
import EmptySlot from './EmptySlot';
import BookingInProgressSlot from './BookingInProgressSlot';
import { SLOT_HEIGHT, TOTAL_SLOTS } from '../../utils/timeUtils';
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
  visibleRowRange = { start: 0, end: TOTAL_SLOTS },
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
          {/* Render visible empty slots (virtualized grid background) */}
          {Array.from({ length: visibleRowRange.end - visibleRowRange.start }).map((_, i) => {
            const slotIndex = visibleRowRange.start + i;
            return (
              <EmptySlot
                key={`empty-${therapist.id}-${slotIndex}`}
                slotIndex={slotIndex}
                therapistId={therapist.id}
                selectedDate={selectedDate}
                therapistIndex={therapistIndex}
              />
            );
          })}

          {/* Render booking cards on top */}
          {bookings.map((booking, idx) => (
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
