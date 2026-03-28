// Booking Context — CRUD operations, optimistic DnD updates, 2000 booking management
// Uses Map<id, booking> for O(1) lookup during drag-drop
import React, { useReducer, useCallback, useRef } from 'react';
import * as bookingService from '../services/bookingService';
import { transformBookingFromApi, transformBookingsFromApi, transformBookingToApi } from '../utils/bookingTransform';
import logger from '../utils/logger';

const BookingContext = React.createContext(null);

const initialState = {
  bookings: new Map(), // Map<id, booking> for O(1) lookup
  selectedBookingId: null,
  isLoading: false,      // true on first page of a new date range → shows skeleton
  isPageLoading: false,  // true when navigating pages → shows overlay, keeps previous bookings visible
  isSubmitting: false,
  error: null,
  filters: {
    dateRange: null,
    outlet: 1,
  },
  // Pagination — page-based. Backend fields: currentPage, lastPage, count, total (= perPage)
  pagination: {
    currentPage: 1,
    lastPage: 1,
    perPage: 30,   // 30/page → faster first paint, snappier page switches
    count: 0,      // total bookings in DB for this date range
    hasMore: false, // currentPage < lastPage
  },
  isLoadingMore: false,
  loadingProgress: { loaded: 0, total: 0 },
  batchPage: 1,
  totalBatches: 0,
};

function bookingReducer(state, action) {
  switch (action.type) {
    case 'FETCH_REQUEST':
      return { ...state, isLoading: true, error: null, loadingProgress: { loaded: 0, total: 0 } };

    case 'FETCH_PROGRESS':
      return { ...state, loadingProgress: action.payload };

    case 'FETCH_SUCCESS': {
      const map = new Map();
      const bookings = action.payload.bookings || action.payload;

      if (Array.isArray(bookings)) {
        bookings.forEach((booking) => {
          map.set(booking.id, booking);
        });
      }

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

    case 'FETCH_BATCH_SUCCESS': {
      const map = new Map();
      const bookings = action.payload.bookings || [];
      if (Array.isArray(bookings)) {
        bookings.forEach((booking) => {
          map.set(booking.id, booking);
        });
      }
      return {
        ...state,
        bookings: map,
        isLoading: false,
        pagination: action.payload.pagination || state.pagination,
        batchPage: action.payload.batchPage || state.batchPage,
        totalBatches: action.payload.totalBatches || state.totalBatches,
        loadingProgress: { loaded: 0, total: 0 },
      };
    }

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

    // ── Page-based navigation ────────────────────────────────────────────
    // isFirstLoad=true  → new date range: clear bookings, show full skeleton
    // isFirstLoad=false → page navigation: keep bookings visible, show overlay spinner
    case 'FETCH_PAGE_REQUEST':
      if (action.payload.isFirstLoad) {
        return { ...state, bookings: new Map(), isLoading: true, isPageLoading: false, error: null };
      }
      return { ...state, isLoading: false, isPageLoading: true, error: null };

    case 'FETCH_PAGE_SUCCESS': {
      const pageMap = new Map();
      (action.payload.bookings || []).forEach(b => pageMap.set(b.id, b));
      return {
        ...state,
        bookings: pageMap,
        isLoading: false,
        isPageLoading: false,
        pagination: action.payload.pagination,
      };
    }

    case 'FETCH_PAGE_FAILURE':
      return { ...state, isLoading: false, isPageLoading: false, error: action.payload };

    default:
      return state;
  }
}

export function BookingProvider({ children }) {
  const [state, dispatch] = useReducer(bookingReducer, initialState);

  // ── Page-cache refs (no re-renders — pure performance layer) ────────────
  // pageCacheRef        Map<page, { bookings, pagination }>  fetched page snapshots
  // activeFetchRef      Set<page>   user-triggered fetches in flight
  // prefetchRef         Set<page>   silent background fetches in flight
  // prefetchPromisesRef Map<page, Promise>  lets fetchPage await a prefetch that is
  //                     already running instead of firing a duplicate API request
  // All four cleared when date range changes (isFirstLoad=true in fetchPage).
  const pageCacheRef        = useRef(new Map());
  const activeFetchRef      = useRef(new Set());
  const prefetchRef         = useRef(new Set());
  const prefetchPromisesRef = useRef(new Map());

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

      dispatch({ type: 'FETCH_SUCCESS', payload: { bookings: transformed, pagination: response.pagination } });
      logger.info('Booking', `Loaded ${transformed.length} bookings`, {
        page: response.pagination.currentPage,
        total: response.pagination.total,
      });
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Failed to fetch bookings';
      dispatch({ type: 'FETCH_FAILURE', payload: errorMsg });
      logger.error('Booking', 'Failed to fetch bookings', error);
    }
  }, []);

  const loadMoreBookings = useCallback(async (startDate, endDate, outlet = 1, limit = 500) => {
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

  // Auto-fetch all pages concurrently for large datasets
  const fetchAllBookings = useCallback(async (startDate, endDate, outlet = 1) => {
    dispatch({ type: 'FETCH_REQUEST' });
    try {
      // Fetch first page
      const firstResponse = await bookingService.getBookings(startDate, endDate, outlet, 500, 0);
      const firstTransformed = transformBookingsFromApi(firstResponse.bookings);

      // Dispatch first page immediately
      dispatch({ type: 'FETCH_SUCCESS', payload: { bookings: firstTransformed, pagination: firstResponse.pagination } });

      // Set initial progress: first page loaded
      dispatch({
        type: 'FETCH_PROGRESS',
        payload: {
          loaded: firstTransformed.length,
          total: firstResponse.pagination.total
        }
      });

      logger.info('Booking', `Loaded ${firstTransformed.length} bookings (page 1 of ${firstResponse.pagination.totalPages})`, {
        total: firstResponse.pagination.total,
      });

      // If there are more pages, fetch them concurrently
      if (firstResponse.pagination.hasMore && firstResponse.pagination.totalPages > 1) {
        const pagePromises = [];
        for (let page = 2; page <= firstResponse.pagination.totalPages; page++) {
          const offset = (page - 1) * 500;
          pagePromises.push(
            bookingService.getBookings(startDate, endDate, outlet, 500, offset)
          );
        }

        // Wait for all pages to load
        const remainingResponses = await Promise.all(pagePromises);

        // Merge all remaining bookings
        let allRemainingBookings = [];
        remainingResponses.forEach((response) => {
          allRemainingBookings = allRemainingBookings.concat(response.bookings || []);
        });

        const remainingTransformed = transformBookingsFromApi(allRemainingBookings);

        // Merge with first page results
        const allBookings = [...firstTransformed, ...remainingTransformed];
        const finalMap = new Map();
        allBookings.forEach((booking) => {
          finalMap.set(booking.id, booking);
        });

        // Update progress: all pages loaded
        dispatch({
          type: 'FETCH_PROGRESS',
          payload: {
            loaded: allBookings.length,
            total: firstResponse.pagination.total
          }
        });

        dispatch({
          type: 'FETCH_SUCCESS',
          payload: {
            bookings: allBookings,
            pagination: {
              ...firstResponse.pagination,
              hasMore: false,
              currentPage: firstResponse.pagination.totalPages,
            }
          }
        });

        // Clear loading progress after all pages loaded
        dispatch({ type: 'FETCH_PROGRESS', payload: { loaded: 0, total: 0 } });

        logger.info('Booking', `Loaded all ${allBookings.length} bookings (${firstResponse.pagination.totalPages} pages)`, {
          total: firstResponse.pagination.total,
        });
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Failed to fetch bookings';
      dispatch({ type: 'FETCH_FAILURE', payload: errorMsg });
      logger.error('Booking', 'Failed to fetch bookings', error);
    }
  }, []);

  // Parallel fetch — page 1 renders immediately; all remaining pages fire concurrently.
  // Uses Promise.allSettled so a single failing page never aborts the others.
  // Merges each page into the Map<id, booking> as it arrives — no duplicates by ID.
  const fetchBatch = useCallback(async (startDate, endDate, _batchPage = 1, outlet = 1) => {
    const PER_PAGE = 100;

    dispatch({ type: 'FETCH_REQUEST' });
    try {
      // ── Step 1: Fetch page 1 ────────────────────────────────────────────
      // This tells us lastPage so we know how many parallel requests to fire.
      const firstResponse = await bookingService.getBookings(
        startDate, endDate, outlet, PER_PAGE, 1
      );

      const { lastPage, count } = firstResponse.pagination;

      // Validate — if API returns a bad lastPage default to 1 page only
      const safeLastPage = (typeof lastPage === 'number' && lastPage >= 1) ? lastPage : 1;

      const firstTransformed = transformBookingsFromApi(firstResponse.bookings || []);

      // Show page 1 immediately — unblocks the calendar render
      dispatch({
        type: 'FETCH_BATCH_SUCCESS',
        payload: {
          bookings: firstTransformed,
          batchPage: 1,
          totalBatches: 1,   // Always 1 — no manual batch navigation needed
          pagination: {
            currentPage: 1,
            lastPage: safeLastPage,
            perPage: PER_PAGE,
            count,
            hasMore: safeLastPage > 1,  // hasMore = currentPage < lastPage
          },
        },
      });

      logger.info('Booking', `Page 1 loaded (${firstTransformed.length} bookings). lastPage=${safeLastPage}, total=${count}`);

      if (safeLastPage <= 1) return;

      // Use an atomic counter via closure — avoids shared-variable race in progress updates
      let loadedCount = firstTransformed.length;
      dispatch({ type: 'FETCH_PROGRESS', payload: { loaded: loadedCount, total: count } });

      // ── Step 2: Fire pages 2 … lastPage concurrently ───────────────────
      // Promise.allSettled — a single page failure does NOT abort the others.
      // Each successful page is merged into the existing Map as it arrives.
      const remainingPages = Array.from({ length: safeLastPage - 1 }, (_, i) => i + 2);

      logger.info('Booking', `Firing parallel requests for pages: [${remainingPages.join(', ')}]`);

      const results = await Promise.allSettled(
        remainingPages.map(page =>
          bookingService.getBookings(startDate, endDate, outlet, PER_PAGE, page)
            .then(response => {
              const transformed = transformBookingsFromApi(response.bookings || []);
              // LOAD_MORE_SUCCESS merges by ID: new Map(state.bookings) + set(id, booking)
              // Works correctly even when batched — useReducer applies each action sequentially
              dispatch({
                type: 'LOAD_MORE_SUCCESS',
                payload: { bookings: transformed, pagination: response.pagination },
              });
              loadedCount += transformed.length;
              dispatch({ type: 'FETCH_PROGRESS', payload: { loaded: loadedCount, total: count } });
              logger.info('Booking', `Page ${page} merged (${transformed.length} bookings)`);
              return transformed.length;
            })
        )
      );

      // Log any pages that failed without blocking the others
      results.forEach((result, i) => {
        if (result.status === 'rejected') {
          logger.error('Booking', `Page ${remainingPages[i]} failed`, result.reason?.message);
        }
      });

      dispatch({ type: 'FETCH_PROGRESS', payload: { loaded: 0, total: 0 } });
      logger.info('Booking', `All pages done — ${loadedCount} of ${count} bookings loaded`);
    } catch (error) {
      // Only hits here if page 1 itself fails
      const errorMsg = error.response?.data?.message || error.message || 'Failed to fetch bookings';
      dispatch({ type: 'FETCH_FAILURE', payload: errorMsg });
      logger.error('Booking', 'Page 1 fetch failed', error);
    }
  }, []);

  // ── prefetchPageSilent ───────────────────────────────────────────────────
  // Background prefetch: returns immediately, async work runs via an IIFE Promise.
  // NEVER dispatches to React state → zero re-renders, zero loading indicators.
  //
  // The Promise is stored in prefetchPromisesRef so fetchPage can AWAIT it
  // (prefetch-handoff) instead of firing a duplicate API request when the user
  // navigates to a page that is already being prefetched.
  //
  // Guards (all three must pass for the prefetch to fire):
  //   1. pageCacheRef has(page)   → already cached, skip
  //   2. activeFetchRef has(page) → user is actively fetching it, skip
  //   3. prefetchRef has(page)    → already prefetching, skip
  const prefetchPageSilent = useCallback((startDate, endDate, page, outlet) => {
    const PER_PAGE = 30;

    if (
      pageCacheRef.current.has(page) ||
      activeFetchRef.current.has(page) ||
      prefetchRef.current.has(page)
    ) return;

    prefetchRef.current.add(page);
    logger.debug('Booking', `Prefetching page ${page} silently…`);

    // IIFE so the function itself stays synchronous (returns undefined, not a Promise)
    const promise = (async () => {
      try {
        const response = await bookingService.getBookings(startDate, endDate, outlet, PER_PAGE, page);
        const { currentPage, lastPage, count } = response.pagination;
        const transformed = transformBookingsFromApi(response.bookings || []);

        // Cache only — no dispatch, no re-render
        pageCacheRef.current.set(page, {
          bookings: transformed,
          pagination: { currentPage, lastPage, perPage: PER_PAGE, count, hasMore: currentPage < lastPage },
        });
        logger.info('Booking', `Page ${page} prefetched silently (${transformed.length} bookings cached)`);
      } catch {
        // Silent — fetchPage will do a fresh active fetch if the user navigates here
        logger.debug('Booking', `Silent prefetch page ${page} failed — will fetch on demand`);
      } finally {
        prefetchRef.current.delete(page);
        prefetchPromisesRef.current.delete(page);
      }
    })();

    // Store promise for potential handoff in fetchPage
    prefetchPromisesRef.current.set(page, promise);
  }, []); // Stable: only touches refs (.current), no state deps

  // ── fetchPage — primary booking fetch ────────────────────────────────────
  //
  // Loader rules:
  //   isFirstLoad=true              → FETCH_PAGE_REQUEST clears map, shows full skeleton
  //   isFirstLoad=false, cache hit  → FETCH_PAGE_SUCCESS instantly, NO loader
  //   isFirstLoad=false, prefetch handoff → shows overlay, then resolves from cache (0 extra API calls)
  //   isFirstLoad=false, cache miss → shows overlay, active fetch, cache write
  //
  // Prefetch strategy — "keep next 2 pages warm":
  //   After any page renders (cache hit, handoff, or active fetch),
  //   we fire prefetchPageSilent for currentPage+1 AND currentPage+2.
  //   All guards inside prefetchPageSilent prevent duplicate/unnecessary calls.
  //   Net result:
  //     page 1 loaded  → prefetch [2, 3]
  //     page 2 reached → prefetch [3, 4] → 3 already in flight/cached, only 4 is new
  //     page 3 reached → prefetch [4, 5] → 4 already in cache,        only 5 is new
  //     page 4 reached → prefetch [5, 6] → 5 already in cache,        only 6 is new
  const fetchPage = useCallback(async (startDate, endDate, page = 1, outlet = 1, isFirstLoad = false) => {
    const PER_PAGE = 30;

    // Inline helper: schedule prefetch for next 2 pages.
    // prefetchPageSilent's internal guards handle all deduplication.
    const prewarm = (currentPage, lastPage) => {
      for (let i = 1; i <= 2; i++) {
        const target = currentPage + i;
        if (target <= lastPage) prefetchPageSilent(startDate, endDate, target, outlet);
      }
    };

    if (isFirstLoad) {
      // ── New date range: invalidate all caches ─────────────────────────
      pageCacheRef.current.clear();
      activeFetchRef.current.clear();
      prefetchRef.current.clear();
      prefetchPromisesRef.current.clear();
      dispatch({ type: 'FETCH_PAGE_REQUEST', payload: { isFirstLoad: true } });
      // Falls through to active fetch below
    } else {
      // ── 1. Cache hit: instant render, zero API call, no loader ────────
      const cached = pageCacheRef.current.get(page);
      if (cached) {
        dispatch({ type: 'FETCH_PAGE_SUCCESS', payload: { bookings: cached.bookings, pagination: cached.pagination } });
        logger.info('Booking', `Page ${page} → cache hit (${cached.bookings.length} bookings, 0 API calls)`);
        // Still prewarm next pages — navigation may have jumped or cache may have gaps
        prewarm(cached.pagination.currentPage, cached.pagination.lastPage);
        return;
      }

      // ── 2. Prefetch handoff: await in-flight prefetch, show overlay ───
      // If the user navigates to a page that is currently being prefetched,
      // we await the existing promise instead of firing a duplicate API request.
      const prefetchPromise = prefetchPromisesRef.current.get(page);
      if (prefetchPromise) {
        dispatch({ type: 'FETCH_PAGE_REQUEST', payload: { isFirstLoad: false } });
        logger.info('Booking', `Page ${page} prefetch in flight — awaiting handoff (no duplicate API call)`);
        await prefetchPromise;
        const nowCached = pageCacheRef.current.get(page);
        if (nowCached) {
          dispatch({ type: 'FETCH_PAGE_SUCCESS', payload: { bookings: nowCached.bookings, pagination: nowCached.pagination } });
          logger.info('Booking', `Page ${page} → served via prefetch handoff`);
          prewarm(nowCached.pagination.currentPage, nowCached.pagination.lastPage);
          return;
        }
        // Prefetch failed silently → fall through to active fetch
      }

      // ── 3. Duplicate active-fetch guard ──────────────────────────────
      if (activeFetchRef.current.has(page)) {
        logger.debug('Booking', `Page ${page} already fetching — skipping duplicate`);
        return;
      }

      dispatch({ type: 'FETCH_PAGE_REQUEST', payload: { isFirstLoad: false } });
    }

    // ── 4. Active fetch (cache miss or first load) ─────────────────────
    activeFetchRef.current.add(page);
    try {
      const response = await bookingService.getBookings(startDate, endDate, outlet, PER_PAGE, page);
      const { currentPage, lastPage, count } = response.pagination;
      const transformed = transformBookingsFromApi(response.bookings || []);
      const paginationData = { currentPage, lastPage, perPage: PER_PAGE, count, hasMore: currentPage < lastPage };

      dispatch({ type: 'FETCH_PAGE_SUCCESS', payload: { bookings: transformed, pagination: paginationData } });

      // Cache for future navigation
      pageCacheRef.current.set(page, { bookings: transformed, pagination: paginationData });
      logger.info('Booking', `Page ${page}/${lastPage} fetched → cached (${transformed.length} bookings)`);

      // Prewarm next 2 pages in background
      prewarm(currentPage, lastPage);
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Failed to load bookings';
      dispatch({ type: 'FETCH_PAGE_FAILURE', payload: errorMsg });
      logger.error('Booking', 'Page fetch failed', { page, error: errorMsg });
    } finally {
      activeFetchRef.current.delete(page);
    }
  }, [prefetchPageSilent]); // prefetchPageSilent is stable → fetchPage is stable

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
      // Invalidate page cache — a new booking may appear on any page
      pageCacheRef.current.clear();
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
      // Invalidate page cache — cached copies of this page now have stale booking data
      pageCacheRef.current.clear();
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
      // Invalidate page cache — page numbers shift after a deletion
      pageCacheRef.current.clear();
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
      // Invalidate page cache — cancelled booking's status changed in all cached pages
      pageCacheRef.current.clear();
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
    selectedBookingId: state.selectedBookingId,
    selectedBooking: state.selectedBookingId ? state.bookings.get(state.selectedBookingId) : null,
    isLoading: state.isLoading,
    isPageLoading: state.isPageLoading,
    isSubmitting: state.isSubmitting,
    isLoadingMore: state.isLoadingMore,
    error: state.error,
    filters: state.filters,
    pagination: state.pagination,
    loadingProgress: state.loadingProgress,
    batchPage: state.batchPage,
    totalBatches: state.totalBatches,
    fetchBookings,
    fetchAllBookings,
    fetchBatch,
    fetchPage,
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
