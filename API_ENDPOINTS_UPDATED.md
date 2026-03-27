# API Endpoints - Updated to Match Postman Collection

## Summary of Changes

All booking service endpoints have been updated to match the official Postman Collection specifications.

---

## Endpoint Changes

### 1. GET /bookings (List)
**Status:** ✅ No change needed
```
GET /api/v1/bookings/outlet/booking/list
Query Params: pagination, daterange, outlet, panel, view_type, therapist, service, status
```

### 2. POST /bookings/create
**Status:** ✅ No change needed
```
POST /api/v1/bookings/create
Body: form-data (company, outlet, outlet_type, booking_type, customer, items, currency, source, payment_type, service_at, etc.)
```

### 3. PUT /bookings/{id} → POST /bookings/{id}
**Status:** ✅ FIXED
- **Before:** Tried POST first, then fallback to PUT
- **After:** Uses POST only (as per API spec)
```
POST /api/v1/bookings/{id}
Body: Same as create/update booking data
```

### 4. CANCEL /bookings/item/cancel
**Status:** ✅ FIXED
- **Before:** `POST /api/v1/bookings/{bookingId}/cancel` with `{ reason }`
- **After:** `POST /api/v1/bookings/item/cancel` with form-data
```
POST /api/v1/bookings/item/cancel
Body (form-data):
  - company: 1
  - id: <booking_item_id>
  - type: "normal" or "no-show"
  - panel: "outlet"
```

### 5. DELETE /bookings/destroy/{id}
**Status:** ✅ FIXED
- **Before:** `DELETE /api/v1/bookings/{id}`
- **After:** `DELETE /api/v1/bookings/destroy/{id}`
```
DELETE /api/v1/bookings/destroy/{id}
```

---

## Files Updated

| File | Changes |
|------|---------|
| `src/services/bookingService.js` | Updated endpoints for updateBooking, deleteBooking, cancelBooking |
| `src/contexts/BookingContext.js` | Updated cancelBooking to extract booking item ID |
| `src/utils/dateUtils.js` | Added apiDateToHtmlDate() for date format conversion |
| `src/components/booking/BookingForm.js` | Use new date conversion function |
| `src/utils/bookingTransform.js` | Calculate end_time if not provided |

---

## Important Notes

### Authentication
- All endpoints require Bearer token in Authorization header
- Token is retrieved from login endpoint and stored as `{{token}}`
- Already implemented in apiClient.js

### Form Data Handling
- Create/Update operations use `form-data` (multipart/form-data)
- Already handled by axios FormData

### Booking Item IDs
- When cancelling a booking, the system now extracts the first item ID from `booking.items[0].id`
- The booking item ID is passed to the cancel endpoint, not the booking ID

### Base URL
- `{{BASE_URL}}` = `https://dev.natureland.hipster-virtual.com`
- Full endpoint example: `https://dev.natureland.hipster-virtual.com/api/v1/bookings/create`

---

## Testing Checklist

- [ ] Create booking - verify POST works
- [ ] Update booking - verify POST to {id} works
- [ ] Delete booking - verify DELETE to /destroy/{id} works
- [ ] Cancel booking - verify item ID is extracted and POST to /item/cancel works
- [ ] Edit booking - verify date conversion works correctly
- [ ] Form loads with correct values when editing

