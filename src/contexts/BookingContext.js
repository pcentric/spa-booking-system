// Booking Context — CRUD operations, optimistic DnD updates, 2000 booking management
// Uses Map<id, booking> for O(1) lookup during drag-drop
import React, { useReducer, useCallback } from 'react';
import * as bookingService from '../services/bookingService';
import { transformBookingFromApi, transformBookingsFromApi, transformBookingToApi } from '../utils/bookingTransform';
import logger from '../utils/logger';

const BookingContext = React.createContext(null);

const initialState = {
  bookings: new Map(), // Map<id, booking> for O(1) lookup
  selectedBookingId: null,
  isLoading: false,
  isSubmitting: false,
  error: null,
  filters: {
    dateRange: null,
    outlet: 1,
  },
  pagination: {
    limit: 100,
    offset: 0,
    total: 0,
    hasMore: false,
    currentPage: 1,
    totalPages: 0,
  },
  isLoadingMore: false,
};

function bookingReducer(state, action) {
  switch (action.type) {
    case 'FETCH_REQUEST':
      return { ...state, isLoading: true, error: null };

    case 'FETCH_SUCCESS': {
      const map = new Map();
      const bookings = action.payload.bookings || action.payload;

      console.log('📦 FETCH_SUCCESS Reducer:', {
        isArray: Array.isArray(bookings),
        count: Array.isArray(bookings) ? bookings.length : 0,
        sampleBooking: Array.isArray(bookings) ? bookings[0] : null,
      });

      if (Array.isArray(bookings)) {
        bookings.forEach((booking, idx) => {
          if (!booking.id) {
            console.warn(`⚠️ Booking ${idx} has no ID:`, booking);
          }
          map.set(booking.id, booking);
        });
      }

      console.log('✅ Map Created with', map.size, 'bookings');

      return {
        ...state,
        bookings: map,
        isLoading: false,
        pagination: action.payload.pagination || state.pagination,
      };
    }

    case 'LOAD_MORE_REQUEST':
      return { ...state, isLoadingMore: true, error: null };

    case 'LOAD_MORE_SUCCESS': {
      const map = new Map(state.bookings);
      const bookings = action.payload.bookings || [];
      bookings.forEach(booking => {
        map.set(booking.id, booking);
      });
      return {
        ...state,
        bookings: map,
        isLoadingMore: false,
        pagination: action.payload.pagination || state.pagination,
      };
    }

    case 'LOAD_MORE_FAILURE':
      return { ...state, isLoadingMore: false, error: action.payload };

    case 'FETCH_FAILURE':
      return { ...state, isLoading: false, error: action.payload };

    case 'SELECT_BOOKING':
      return { ...state, selectedBookingId: action.payload };

    case 'CREATE_REQUEST':
      return { ...state, isSubmitting: true, error: null };

    case 'CREATE_SUCCESS': {
      const newMap = new Map(state.bookings);
      newMap.set(action.payload.id, action.payload);
      return {
        ...state,
        bookings: newMap,
        isSubmitting: false,
      };
    }

    case 'CREATE_FAILURE':
      return { ...state, isSubmitting: false, error: action.payload };

    case 'UPDATE_REQUEST':
      return { ...state, isSubmitting: true, error: null };

    case 'UPDATE_SUCCESS': {
      // Safety check: ensure payload has id before updating
      if (!action.payload || !action.payload.id) {
        logger.warn('BookingContext', 'UPDATE_SUCCESS received invalid payload', { payload: action.payload });
        return { ...state, isSubmitting: false };
      }
      const updatedMap = new Map(state.bookings);
      updatedMap.set(action.payload.id, action.payload);
      return {
        ...state,
        bookings: updatedMap,
        selectedBookingId: action.payload.id,
        isSubmitting: false,
      };
    }

    case 'UPDATE_FAILURE':
      return { ...state, isSubmitting: false, error: action.payload };

    // Drag-and-drop optimistic update
    case 'RESCHEDULE_OPTIMISTIC': {
      const optimisticMap = new Map(state.bookings);
      const booking = optimisticMap.get(action.payload.id);
      if (booking) {
        optimisticMap.set(action.payload.id, {
          ...booking,
          ...action.payload.changes,
        });
      }
      return { ...state, bookings: optimisticMap };
    }

    // Rollback on DnD failure
    case 'RESCHEDULE_ROLLBACK': {
      const rollbackMap = new Map(state.bookings);
      const booking = rollbackMap.get(action.payload.id);
      if (booking && action.payload.previousState) {
        rollbackMap.set(action.payload.id, action.payload.previousState);
      }
      return { ...state, bookings: rollbackMap, error: action.payload.error };
    }

    case 'DELETE_REQUEST':
      return { ...state, isSubmitting: true, error: null };

    case 'DELETE_SUCCESS': {
      const deletedMap = new Map(state.bookings);
      deletedMap.delete(action.payload);
      return {
        ...state,
        bookings: deletedMap,
        selectedBookingId: null,
        isSubmitting: false,
      };
    }

    case 'DELETE_FAILURE':
      return { ...state, isSubmitting: false, error: action.payload };

    case 'CANCEL_SUCCESS': {
      const cancelledMap = new Map(state.bookings);
      const booking = cancelledMap.get(action.payload);
      if (booking) {
        cancelledMap.set(action.payload, {
          ...booking,
          status: 'Cancelled',
        });
      }
      return { ...state, bookings: cancelledMap };
    }

    case 'SET_FILTERS':
      return { ...state, filters: action.payload };

    case 'CLEAR_ERROR':
      return { ...state, error: null };

    default:
      return state;
  }
}

export function BookingProvider({ children }) {
  const [state, dispatch] = useReducer(bookingReducer, initialState);

  const fetchBookings = useCallback(async (startDate, endDate, outlet = 1, limit = 100) => {
    dispatch({ type: 'FETCH_REQUEST' });
    try {
      console.log('📅 Fetching bookings for:', { startDate, endDate, outlet });
      const response = await bookingService.getBookings(startDate, endDate, outlet, limit, 0);
      console.log('✅ Bookings API response:', {
        rawCount: response.bookings?.length || 0,
        pagination: response.pagination,
      });

      const transformed = transformBookingsFromApi(response.bookings);
      console.log('✅ Transformed bookings:', {
        count: transformed.length,
        samples: transformed.slice(0, 2),
      });

      dispatch({ type: 'FETCH_SUCCESS', payload: { bookings: transformed, pagination: response.pagination } });
      logger.info('Booking', `Loaded ${transformed.length} bookings`, {
        page: response.pagination.currentPage,
        total: response.pagination.total,
      });
    } catch (error) {
      console.error('❌ Failed to fetch bookings:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
      const errorMsg = error.response?.data?.message || error.message || 'Failed to fetch bookings';
      dispatch({ type: 'FETCH_FAILURE', payload: errorMsg });
      logger.error('Booking', 'Failed to fetch bookings', error);
    }
  }, []);

  const loadMoreBookings = useCallback(async (startDate, endDate, outlet = 1, limit = 100) => {
    dispatch({ type: 'LOAD_MORE_REQUEST' });
    try {
      const currentOffset = state.pagination.offset + state.pagination.limit;
      const response = await bookingService.getBookings(startDate, endDate, outlet, limit, currentOffset);
      const transformed = transformBookingsFromApi(response.bookings);
      dispatch({ type: 'LOAD_MORE_SUCCESS', payload: { bookings: transformed, pagination: response.pagination } });
      logger.info('Booking', `Loaded more bookings`, {
        page: response.pagination.currentPage,
        total: response.pagination.total,
      });
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Failed to load more bookings';
      dispatch({ type: 'LOAD_MORE_FAILURE', payload: errorMsg });
    }
  }, [state.pagination.offset, state.pagination.limit]);

  const createBooking = useCallback(async (bookingData) => {
    dispatch({ type: 'CREATE_REQUEST' });
  
    try {
      logger.debug('Booking', 'Creating customer', {
        email: bookingData.customer_email
      });
  
      const customerId = await bookingService.createOrGetCustomer(bookingData);
  
      const bookingWithCustomer = {
        ...bookingData,
        customer_id: customerId,
      };
  
      logger.debug('Booking', 'Transforming booking data', { customerId });
  
      const transformedData = transformBookingToApi(null, bookingWithCustomer);
  
      logger.debug('Booking', 'Creating booking with customer', { customerId });
  
      const apiBooking = await bookingService.createBooking(transformedData);
  
      if (!apiBooking) {
        throw new Error('No booking data returned from API');
      }
  
      // Normalize id before transform
      const normalizedApiBooking = {
        ...apiBooking,
        id: apiBooking.id || apiBooking.booking_id || apiBooking.bookingId,
      };
  
      let transformed = transformBookingFromApi(normalizedApiBooking);
  
      // Fallback: fetch full booking detail if create response is partial
      if ((!transformed || !transformed.id) && normalizedApiBooking.id) {
        const fullBooking = await bookingService.getBookingDetail(normalizedApiBooking.id);
        transformed = fullBooking;
      }
  
      if (!transformed || !transformed.id) {
        console.error(
          'Transformed booking missing ID:',
          transformed,
          'from API response:',
          apiBooking
        );
        throw new Error('Booking was created, but the API did not return a valid booking id');
      }
  
      dispatch({ type: 'CREATE_SUCCESS', payload: transformed });
      logger.info('Booking', 'Booking created', { id: transformed.id, customerId });
  
      return transformed;
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        'Failed to create booking';
  
      dispatch({ type: 'CREATE_FAILURE', payload: errorMsg });
      throw error;
    }
  }, []);

  const updateBooking = useCallback(async (bookingId, bookingData, currentBooking = null) => {
    dispatch({ type: 'UPDATE_REQUEST' });
    try {
      const apiBooking = await bookingService.updateBooking(bookingId, bookingData, currentBooking);

      if (!apiBooking) {
        throw new Error('No booking data returned from API update');
      }

      let transformed = transformBookingFromApi(apiBooking);

      // 🔥 Fallback: if transform fails, use existing booking
      if (!transformed || !transformed.id) {
        console.warn('⚠️ Transform failed, using current booking as fallback');
      
        transformed = {
          ...currentBooking,
          ...bookingData, // optional merge if needed
        };
      }
      if (!transformed || !transformed.id) {
        logger.error('Booking', 'Failed to transform API response', { apiBooking });
        throw new Error('Failed to transform booking data from API response');
      }

      dispatch({ type: 'UPDATE_SUCCESS', payload: transformed });
      logger.info('Booking', 'Booking updated', { id: transformed.id });
      return transformed;
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Failed to update booking';
      logger.error('Booking', 'Update failed', { bookingId, error: errorMsg });
      dispatch({ type: 'UPDATE_FAILURE', payload: errorMsg });
      throw error;
    }
  }, []);

  const rescheduleOptimistic = useCallback((bookingId, changes) => {
    const currentBooking = state.bookings.get(bookingId);
    if (currentBooking) {
      dispatch({ type: 'RESCHEDULE_OPTIMISTIC', payload: { id: bookingId, changes } });
    }
  }, [state.bookings]);

  const rescheduleRollback = useCallback((bookingId, previousState, error) => {
    dispatch({ type: 'RESCHEDULE_ROLLBACK', payload: { id: bookingId, previousState, error } });
  }, []);

  const deleteBooking = useCallback(async (bookingId) => {
    dispatch({ type: 'DELETE_REQUEST' });
    try {
      await bookingService.deleteBooking(bookingId);
      dispatch({ type: 'DELETE_SUCCESS', payload: bookingId });
      logger.info('Booking', 'Booking deleted', { id: bookingId });
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Failed to delete booking';
      dispatch({ type: 'DELETE_FAILURE', payload: errorMsg });
      throw error;
    }
  }, []);

  const cancelBooking = useCallback(async (bookingId, cancelType = 'normal') => {
    try {
      const booking = state.bookings.get(bookingId);
      // Cancel uses item_id (the first item in the booking), not the booking_id
      const itemId = booking?.item_id || booking?.items?.[0]?.id;
      if (!itemId) {
        throw new Error('No item ID found for cancellation');
      }
      await bookingService.cancelBooking(itemId, cancelType);
      dispatch({ type: 'CANCEL_SUCCESS', payload: bookingId });
      logger.info('Booking', 'Booking cancelled', { id: bookingId, itemId, type: cancelType });
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Failed to cancel booking';
      dispatch({ type: 'FETCH_FAILURE', payload: errorMsg });
      logger.error('Booking', 'Failed to cancel booking', error);
      throw error;
    }
  }, [state.bookings]);

  const setSelectedBooking = useCallback((bookingId) => {
    dispatch({ type: 'SELECT_BOOKING', payload: bookingId });
  }, []);

  const setFilters = useCallback((filters) => {
    dispatch({ type: 'SET_FILTERS', payload: filters });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const value = {
    bookings: state.bookings,
    bookingsList: Array.from(state.bookings.values()), // For easy iteration
    selectedBookingId: state.selectedBookingId,
    selectedBooking: state.selectedBookingId ? state.bookings.get(state.selectedBookingId) : null,
    isLoading: state.isLoading,
    isSubmitting: state.isSubmitting,
    isLoadingMore: state.isLoadingMore,
    error: state.error,
    filters: state.filters,
    pagination: state.pagination,
    fetchBookings,
    loadMoreBookings,
    createBooking,
    updateBooking,
    deleteBooking,
    cancelBooking,
    rescheduleOptimistic,
    rescheduleRollback,
    setSelectedBooking,
    setFilters,
    clearError,
  };

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export default BookingContext;
