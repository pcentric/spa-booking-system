import React, { useEffect, useRef } from 'react';
import CalendarGrid from '../components/calendar/CalendarGrid';
import useMasterData from '../hooks/useMasterData';
import useBookings from '../hooks/useBookings';
import { useUI } from '../hooks/useUI';
import logger from '../utils/logger';
import { toApiDate } from '../utils/dateUtils';

const CalendarPage = ({ filters = {} }) => {
  const { selectedDate, setSelectedDate, openPanel, refreshKey } = useUI();
  const { bookings, fetchBatch, setSelectedBooking, pagination, isLoading, isLoadingMore, loadingProgress } = useBookings();
  const { loadTherapists, loadRooms } = useMasterData();

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

        // Update last fetched date range
        lastFetchedRef.current = { startDate, endDate };

        // Fetch all bookings progressively (page 1 renders immediately, remaining pages load in parallel) + therapists
        await Promise.all([
          fetchBatch(startDate, endDate, 1, 1),
          loadTherapists(serviceAt),
        ]);

        // Preload rooms for selected date
        await loadRooms(startDate);
      } catch (error) {
        logger.error('CalendarPage', 'Failed to load data', error);
      }
    };

    loadData();
  }, [selectedDate, refreshKey, fetchBatch, loadTherapists, loadRooms]);

  const handleBookingClick = (bookingId) => {
    logger.debug('CalendarPage', 'Booking clicked', { bookingId });
    setSelectedBooking(bookingId);
    openPanel('detail', bookingId);
  };

  const handleDateChange = (newDate) => {
    setSelectedDate(newDate);
  };

  // Progressive loading progress
  const showProgress = isLoadingMore || (loadingProgress.total > 0 && loadingProgress.loaded < loadingProgress.total);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Calendar Grid — scrollable, takes remaining space */}
      <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
        <CalendarGrid
          selectedDate={selectedDate}
          onDateChange={handleDateChange}
          onBookingClick={handleBookingClick}
          filters={filters}
        />
      </div>

      {/* Loading progress footer — shown while remaining pages load in background */}
      {showProgress && (
        <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50 px-4 py-2">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span className="inline-block w-3 h-3 border-2 border-gray-300 border-t-orange-500 rounded-full animate-spin" />
            <span>
              Loading bookings… {loadingProgress.loaded > 0 && loadingProgress.total > 0
                ? `${loadingProgress.loaded} / ${loadingProgress.total}`
                : `${bookings.size} loaded`}
            </span>
          </div>
        </div>
      )}

      {/* Booking count summary — shown when all pages are loaded */}
      {!isLoading && !showProgress && pagination.count > 0 && (
        <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50 px-4 py-2">
          <span className="text-xs text-gray-600">
            <span className="text-green-600 font-bold mr-1">&#10003;</span>
            <span className="font-semibold text-gray-900">{bookings.size.toLocaleString()}</span> bookings loaded
          </span>
        </div>
      )}
    </div>
  );
};

export default CalendarPage;
