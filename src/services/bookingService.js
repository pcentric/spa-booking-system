import apiClient from './apiClient.js';
import { transformBookingDetailFromApi } from '../utils/bookingTransform';

/**
 * Fetch bookings for a date range with page-based pagination
 * Protected endpoint — requires token
 *
 * API is page-based (not offset-based). Backend pagination fields:
 * - currentPage: Which page we're requesting (1-indexed)
 * - lastPage: Total pages available
 * - count: Total bookings in database
 * - total: Items returned per page (misleading name, actually "per_page" count)
 *
 * @param {string} startDate - DD-MM-YYYY format
 * @param {string} endDate - DD-MM-YYYY format
 * @param {number} page - Page number, 1-indexed (default: 1)
 * @param {number} perPage - Items per page (default: 100)
 * @param {number} outlet - Outlet ID (default: 1)
 */
export async function getBookings(startDate, endDate, outlet = 1, perPage = 100, page = 1) {
  try {
    const response = await apiClient.get('/api/v1/bookings/outlet/booking/list', {
      params: {
        pagination: 1,
        daterange: `${startDate} / ${endDate}`,
        outlet,
        panel: 'outlet',
        view_type: 'calendar',
        per_page: perPage,
        page,
      },
    });

    // Defensive response parsing - handle multiple nested structures
    // Response format variations:
    // 1. { data: { data: { list: { bookings: [...], pagination: {...} } } } }
    // 2. { data: { list: { bookings: [...], pagination: {...} } } }
    // 3. { list: { bookings: [...] } }
    // 4. { bookings: [...] }
    let bookingsData = [];
    let paginationInfo = {};

    // Try different response paths
    if (response?.data?.data?.data?.list?.bookings) {
      bookingsData = response.data.data.data.list.bookings;
      paginationInfo = response.data.data.data.list.pagination || {};
    } else if (response?.data?.data?.list?.bookings) {
      bookingsData = response.data.data.list.bookings;
      paginationInfo = response.data.data.list.pagination || {};
    } else if (response?.data?.list?.bookings) {
      bookingsData = response.data.list.bookings;
      paginationInfo = response.data.list.pagination || {};
    } else if (response?.data?.bookings) {
      bookingsData = response.data.bookings;
      paginationInfo = response.data.pagination || {};
    } else if (response?.bookings) {
      bookingsData = response.bookings;
      paginationInfo = response.pagination || {};
    } else if (Array.isArray(response?.data?.data)) {
      // If data.data is directly an array of bookings
      bookingsData = response.data.data;
    } else if (Array.isArray(response?.data)) {
      // If data is directly an array of bookings
      bookingsData = response.data;
    }

    // Parse pagination — trust backend field names directly
    // Backend pagination: { count: total_bookings, currentPage, lastPage, total: items_per_page }
    const currentPage = paginationInfo?.current_page ?? paginationInfo?.currentPage ?? page;
    const lastPage = paginationInfo?.last_page ?? paginationInfo?.lastPage ?? 1;
    const perPageCount = paginationInfo?.total ?? perPage; // "total" in API response = items per page
    const count = paginationInfo?.count ?? bookingsData.length; // "count" = total bookings in database

    // hasMore = true if there are more pages after this one
    const hasMore = currentPage < lastPage;

    // Log for debugging
    console.log('🔍 Booking API Response:', {
      pathFound: bookingsData.length > 0 ? 'found' : 'not found',
      bookingsLoaded: bookingsData.length,
      currentPage,
      lastPage,
      totalBookings: count,
      perPageCount,
      hasMore,
    });

    return {
      bookings: Array.isArray(bookingsData) ? bookingsData : [],
      pagination: {
        currentPage,
        lastPage,
        perPage: perPageCount,
        count, // Total bookings in database
        hasMore,
      },
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Fetch therapists
 * Protected endpoint — requires token
 */
export async function getTherapists(serviceAt = null) {
  try {
    const params = {
      availability: 1,
      outlet: 1,
      status: 1,
      pagination: 0,
      panel: 'outlet',
      outlet_type: 2,
      leave: 0,
    };

    if (serviceAt) {
      params.service_at = serviceAt; // Format: DD-MM-YYYY HH:MM:SS
    }

    const response = await apiClient.get('/api/v1/therapists', { params });
    // Handle both nested and flat response structures
    // API returns therapists in response.data.data.list.staffs (not therapists)
    const therapists = response?.data?.data?.data?.list?.staffs || response?.data?.data?.list || response?.data?.data || response?.data || [];
    return therapists;
  } catch (error) {
    console.error('Failed to fetch therapists:', error.message);
    throw error;
  }
}

/**
 * Fetch services
 * Protected endpoint — requires token
 */
export async function getServices() {
  try {
    const response = await apiClient.get('/api/v1/service-category', {
      params: {
        outlet_type: 2,
        outlet: 1,
        pagination: 0,
        panel: 'outlet',
      },
    });
    console.log(response, "what is hre ?")
    const services = response?.data?.data || response?.data || [];
    console.log(services, "SDADAS")
    return services;
  } catch (error) {
    console.error('Failed to fetch services:', error.message);
    throw error;
  }
}

/**
 * Get booking details by ID
 * Protected endpoint — requires token
 */
export async function getBookingDetail(bookingId) {
  try {
    const response = await apiClient.get(`/api/v1/bookings/${bookingId}`);

    // The API returns: { data: { data: { data: { bookingData: [...] } } } }
    const bookingData = response?.data?.data?.data?.bookingData || response?.data?.data || response?.data || [];
    console.log(bookingData, "bookingData")
    if (!Array.isArray(bookingData) || bookingData.length === 0) {
      throw new Error('No booking data returned from API');
    }

    // Get first booking from array
    const rawBooking = bookingData[0];

    // Transform the booking detail response to match internal format
    const booking = transformBookingDetailFromApi(rawBooking);

    console.log('Transformed booking detail:', booking);
    return booking;
  } catch (error) {
    console.error(`Failed to fetch booking ${bookingId}:`, error.message);
    throw error;
  }
}

/**
 * Get user/customer details by ID
 * Protected endpoint — requires token
 */
export async function getUserDetails(userId) {
  try {
    const response = await apiClient.get(`/api/v1/users/${userId}`);

    // API returns: { data: { success: true, data: { id, name, contact_number, email, ... } } }
    const userData = response?.data?.data;
    console.log('User details fetched:', userData);
    return userData;
  } catch (error) {
    console.error(`Failed to fetch user ${userId}:`, error.message);
    // Don't throw - just return null so booking can still be edited
    return null;
  }
}

/**
 * Create a booking
 * Protected endpoint — requires token
 * POST /api/v1/bookings/create
 */
export async function createBooking(bookingData) {
  try {
    if (!bookingData) {
      throw new Error('Booking data is required');
    }

    const formData = new FormData();

    for (const key in bookingData) {
      if (Object.prototype.hasOwnProperty.call(bookingData, key)) {
        const value = bookingData[key];

        if (Array.isArray(value)) {
          formData.append(key, JSON.stringify(value));
        } else if (typeof value === 'object' && value !== null) {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, value);
        }
      }
    }

    const response = await apiClient.post('/api/v1/bookings/create', formData);
    console.log('Create Booking Full Response:', JSON.stringify(response?.data, null, 2));

    let booking = null;

    if (response?.data?.booking) {
      booking = response.data.booking;
    } else if (
      response?.data?.data?.data?.bookingData &&
      Array.isArray(response.data.data.data.bookingData)
    ) {
      booking = response.data.data.data.bookingData[0];
    } else if (response?.data?.data?.data) {
      booking = response.data.data.data;
    } else if (response?.data?.data) {
      booking = response.data.data;
    } else if (response?.data) {
      booking = response.data;
    }

    if (!booking) {
      throw new Error('Could not extract booking from API response');
    }

    // Normalize booking id
    const normalizedId =
      booking.id ||
      booking.booking_id ||
      booking.bookingId ||
      response?.data?.booking_id ||
      response?.data?.id ||
      response?.data?.data?.id ||
      response?.data?.data?.data?.id;

      

    return {
      ...booking,
      id: normalizedId,
    };
  } catch (error) {
    console.error('Failed to create booking:', error, error.message);
    throw error;
  }
}

/**
 * Prepare complete booking data for API update (includes required fields)
 * Ensures all required fields are present for API validation
 */
export function prepareCompleteBookingData(bookingData, currentBooking = {}) {
  return {
    therapist_id:   bookingData.therapist_id   !== undefined ? bookingData.therapist_id   : currentBooking.therapist_id,
    source:         bookingData.source         !== undefined ? bookingData.source         : (currentBooking.source || 'Manual'),
    booking_type:   bookingData.booking_type   !== undefined ? bookingData.booking_type   : (currentBooking.booking_type || 1),
    customer:       bookingData.customer       !== undefined ? bookingData.customer       : (currentBooking.customer_id || currentBooking.customer || 1),
    membership:     bookingData.membership     !== undefined ? bookingData.membership     : (currentBooking.membership || 0),
    outlet:         bookingData.outlet         !== undefined ? bookingData.outlet         : 1,
    updated_by:     bookingData.updated_by     !== undefined ? bookingData.updated_by     : 229061,
    panel: 'outlet',

    // Customer details
    customer_name:  bookingData.customer_name  || currentBooking.customer_name  || '',
    customer_email: bookingData.customer_email || currentBooking.customer_email || '',
    mobile_number:  bookingData.mobile_number  || currentBooking.customer_phone || '',

    // Booking date/time
    ...(bookingData.service_at && { service_at: bookingData.service_at }),

    // Note / description — send both field names for API compatibility
    note:        bookingData.note        !== undefined ? bookingData.note        : (bookingData.description || currentBooking.description || currentBooking.notes || ''),
    description: bookingData.description !== undefined ? bookingData.description : (currentBooking.description || currentBooking.notes || ''),

    // Payment / source
    payment_type:   bookingData.payment_type   || currentBooking.payment_type   || 'payatstore',

    // Items
    ...(bookingData.items && { items: bookingData.items }),
    ...(currentBooking.items && !bookingData.items && { items: currentBooking.items }),
  };
}

/**
 * Update a booking
 * Protected endpoint — requires token
 * POST /api/v1/bookings/{id} (ID in URL path, not in body)
 */
export async function updateBooking(bookingId, bookingData, currentBooking = {}) {
  try {
    // Prepare complete booking data with required fields
    const completeData = prepareCompleteBookingData(bookingData, currentBooking);

    // Convert to FormData as per API specification
    const formData = new FormData();

    for (const key in completeData) {
      if (completeData.hasOwnProperty(key)) {
        const value = completeData[key];

        // Handle nested arrays/objects (like items)
        if (Array.isArray(value)) {
          formData.append(key, JSON.stringify(value));
        } else if (typeof value === 'object' && value !== null) {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, value);
        }
      }
    }

    // Use POST to /api/v1/bookings/{id} endpoint
    const response = await apiClient.post(`/api/v1/bookings/${bookingId}`, formData);

    // Log the response structure for debugging
    console.log('Update Booking API Response:', JSON.stringify(response?.data, null, 2));

    // Handle different response structures
    let booking = null;

    // Structure 1: { booking: {...} } (same as create)
    if (response?.data?.booking) {
      booking = response.data.booking;
      console.log('Extracted booking from response.data.booking');
    }
    // Structure 2: { data: { booking: {...}, booking_item: {...} } }
    // booking_item is a SIBLING of booking — merge it in so transformBookingFromApi can read items
    else if (response?.data?.data?.booking) {
      booking = {
        ...response.data.data.booking,
        booking_item: response.data.data.booking_item || response.data.data.booking.booking_item,
        booking_created_at: response.data.data.booking_created_at,
      };
      console.log('Extracted booking from response.data.data.booking (with booking_item merged)');
    }
    // Structure 3: { data: { bookingData: [...] } }
    else if (response?.data?.data?.bookingData && Array.isArray(response.data.data.bookingData)) {
      booking = response.data.data.bookingData[0];
      console.log('Extracted booking from response.data.data.bookingData[0]');
    }
    // Structure 4: Direct data response
    else if (response?.data?.data) {
      booking = response.data.data;
      console.log('Using response.data.data');
    }
    else if (response?.data) {
      booking = response.data;
      console.log('Using response.data');
    }

    if (!booking) {
      console.error('No booking data in update response:', response?.data);
      throw new Error('API returned no booking data in update response');
    }

    console.log('Update successful, returning booking:', { id: booking.id, therapist_id: booking.therapist_id });
    return booking;
  } catch (error) {
    console.error('Failed to update booking:', error.message);
    throw error;
  }
}

/**
 * Delete a booking
 * Protected endpoint — requires token
 * DELETE /api/v1/bookings/destroy/{id}
 */
export async function deleteBooking(bookingId) {
  try {
    const response = await apiClient.delete(`/api/v1/bookings/destroy/${bookingId}`);
    return response?.data?.data || response?.data || { success: true };
  } catch (error) {
    console.error('Failed to delete booking:', error.message);
    throw error;
  }
}

/**
 * Cancel a booking item
 * Protected endpoint — requires token
 * POST /api/v1/bookings/item/cancel
 * @param {number} itemId - Booking item ID to cancel
 * @param {string} type - "normal" or "no-show" (default: "normal")
 */
export async function cancelBooking(itemId, type = 'normal') {
  try {
    const formData = new FormData();
    formData.append('company', 1);
    formData.append('id', itemId);
    formData.append('type', type);
    formData.append('panel', 'outlet');

    // Don't set Content-Type header manually - axios will handle it with FormData
    const response = await apiClient.post('/api/v1/bookings/item/cancel', formData);
    const result = response?.data?.data || response?.data;
    return result;
  } catch (error) {
    console.error('Failed to cancel booking item:', error.message);
    throw error;
  }
}

/**
 * Create or get customer (user)
 * If customer with same email exists, return that ID
 * Otherwise create new customer and return ID
 * Protected endpoint — requires token
 */
export async function createOrGetCustomer(customerData) {
  try {
    // Create new customer with provided details
    const formData = new FormData();
    formData.append('name', customerData.customer_name || '');
    formData.append('lastname', '');
    formData.append('email', customerData.customer_email || '');
    formData.append('contact_number', customerData.customer_phone || '');
    formData.append('gender', 'prefer-not'); // API requires: male, female, non-binary, prefer-not
    formData.append('status', '1');
    formData.append('membership', '0');

    console.log('Creating customer with:', {
      name: customerData.customer_name,
      email: customerData.customer_email,
      phone: customerData.customer_phone,
    });

    const response = await apiClient.post('/api/v1/users/create', formData);

    console.log('User Create Response Structure:', JSON.stringify(response?.data, null, 2));

    // Extract customer ID from nested response structure
    // API returns: { data: { success: true, data: { id: 123, ... }, message: "..." } }
    let customerId = null;

    // Try: response.data.data.data.id (axios wraps response, then API wraps data)
    if (response?.data?.data?.data?.id) {
      customerId = response.data.data.data.id;
    }
    // Fallback: response.data.data.id
    else if (response?.data?.data?.id) {
      customerId = response.data.data.id;
    }
    // Fallback: response.data.id
    else if (response?.data?.id) {
      customerId = response.data.id;
    }

    if (customerId) {
      console.log('Customer created with ID:', customerId);
      return customerId;
    }

    console.error('Response structure:', response?.data);
    throw new Error(`Failed to create customer - no ID found in response. Response: ${JSON.stringify(response?.data)}`);
  } catch (error) {
    console.error('Failed to create customer:', error.message);
    throw error;
  }
}

/**
 * Search customers by fetching bookings and extracting unique customers
 * Gets customer data from booking records
 */
export async function searchCustomers(query = '', limit = 50, offset = 0) {
  try {
    // Get a wide date range to fetch more bookings and customers
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const startDate = formatDate(thirtyDaysAgo);
    const endDate = formatDate(today);

    const response = await apiClient.get('/api/v1/bookings/outlet/booking/list', {
      params: {
        pagination: 1,
        daterange: `${startDate} / ${endDate}`,
        outlet: 1,
        panel: 'outlet',
        view_type: 'calendar',
        limit: 500, // Fetch more to get unique customers
        offset: 0,
      },
    });

    // Extract bookings
    const bookingsData = response?.data?.data?.data?.list?.bookings || response?.data?.data || [];
    const bookings = Array.isArray(bookingsData) ? bookingsData : [];

    // Extract unique customers from bookings
    const customersMap = new Map();
    bookings.forEach(booking => {
      const customerId = booking.customer_id || booking.user_id;
      if (customerId && !customersMap.has(customerId)) {
        customersMap.set(customerId, {
          id: customerId,
          name: booking.customer_name || '',
          contact_number: booking.customer_phone || '',
          email: booking.customer_email || '',
          membership: booking.membership || 0,
        });
      }
    });

    let customers = Array.from(customersMap.values());

    // Filter by query if provided
    if (query && query.trim()) {
      const lowerQuery = query.toLowerCase();
      customers = customers.filter(customer => {
        const name = (customer.name || '').toLowerCase();
        const phone = (customer.contact_number || '').toLowerCase();
        const email = (customer.email || '').toLowerCase();
        return name.includes(lowerQuery) || phone.includes(lowerQuery) || email.includes(lowerQuery);
      });
    }

    // Sort by name
    customers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    // Apply pagination
    const total = customers.length;
    const paginatedCustomers = customers.slice(offset, offset + limit);
    const hasMore = (offset + limit) < total;

    return {
      customers: paginatedCustomers,
      pagination: {
        limit,
        offset,
        total,
        hasMore,
      },
    };
  } catch (error) {
    console.error('Failed to search customers:', error.message);
    return {
      customers: [],
      pagination: { limit, offset, total: 0, hasMore: false },
    };
  }
}

/**
 * Format date for API (DD-MM-YYYY)
 */
function formatDate(date) {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Get available rooms
 * Protected endpoint — requires token
 */
export async function getAvailableRooms(outletId = 1, date, duration = 60) {
  try {
    const response = await apiClient.get(`/api/v1/room-bookings/outlet/${outletId}`, {
      params: {
        date, // Format: DD-MM-YYYY
        duration,
        panel: 'outlet',
      },
    });

    const rooms = response?.data?.data || response?.data || [];
    return rooms;
  } catch (error) {
    console.error('Failed to fetch rooms:', error.message);
    throw error;
  }
}
