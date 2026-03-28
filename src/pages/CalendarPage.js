import React, { useEffect, useRef, useCallback } from 'react';
import CalendarGrid from '../components/calendar/CalendarGrid';
import PaginationControls from '../components/common/PaginationControls';
import useMasterData from '../hooks/useMasterData';
import useBookings from '../hooks/useBookings';
import { useUI } from '../hooks/useUI';
import logger from '../utils/logger';
import { toApiDate } from '../utils/dateUtils';

const CalendarPage = ({ filters = {} }) => {
  const { selectedDate, setSelectedDate, openPanel, refreshKey } = useUI();
  const { bookings, fetchPage, setSelectedBooking, pagination, isLoading, isPageLoading } = useBookings();
  const { loadTherapists, loadRooms } = useMasterData();

  // Store date range for batch navigation
  const dateRangeRef = useRef({ startDate: null, endDate: null });

  // Guard against double-fetching: track the date range we last fetched
  // If date range hasn't changed, don't re-fetch (prevents API hammering on re-renders)
  const lastFetchedRef = useRef({ startDate: null, endDate: null });
  const prevRefreshKeyRef = useRef(refreshKey);

  // Load bookings and therapists when date changes
  useEffect(() => {
    const loadData = async () => {
      try {
        // Ensure selectedDate is a Date object — always clone to avoid mutating UIContext state
        let d;
        if (selectedDate instanceof Date) {
          d = new Date(selectedDate); // clone — do NOT mutate the original
        } else if (typeof selectedDate === 'string') {
          // Parse string date (YYYY-MM-DD format)
          const [year, month, day] = selectedDate.split('-');
          d = new Date(year, parseInt(month) - 1, parseInt(day));
        } else {
          d = new Date();
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        d.setHours(0, 0, 0, 0);

        // If selected date is in the past, fetch from selected date to today
        // Otherwise, fetch just that day (single day)
        let startDate = toApiDate(d);
        let endDate;

        if (d.getTime() < today.getTime()) {
          // Past date: fetch from selected date to tomorrow (to include all of today)
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          endDate = toApiDate(tomorrow);
          logger.debug('CalendarPage', 'Loading past date range', { startDate, endDate });
        } else {
          // Today or future: fetch just that single day
          const tomorrow = new Date(d);
          tomorrow.setDate(tomorrow.getDate() + 1);
          endDate = toApiDate(tomorrow);
          logger.debug('CalendarPage', 'Loading single day', { startDate, endDate });
        }

        // Build serviceAt for current time (DD-MM-YYYY HH:MM:SS)
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        const serviceAt = `${startDate} ${hh}:${mm}:00`;

        logger.debug('CalendarPage', 'Loading data', { startDate, endDate, serviceAt });

        // Check if this is a forced refresh (Today button clicked)
        const isForceRefresh = refreshKey !== prevRefreshKeyRef.current;
        prevRefreshKeyRef.current = refreshKey;

        // Guard: don't re-fetch if date range hasn't changed (unless forced)
        // This prevents API hammering when component re-renders but data hasn't changed
        const lastFetched = lastFetchedRef.current;
        if (!isForceRefresh && lastFetched.startDate === startDate && lastFetched.endDate === endDate) {
          logger.debug('CalendarPage', 'Date range unchanged, skipping fetch');
          return;
        }

        // Update last fetched date range and reset batch to 1
        lastFetchedRef.current = { startDate, endDate };
        dateRangeRef.current = { startDate, endDate };

        // Fetch page 1 (isFirstLoad=true clears map + shows skeleton) + therapists in parallel
        await Promise.all([
          fetchPage(startDate, endDate, 1, 1, true),
          loadTherapists(serviceAt),
        ]);

        // Preload rooms for selected date
        await loadRooms(startDate);
      } catch (error) {
        logger.error('CalendarPage', 'Failed to load data', error);
      }
    };

    loadData();
  }, [selectedDate, refreshKey, fetchPage, loadTherapists, loadRooms]);

  const handleBookingClick = (bookingId) => {
    logger.debug('CalendarPage', 'Booking clicked', { bookingId });
    setSelectedBooking(bookingId);
    openPanel('detail', bookingId);
  };

  const handleDateChange = (newDate) => {
    setSelectedDate(newDate);
  };

  const handleNextPage = useCallback(() => {
    const { startDate, endDate } = dateRangeRef.current;
    if (startDate && endDate && pagination.currentPage < pagination.lastPage) {
      fetchPage(startDate, endDate, pagination.currentPage + 1);
    }
  }, [fetchPage, pagination.currentPage, pagination.lastPage]);

  const handlePrevPage = useCallback(() => {
    const { startDate, endDate } = dateRangeRef.current;
    if (startDate && endDate && pagination.currentPage > 1) {
      fetchPage(startDate, endDate, pagination.currentPage - 1);
    }
  }, [fetchPage, pagination.currentPage]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Calendar Grid — scrollable, takes remaining space */}
      {/* overflow-hidden (not overflow-auto) so CalendarGrid's own containerRef is the sole scroll container.
          flex flex-col gives CalendarGrid a proper flex parent so its flex-1 is bounded by the viewport height,
          preventing the wrapper from growing to natural content height (~2460px) and spawning a competing
          vertical scrollbar that would steal ~15px of horizontal width and let the grid scroll past the last column. */}
      <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
        <CalendarGrid
          selectedDate={selectedDate}
          onDateChange={handleDateChange}
          onBookingClick={handleBookingClick}
          filters={filters}
        />
      </div>

      {/* Pagination Controls — fixed footer */}
      <div className="flex-shrink-0 border-t border-gray-200">
        <PaginationControls
          pagination={pagination}
          isLoading={isLoading || isPageLoading}
          loadedCount={bookings.size}
          onNextPage={handleNextPage}
          onPrevPage={handlePrevPage}
        />
      </div>

      {/* Floating action button for creating new booking */}
      {/* <button
        onClick={handleCreateBooking}
        className="fixed bottom-8 right-8 w-14 h-14 bg-brand text-white rounded-full shadow-lg hover:shadow-xl hover:bg-brand/90 transition-all flex items-center justify-center text-2xl z-30"
        title="Create new booking"
      >
        +
      </button> */}
    </div>
  );
};

export default CalendarPage;
