// Transform API response shape into internal calendar model
// API returns nested items[] array; we flatten it for display

/**
 * Transform booking detail API response (single booking GET)
 * This has a different structure than the booking list API
 */
export function transformBookingDetailFromApi(apiBooking) {
  if (!apiBooking) return null;

  try {
    // Parse JSON fields if they exist
    let contentData = {};
    let additionalData = {};

    if (apiBooking.content && typeof apiBooking.content === 'string') {
      contentData = JSON.parse(apiBooking.content);
    }

    if (apiBooking.additional && typeof apiBooking.additional === 'string') {
      additionalData = JSON.parse(apiBooking.additional);
    }

    // Parse items from content if it's a string
    let items = [];
    if (contentData.items && typeof contentData.items === 'string') {
      items = JSON.parse(contentData.items);
    } else if (contentData.items && Array.isArray(contentData.items)) {
      items = contentData.items;
    }

    const primaryItem = items?.[0] || {};

    // Extract time in HH:MM format from service_time (may be "09:30:00 AM" or "09:30:00")
    const extractTimeHHMM = (timeStr) => {
      if (!timeStr) return '';
      // Extract first 5 characters (HH:MM) from any time format
      return timeStr.substring(0, 5);
    };

    // Helper to calculate end time from start time and duration
    const calculateEndTimeFromDuration = (startTime, duration) => {
      if (!startTime || !duration) return '';
      const [hours, minutes] = startTime.split(':').map(Number);
      const totalMinutes = hours * 60 + minutes + duration;
      const endHours = Math.floor(totalMinutes / 60);
      const endMinutes = totalMinutes % 60;
      return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
    };
    const startTime = extractTimeHHMM(apiBooking.service_time || primaryItem.start_time);
    const duration = additionalData.duration || primaryItem.duration || 0;
    let endTime = extractTimeHHMM(apiBooking.service_end || primaryItem.end_time);

    // If end_time is not set, calculate it from start_time and duration
    if (!endTime && startTime && duration) {
      endTime = calculateEndTimeFromDuration(startTime, duration);
    }
    const finalCustomerId = contentData.customer || apiBooking.user_id;

    return {
      id: apiBooking.booking_id || apiBooking.id, // Use booking_id for delete/update, fallback to id
      item_id: apiBooking.id, // Store item_id for cancel operations
      uuid: apiBooking.uuid,
      reference: apiBooking.reference,
      customer_id: finalCustomerId,
      customer_name: additionalData.customer_name || primaryItem.customer_name || 'Unknown',
      customer_email: apiBooking.customer_email || apiBooking.user?.email,
      customer_phone: apiBooking.mobile_number || "00000",
      therapist_id: apiBooking.therapist_id || primaryItem.therapist,
      therapist_name: apiBooking.therapist_name || primaryItem.therapist_name,
      service_id: apiBooking.service_id || primaryItem.service,
      service_name: apiBooking.service_name,
      start_time: startTime,
      end_time: endTime,
      duration,
      date: apiBooking.service_date, // DD-MM-YYYY format
      room_id: apiBooking.room_id,
      room_name: apiBooking.room_name,
      status: apiBooking.status === 1 ? 'Confirmed' : apiBooking.status === 3 ? 'Cancelled' : 'Confirmed',
      payment_status: apiBooking.payment_status_id === 1 ? 'Unpaid' : 'Paid',
      source: apiBooking.source,
      notes: apiBooking.remark || apiBooking.sales_note,
      items: items,
      created_at: apiBooking.created_at,
      updated_at: apiBooking.updated_at,
      booking_date: apiBooking.booking_date,
      content: apiBooking.content, // Keep original content for debugging
    };
  } catch (error) {
    console.error('Error transforming booking detail:', error);
    // Fallback to basic data if parsing fails
    return {
      id: apiBooking.id,
      customer_name: 'Unknown',
      service_name: apiBooking.service_name,
      date: apiBooking.service_date,
      status: 'Confirmed',
    };
  }
}

export function transformBookingFromApi(apiBooking) {
  if (!apiBooking) return null;

  try {
    // ✅ unwrap create-booking response shape: { booking: {...}, id: undefined }
    const bookingData = apiBooking.booking && typeof apiBooking.booking === 'object'
      ? apiBooking.booking
      : apiBooking;

    let items = [];
    let customerNameFromBookingItem = null;

    if (bookingData.booking_item && typeof bookingData.booking_item === 'object') {
      const bookingItemKeys = Object.keys(bookingData.booking_item);
      if (bookingItemKeys.length > 0) {
        customerNameFromBookingItem = bookingItemKeys[0];
        const bookingItemValues = Object.values(bookingData.booking_item);
        const firstValue = bookingItemValues[0];

        if (Array.isArray(firstValue)) {
          items = firstValue;
        } else if (firstValue && typeof firstValue === 'object') {
          items = [firstValue];
        }
      }
    }

    console.log('transformBookingFromApi: Extracted items from booking_item:', {
      itemCount: items.length,
      firstItem: items[0],
    });

    const primaryItem = items?.[0];

    if (!primaryItem && bookingData.items && Array.isArray(bookingData.items)) {
      console.log('transformBookingFromApi: Using items array from booking');
      items = bookingData.items;
    }

    if (!items[0]) {
      console.log('transformBookingFromApi: Creating fallback item from booking data', {
        hasServiceId: !!bookingData.service_id,
        hasTherapistId: !!bookingData.therapist_id,
      });

      if (bookingData.service_id) {
        const fallbackItem = {
          therapist_id: bookingData.therapist_id,
          therapist: bookingData.therapist_name,
          service_id: bookingData.service_id,
          service: bookingData.service_name,
          start_time: bookingData.service_time || '',
          end_time: bookingData.service_end || '',
          duration: bookingData.duration,
          room_items: bookingData.room_id
            ? [{ room_id: bookingData.room_id, room_name: bookingData.room_name }]
            : [],
        };
        items = [fallbackItem];
      }
    }

    if (!items[0]) {
      console.error('transformBookingFromApi: No valid items found after all attempts', {
        hasBookingItem: !!bookingData.booking_item,
        hasServiceId: !!bookingData.service_id,
        hasItems: !!bookingData.items,
        bookingKeys: Object.keys(bookingData).slice(0, 10),
      });
      return null;
    }

    const primaryRoom = items[0].room_items?.[0];

    const customerName =
      bookingData.customer_name ||
      customerNameFromBookingItem ||
      bookingData.user?.name ||
      'Unknown';

    const transformedBooking = {
      id: bookingData.booking_id || bookingData.id,
      item_id: bookingData.id,
      customer_id: bookingData.user_id,
      customer_name: customerName,
      customer_email: bookingData.customer_email || bookingData.user?.email,
      customer_phone: bookingData.mobile_number || bookingData.user?.contact_number,
      therapist_id: items[0].therapist_id,
      therapist_name: items[0].therapist,
      service_id: items[0].service_id,
      service_name: items[0].service,
      start_time: items[0].start_time,
      end_time: items[0].end_time,
      duration: items[0].duration,
      date: bookingData.service_date,
      room_id: primaryRoom?.room_id,
      room_name: primaryRoom?.room_name,
      status: bookingData.status || 'Confirmed',
      payment_status: bookingData.payment_type,
      source: bookingData.source,
      notes: bookingData.notes || bookingData.note,
      items,
      created_at: bookingData.created_at,
      updated_at: bookingData.booking_created_at,
    };

    console.log('transformBookingFromApi: Successfully transformed booking:', {
      id: transformedBooking.id,
      customer_name: transformedBooking.customer_name,
      service_name: transformedBooking.service_name,
    });

    return transformedBooking;
  } catch (error) {
    console.error('transformBookingFromApi: Error transforming booking', error, { apiBooking });
    return null;
  }
}

export function transformBookingsFromApi(apiBookings) {
  if (!Array.isArray(apiBookings)) {
    console.warn('transformBookingsFromApi: Input is not an array', {
      received: typeof apiBookings,
      value: apiBookings,
    });
    return [];
  }

  console.log('🔄 Transforming bookings:', {
    inputCount: apiBookings.length,
    sampleInput: apiBookings[0],
  });

  const transformed = apiBookings
    .map(transformBookingFromApi)
    .filter(booking => booking !== null); // Remove invalid bookings

  console.log('✅ Transformed successfully:', {
    outputCount: transformed.length,
    sampleOutput: transformed[0],
  });

  return transformed;
}

/**
 * Transform internal booking back to API format for submission
 */
export function transformBookingToApi(internalBooking, formData) {
  // This receives data from BookingForm which already has the items[] structure
  // customer_id should be set by BookingContext.createBooking() after creating the customer

  if (!formData.customer_id) {
    throw new Error('Customer ID is required. Make sure to create the customer first.');
  }

  return {
    company: 1,
    outlet: 1,
    outlet_type: 2,
    booking_type: 1,
    customer: formData.customer_id, // Set by BookingContext after creating customer
    created_by: formData.created_by,
    customer_name: formData.customer_name,
    customer_email: formData.customer_email,
    mobile_number: formData.customer_phone,
    currency: formData.currency || 'SGD',
    source: formData.source || 'WhatsApp',
    payment_type: formData.payment_type || 'payatstore',
    service_at: formData.service_at, // DD-MM-YYYY HH:MM
    note: formData.notes,
    membership: formData.membership || 0,
    panel: 'outlet',
    type: formData.type || 'manual',
    items: formData.items || [], // Array of service items
  };
}

/**
 * Transform edit form data to API format for PUT request
 */
export function transformEditToApi(formData) {
  console.log('transformEditToApi input:', {
    customer_id: formData.customer_id,
    customer_name: formData.customer_name,
    service_at: formData.service_at,
    items: formData.items?.length,
  });

  const transformed = {
    company: 1,
    outlet: 1,
    outlet_type: 2,
    currency: formData.currency || 'SGD',
    source: formData.source || 'Walk-in',
    payment_type: formData.payment_type || 'payatstore',
    payment_status_id: formData.payment_status_id,
    service_at: formData.service_at,
    customer: formData.customer_id || 0,
    customer_name: formData.customer_name,
    customer_lastname: formData.customer_lastname || '',
    customer_email: formData.customer_email || '',
    mobile_number: formData.customer_phone || formData.mobile_number || '', // Form uses customer_phone
    panel: 'outlet',
    updated_by: formData.updated_by || 229061,
    booking_type: 1,
    membership: formData.membership || 0,
    note: formData.notes || '',
    status: formData.status || 'Confirmed',
    items: formData.items || [],
  };

  console.log('transformEditToApi output:', {
    customer: transformed.customer,
    service_at: transformed.service_at,
    itemCount: transformed.items.length,
  });

  return transformed;
}

/**
 * Transform form item to API item structure
 * @param {object} formItem - Item from form
 * @param {number} itemNumber - Index of item
 * @param {string} customerName - Customer name from booking form
 */
export function transformItemToApi(formItem, itemNumber, customerName = '') {
  const itemData = {
    // Include id only if it exists (for edit)
    ...(formItem.id && { id: formItem.id }),
    service: formItem.service_id,
    service_id: formItem.service_id, // Include both for API compatibility
    customer_name: customerName || formItem.customer_name || '', // Use provided customer name
    start_time: formItem.start_time,
    end_time: formItem.end_time,
    duration: formItem.duration,
    therapist: formItem.therapist_id,
    therapist_id: formItem.therapist_id, // Include both for API compatibility
    requested_person: 0,
    requested_room: formItem.room_id || 0,
    price: formItem.price || '0.00',
    quantity: formItem.quantity || '1',
    service_request: formItem.service_request || '',
    commission: formItem.commission || null,
    primary: itemNumber === 0 ? 1 : 0,
    item_number: itemNumber + 1,
  };

  // Only include room_segments if room_id is actually set
  if (formItem.room_id) {
    itemData.room_segments = formItem.room_segments || [{
      room_id: formItem.room_id,
      item_type: formItem.room_name,
      meta_service: null,
      start_time: formItem.start_time,
      end_time: formItem.end_time,
      duration: formItem.duration,
      priority: 1,
    }];
  }

  return itemData;
}
