import React, { useEffect, useRef, useCallback } from 'react';
import CalendarGrid from '../components/calendar/CalendarGrid';
import PaginationControls from '../components/common/PaginationControls';
import useMasterData from '../hooks/useMasterData';
import useBookings from '../hooks/useBookings';
import { useUI } from '../hooks/useUI';
import logger from '../utils/logger';
import { toApiDate } from '../utils/dateUtils';

const CalendarPage = ({ filters = {} }) => {
  const { selectedDate, setSelectedDate, openPanel } = useUI();
  const { bookings, fetchBatch, batchPage, totalBatches, setSelectedBooking, pagination, isLoading, loadingProgress } = useBookings();
  const { loadTherapists, loadRooms } = useMasterData();

  // Store date range for batch navigation
  const dateRangeRef = useRef({ startDate: null, endDate: null });

  // Guard against double-fetching: track the date range we last fetched
  // If date range hasn't changed, don't re-fetch (prevents API hammering on re-renders)
  const lastFetchedRef = useRef({ startDate: null, endDate: null });

  // Load bookings and therapists when date changes
  useEffect(() => {
    const loadData = async () => {
      try {
        // Ensure selectedDate is a Date object
        let d;
        if (selectedDate instanceof Date) {
          d = selectedDate;
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

        // Guard: don't re-fetch if date range hasn't changed
        // This prevents API hammering when component re-renders but data hasn't changed
        const lastFetched = lastFetchedRef.current;
        if (lastFetched.startDate === startDate && lastFetched.endDate === endDate) {
          logger.debug('CalendarPage', 'Date range unchanged, skipping fetch');
          return;
        }

        // Update last fetched date range and reset batch to 1
        lastFetchedRef.current = { startDate, endDate };
        dateRangeRef.current = { startDate, endDate };

        // Fetch bookings and therapists in parallel
        // Use batch page 1 when date range changes
        await Promise.all([
          fetchBatch(startDate, endDate, 1),
          loadTherapists(serviceAt),
        ]);

        // Preload rooms for selected date
        await loadRooms(startDate);
      } catch (error) {
        logger.error('CalendarPage', 'Failed to load data', error);
      }
    };

    loadData();
  }, [selectedDate, fetchBatch, loadTherapists, loadRooms]);

  const handleBookingClick = (bookingId) => {
    logger.debug('CalendarPage', 'Booking clicked', { bookingId });
    setSelectedBooking(bookingId);
    openPanel('detail', bookingId);
  };

  const handleCreateBooking = () => {
    logger.debug('CalendarPage', 'Create booking clicked');
    openPanel('create');
  };

  const handleDateChange = (newDate) => {
    setSelectedDate(newDate);
  };

  const handleNextBatch = useCallback(() => {
    const { startDate, endDate } = dateRangeRef.current;
    if (startDate && endDate && batchPage < totalBatches) {
      fetchBatch(startDate, endDate, batchPage + 1);
    }
  }, [fetchBatch, batchPage, totalBatches]);

  const handlePrevBatch = useCallback(() => {
    const { startDate, endDate } = dateRangeRef.current;
    if (startDate && endDate && batchPage > 1) {
      fetchBatch(startDate, endDate, batchPage - 1);
    }
  }, [fetchBatch, batchPage]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Calendar Grid — scrollable, takes remaining space */}
      <div className="flex-1 overflow-auto min-h-0">
        <CalendarGrid
          selectedDate={selectedDate}
          onDateChange={handleDateChange}
          onBookingClick={handleBookingClick}
          filters={filters}
        />
      </div>

      {/* Pagination Controls — fixed footer, always visible */}
      <div className="flex-shrink-0 border-t border-gray-200">
        <PaginationControls
          pagination={pagination}
          onLoadMore={null}
          isLoading={isLoading}
          loadedCount={bookings.size}
          loadingProgress={loadingProgress}
          batchPage={batchPage}
          totalBatches={totalBatches}
          onNextBatch={handleNextBatch}
          onPrevBatch={handlePrevBatch}
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
