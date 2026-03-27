import { useEffect, useState } from 'react';
import { login } from '../services/authService.js';
import { getBookings, getTherapists } from '../services/bookingService.js';

/**
 * useBootstrapApp hook
 * Orchestrates the app bootstrap flow:
 * 1. Call login API with hardcoded credentials
 * 2. Store token in sessionStorage
 * 3. Fetch initial booking data
 * 4. Set ready state
 *
 * Returns: { isReady, error, isLoading, retry, initialBookings, therapists }
 */
export function useBootstrapApp() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [initialBookings, setInitialBookings] = useState([]);
  const [therapists, setTherapists] = useState([]);

  useEffect(() => {
    let isMounted = true; // Prevent state update after unmount

    const bootstrap = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Step 1: Login with hardcoded credentials
        console.log('📍 Bootstrapping app: Logging in...');
        await login(
          'react@hipster-inc.com',
          'React@123',
          '07ba959153fe7eec778361bf42079439'
        );

        // Step 2: Fetch initial booking data (test protected endpoint)
        console.log('📍 Fetching initial booking data...');
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const formatDate = (date) => {
          const d = String(date.getDate()).padStart(2, '0');
          const m = String(date.getMonth() + 1).padStart(2, '0');
          const y = date.getFullYear();
          return `${d}-${m}-${y}`;
        };

        const startDate = formatDate(today);
        const endDate = formatDate(tomorrow);

        // Build serviceAt for current time (DD-MM-YYYY HH:MM:SS)
        const hours = String(today.getHours()).padStart(2, '0');
        const minutes = String(today.getMinutes()).padStart(2, '0');
        const serviceAtNow = `${startDate} ${hours}:${minutes}:00`;

        // Fetch bookings and therapists in parallel
        const [bookings, therapistsData] = await Promise.all([
          getBookings(startDate, endDate),
          getTherapists(serviceAtNow),
        ]);

        // Step 3: Mark app as ready
        if (isMounted) {
          setInitialBookings(bookings);
          setTherapists(therapistsData);
          console.log('✅ App bootstrap complete');
          setIsReady(true);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('❌ Bootstrap failed:', err.message);
        if (isMounted) {
          setError(err.message || 'Failed to initialize app');
          setIsLoading(false);
        }
      }
    };

    bootstrap();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, []);

  const retry = () => {
    window.location.reload();
  };

  return { isReady, error, isLoading, retry, initialBookings, therapists };
}
