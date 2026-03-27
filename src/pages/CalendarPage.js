import React, { useEffect } from 'react';
import CalendarGrid from '../components/calendar/CalendarGrid';
import PaginationControls from '../components/common/PaginationControls';
import useMasterData from '../hooks/useMasterData';
import useBookings from '../hooks/useBookings';
import { useUI } from '../hooks/useUI';
import logger from '../utils/logger';
import { toApiDate } from '../utils/dateUtils';

const CalendarPage = ({ filters = {} }) => {
  const { selectedDate, setSelectedDate, openPanel } = useUI();
  const { fetchAllBookings, setSelectedBooking, pagination, isLoadingMore } = useBookings();
  const { loadTherapists, loadRooms } = useMasterData();


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

        const apiDate = toApiDate(d);
        const tomorrow = new Date(d);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const endDate = toApiDate(tomorrow);

        // Build serviceAt for current time (DD-MM-YYYY HH:MM:SS)
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        const serviceAt = `${apiDate} ${hh}:${mm}:00`;

        logger.debug('CalendarPage', 'Loading data', { apiDate, serviceAt });

        // Fetch bookings and therapists in parallel
        await Promise.all([
          fetchAllBookings(apiDate, endDate),
          loadTherapists(serviceAt),
        ]);

        // Preload rooms for selected date
        await loadRooms(apiDate);
      } catch (error) {
        logger.error('CalendarPage', 'Failed to load data', error);
      }
    };

    loadData();
  }, [selectedDate, fetchAllBookings, loadTherapists, loadRooms]);

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

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Calendar Grid */}
      <CalendarGrid
        selectedDate={selectedDate}
        onDateChange={handleDateChange}
        onBookingClick={handleBookingClick}
        filters={filters}
      />

      {/* Pagination Controls */}
      <PaginationControls
        pagination={pagination}
        onLoadMore={null}
        isLoadingMore={isLoadingMore}
      />

      {/* Floating action button for creating new booking */}
      <button
        onClick={handleCreateBooking}
        className="fixed bottom-8 right-8 w-14 h-14 bg-brand text-white rounded-full shadow-lg hover:shadow-xl hover:bg-brand/90 transition-all flex items-center justify-center text-2xl z-30"
        title="Create new booking"
      >
        +
      </button>
    </div>
  );
};

export default CalendarPage;
