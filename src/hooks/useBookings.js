// Hook to consume BookingContext
import { useContext } from 'react';
import BookingContext from '../contexts/BookingContext';

export function useBookings() {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBookings must be used within BookingProvider');
  }
  return context;
}

export default useBookings;
