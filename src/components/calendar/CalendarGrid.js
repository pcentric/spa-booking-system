import React, { useRef, useCallback, useEffect } from 'react';
import CalendarHeader from './CalendarHeader';
import TimeGutter from './TimeGutter';
import TherapistColumn from './TherapistColumn';
import CurrentTimeLine from './CurrentTimeLine';
import useVirtualGrid from '../../hooks/useVirtualGrid';
import useBookings from '../../hooks/useBookings';
import useMergedTherapists from '../../hooks/useMergedTherapists';
import { useUI } from '../../hooks/useUI';
import logger from '../../utils/logger';
import { SLOT_HEIGHT, TOTAL_SLOTS, snapToNearestSlot, minutesToTimeString, calculateEndTime } from '../../utils/timeUtils';
import { useColumnWidth } from '../../hooks/useColumnWidth';
import { updateBooking as updateBookingApi } from '../../services/bookingService';
import { transformItemToApi } from '../../utils/bookingTransform';

/**
 * CalendarSkeleton — Shown during first page load (isLoading + no therapists yet).
 * Mimics the real grid layout so there's no blank-screen flicker.
 */
function CalendarSkeleton() {
  const COLS = 7;
  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden animate-pulse bg-white">
      {/* Header row */}
      <div className="flex flex-shrink-0 border-b border-gray-200" style={{ height: 60 }}>
        <div className="flex-shrink-0 border-r border-gray-200 bg-gray-50" style={{ width: 60 }} />
        {Array.from({ length: COLS }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col items-center justify-center gap-1 border-r border-gray-200 px-2"
            style={{ width: 180, minWidth: 180 }}
          >
            <div className="w-8 h-8 rounded-full bg-gray-200" />
            <div className="w-24 h-2.5 rounded bg-gray-200" />
            <div className="w-14 h-2 rounded bg-gray-100" />
          </div>
        ))}
      </div>
      {/* Grid body */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-shrink-0 border-r border-gray-200 bg-gray-50" style={{ width: 60 }} />
        {Array.from({ length: COLS }).map((_, col) => (
          <div
            key={col}
            className="border-r border-gray-200 px-1.5 pt-2 space-y-2"
            style={{ width: 180, minWidth: 180 }}
          >
            {[80, 56, 96, 64].map((h, row) => (
              <div
                key={row}
                className="rounded-md bg-gray-100"
                style={{ height: h, marginTop: row === 0 ? 32 : 0 }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * CalendarGrid — Main calendar component
 * Props: selectedDate (Date), onDateChange (func), onBookingClick (func)
 * Uses useVirtualGrid for 2D virtualization
 * Owns DragDropContext with onDragEnd handler
 * Renders: CalendarHeader, TimeGutter, TherapistColumn[]
 * Shows current time line (red bar)
 * Container with fixed height/width, overflow scroll
 */
function CalendarGrid({ selectedDate, onDateChange, onBookingClick, filters = {} }) {
  const containerRef = useRef(null);
  const { bookings, rescheduleOptimistic, rescheduleRollback, clearPageCache } = useBookings();
  const therapists = useMergedTherapists(); // Already normalized and merged
  const { addToast } = useUI();
  const columnWidth = useColumnWidth(); // Responsive: 110–180px based on viewport

  // Track pointer position so we can compute time slot on drag-drop
  const lastPointerRef = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const handler = (e) => {
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('pointermove', handler, { passive: true });
    return () => window.removeEventListener('pointermove', handler);
  }, []);

  // Therapists are already normalized by useMergedTherapists (includes all therapists + bookings)
  const therapistCount = therapists.length || 0;

  const virtualGrid = useVirtualGrid({
    totalColumns: therapistCount,
    totalRows: TOTAL_SLOTS,
    columnWidth,
    rowHeight: SLOT_HEIGHT,
    overscanColumns: 3,
    overscanRows: 5,
    containerRef,
  });

  const totalWidth = therapistCount * columnWidth;
  const totalHeight = TOTAL_SLOTS * SLOT_HEIGHT;

  // Get visible therapists based on virtualization
  const visibleTherapists = React.useMemo(() => {
    if (!Array.isArray(therapists) || therapists.length === 0) return [];
    return therapists.slice(
      virtualGrid.visibleColumnRange.start,
      virtualGrid.visibleColumnRange.end
    );
  }, [therapists, virtualGrid.visibleColumnRange]);

  // Convert bookings Map to array and apply filters
  const bookingsList = React.useMemo(() => {
    let filtered = Array.from(bookings.values());
    logger.debug('CalendarGrid', 'Processing bookings', {
      totalInMap: bookings.size,
      convertedToArray: filtered.length,
      filters: Object.keys(filters).length > 0 ? filters : 'none',
    });

    // Apply therapist group filter
    if (filters.therapistGroup && filters.therapistGroup !== 'All' && filters.therapistGroup !== 'All Therapist') {
      filtered = filtered.filter(booking => {
        const therapist = therapists.find(t => Number(t.id) === Number(booking.therapist_id));
        if (!therapist) return false;
        return therapist.gender?.toLowerCase() === filters.therapistGroup.toLowerCase();
      });
    }

    // Apply specific therapist filter
    if (filters.selectedTherapists && filters.selectedTherapists.length > 0) {
      filtered = filtered.filter(booking =>
        filters.selectedTherapists.includes(booking.therapist_id)
      );
    }

    // Apply room filter
    if (filters.rooms && filters.rooms.length > 0) {
      filtered = filtered.filter(booking =>
        filters.rooms.includes(booking.room_id)
      );
    }

    // Apply booking status filter
    if (filters.bookingStatus && Object.keys(filters.bookingStatus).length > 0) {
      const enabledStatuses = Object.entries(filters.bookingStatus)
        .filter(([_, enabled]) => enabled)
        .map(([status]) => status);

      if (enabledStatuses.length > 0 && enabledStatuses.length < Object.keys(filters.bookingStatus).length) {
        filtered = filtered.filter(booking => {
          const status = (booking.status || '').toLowerCase();
          // Map API status to filter status keys
          const statusMap = {
            'confirmed': 'confirmed',
            'unconfirmed': 'unconfirmed',
            'checked in': 'checkedIn',
            'completed': 'completed',
            'cancelled': 'cancelled',
            'no show': 'noShow',
            'holding': 'holding',
            'in progress': 'checkInProgress',
            'check-in in progress': 'checkInProgress',
          };
          const filterKey = statusMap[status] || status;
          return enabledStatuses.includes(filterKey);
        });
      }
    }

    logger.debug('CalendarGrid', 'Final booking list after filters', {
      count: filtered.length,
      samples: filtered.slice(0, 3).map(b => ({
        id: b.id,
        therapist_id: b.therapist_id,
        therapist_name: b.therapist_name,
        service_name: b.service_name,
        start_time: b.start_time,
      })),
    });

    return filtered;
  }, [bookings, filters, therapists]);

  // Pre-group bookings by therapist to eliminate O(n*k) per-column filtering
  const bookingsByTherapist = React.useMemo(() => {
    const map = new Map();
    for (const booking of bookingsList) {
      const tid = Number(booking.therapist_id);
      if (!map.has(tid)) map.set(tid, []);
      map.get(tid).push(booking);
    }
    return map;
  }, [bookingsList]);

  // Only log on initial mount or when key data changes
  React.useEffect(() => {
    logger.debug('CalendarGrid', 'Bookings loaded', {
      count: bookingsList.length,
      therapistCount: therapists?.length,
    });
  }, [bookingsList.length, therapists?.length]);

  /**
   * Handle native drop: reschedule booking to new therapist and/or time
   * Called from TherapistColumn's native onDrop with (bookingId, targetTherapistId).
   * Computes new time from pointer Y position relative to the grid.
   */
  const handleDrop = useCallback(
    async (bookingId, targetTherapistId, dropClientY) => {
      const currentBooking = bookings.get(bookingId);

      if (!currentBooking) {
        logger.warn('CalendarGrid', 'Booking not found', { bookingId });
        return;
      }

      const sourceTherapistId = Number(currentBooking.therapist_id);

      const previousState = { ...currentBooking };
      const updateData = {};

      // Update therapist if changed
      if (targetTherapistId !== sourceTherapistId) {
        const newTherapist = therapists.find(t => Number(t.id) === targetTherapistId);
        updateData.therapist_id = targetTherapistId;
        updateData.therapist_name = newTherapist?.name;

        logger.info('CalendarGrid', 'Rescheduling to different therapist', {
          bookingId,
          oldTherapistId: sourceTherapistId,
          newTherapistId: targetTherapistId,
        });
      }

      // Compute new time from pointer Y position relative to the grid
      const container = containerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        const scrollTop = container.scrollTop;
        // Grid content starts 60px below container top (header row height)
        const gridY = Math.max(0, dropClientY - rect.top + scrollTop - 60);
        const snappedMinutes = snapToNearestSlot(gridY);
        const newTime = minutesToTimeString(snappedMinutes);
        const duration = currentBooking.duration || 60;

        if (newTime !== currentBooking.start_time) {
          updateData.start_time = newTime;
          updateData.end_time = calculateEndTime(newTime, duration);
          // service_at for API: DD-MM-YYYY HH:MM:SS
          if (currentBooking.date) {
            updateData.service_at = `${currentBooking.date} ${newTime}:00`;
          }
          logger.info('CalendarGrid', 'Rescheduling to different time', {
            bookingId,
            oldTime: currentBooking.start_time,
            newTime,
          });
        }
      }

      // No changes detected — dropped in same position
      if (Object.keys(updateData).length === 0) {
        logger.debug('CalendarGrid', 'Dropped in same position, no update needed');
        return;
      }

      // Build items in API format with updated times/therapist
      // API requires: service (numeric), price, quantity, start_time, end_time, therapist, etc.
      if (currentBooking.items?.length > 0) {
        updateData.items = currentBooking.items.map((item, idx) => {
          const merged = {
            ...item,
            start_time: updateData.start_time || item.start_time,
            end_time: updateData.end_time || item.end_time,
            therapist_id: updateData.therapist_id !== undefined ? updateData.therapist_id : item.therapist_id,
          };
          return transformItemToApi(merged, idx, currentBooking.customer_name);
        });
      }

      // Apply optimistic update — UI moves immediately
      try {
        rescheduleOptimistic(bookingId, updateData);

        logger.debug('CalendarGrid', 'Applied optimistic update', {
          bookingId,
          updates: updateData,
        });

        // Call API directly — bypasses context.updateBooking's UPDATE_SUCCESS
        // which would overwrite the optimistic state with stale API-transformed data
        await updateBookingApi(bookingId, updateData, currentBooking);
        clearPageCache();

        logger.info('CalendarGrid', 'Booking updated successfully', { bookingId });

        // Show specific success message based on what changed
        const parts = [];
        if (updateData.therapist_id && updateData.therapist_id !== currentBooking.therapist_id) {
          const newTherapist = therapists.find(t => Number(t.id) === updateData.therapist_id);
          parts.push(newTherapist?.name || 'new therapist');
        }
        if (updateData.start_time) {
          parts.push(updateData.start_time);
        }
        const successMessage = parts.length > 0
          ? `Rescheduled to ${parts.join(' at ')}`
          : 'Booking updated successfully';
        addToast(successMessage, 'success');
      } catch (error) {
        // Rollback on error — card returns to original position
        rescheduleRollback(bookingId, previousState);
        logger.error('CalendarGrid', 'Update failed', error.message);

        const errorMsg = error.response?.data?.message || error.message || 'Failed to reschedule';
        addToast(`Failed: ${errorMsg}`, 'error', 5000);
      }
    },
    [bookings, therapists, rescheduleOptimistic, rescheduleRollback, clearPageCache, addToast]
  );

  // First-load skeleton — shown while therapists + first page are being fetched
  if ((!therapists || therapists.length === 0) && bookingsList.length === 0) {
    return <CalendarSkeleton />;
  }

  return (
      <div className="relative flex flex-col flex-1 bg-white min-h-0 overflow-hidden">

        {/* Main calendar area */}
        <div className="flex flex-1 overflow-hidden bg-white min-h-0 relative">
          {/* Scrollable calendar grid (includes TimeGutter + CalendarHeader inside for proper positioning) */}
          <div
            ref={containerRef}
            className="flex-1 overflow-x-auto overflow-y-auto relative bg-white"
            style={{
              minWidth: 0, // Important for flex layout
              minHeight: 0, // Important for flex layout with vertical scroll
              scrollBehavior: 'smooth',
            }}
          >
            {/* Header row - CalendarHeader scrolls horizontally but sticks to top */}
            <div className="flex" style={{ minWidth: `${totalWidth + 60}px`, width: '100%', height: '60px' }}>
              {/* TimeGutter corner spacer (60px x 60px) */}
              <div className="flex-shrink-0 bg-white border-r border-b border-gray-300" style={{ width: '60px', height: '60px' }} />

              {/* CalendarHeader - now inside scroll container with sticky top-0 */}
              <div className="flex-1 sticky top-0 z-20 bg-white border-b border-gray-300 overflow-hidden" style={{ width: `${totalWidth}px` }}>
                <CalendarHeader
                  containerRef={containerRef}
                  virtualGrid={virtualGrid}
                  therapists={therapists}
                  bookings={bookingsList}
                  columnWidth={columnWidth}
                />
              </div>
            </div>

            {/* Grid content row - TimeGutter sticky on left, Grid scrolls */}
            <div
              className="flex"
              style={{
                minWidth: `${totalWidth + 60}px`,
                width: '100%',
                height: `${totalHeight}px`,
                backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${SLOT_HEIGHT - 1}px, #f0f0f0 ${SLOT_HEIGHT - 1}px, #f0f0f0 ${SLOT_HEIGHT}px)`,
              }}
            >
              {/* Time gutter (left sidebar) - sticky on left, scrolls vertically */}
              <TimeGutter containerRef={containerRef} />

              {/* Virtual grid container */}
              <div
                className="relative flex-1"
                style={{
                  width: `${totalWidth}px`,
                  height: `${totalHeight}px`,
                  willChange: 'transform',
                }}
              >
              {/* Render visible therapist columns */}
              <div
                style={{
                  display: 'flex',
                  position: 'absolute',
                  top: 0,
                  left: `${virtualGrid.offsetLeft}px`,
                  width: `${
                    (virtualGrid.visibleColumnRange.end - virtualGrid.visibleColumnRange.start) *
                    columnWidth
                  }px`,
                }}
              >
                {visibleTherapists.map((therapist, idx) => {
                  const globalIndex = virtualGrid.visibleColumnRange.start + idx;
                  const therapistBookings = bookingsByTherapist.get(therapist.id) || [];
                  return (
                    <TherapistColumn
                      key={`therapist-col-${therapist.id}`}
                      therapist={therapist}
                      therapistIndex={globalIndex}
                      bookings={therapistBookings}
                      selectedDate={selectedDate}
                      onBookingClick={onBookingClick}
                      onDrop={handleDrop}
                      columnWidth={180}
                      visibleRowRange={virtualGrid.visibleRowRange}
                    />
                  );
                })}
              </div>

              {/* Current time line indicator */}
              <CurrentTimeLine totalWidth={totalWidth} />
            </div>
            {/* end: virtual grid container */}
          </div>
          {/* end: scrollable container */}

        </div>
        {/* end: scrollable container */}
        </div>
        {/* end: main calendar area */}
      </div>
  );
}

export default React.memo(CalendarGrid, (prevProps, nextProps) => {
  // Shallow comparison of props - re-render if any prop changes
  return (
    prevProps.selectedDate === nextProps.selectedDate &&
    prevProps.onDateChange === nextProps.onDateChange &&
    prevProps.onBookingClick === nextProps.onBookingClick &&
    prevProps.filters === nextProps.filters
  );
});
