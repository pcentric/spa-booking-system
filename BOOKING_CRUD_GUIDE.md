# Booking CRUD Operations Guide

## API Endpoints Summary

### 1. **CREATE Booking** ➕
**Endpoint**: `POST /api/v1/bookings/create`
**Function**: `createBooking(bookingData)`
**Location**: `src/services/bookingService.js:93`
**UI**: BookingForm component in BookingPanel (panelMode='create')

**Request Structure**:
```javascript
{
  customer_id: number,
  service_at: "DD-MM-YYYY HH:MM:SS",
  items: [
    {
      therapist_id: number,
      service_id: number,
      start_time: "HH:MM:SS",
      duration: number,
      room_id: number
    }
  ],
  source: string,
  payment_type: string,
  notes: string
}
```

---

### 2. **READ Booking Detail** 👁️
**Endpoint**: `GET /api/v1/bookings/{bookingId}`
**Function**: `getBookingDetail(bookingId)`
**Location**: `src/services/bookingService.js:90`
**UI**: BookingDetail component (shows when panelMode='detail')

**Response**: Returns single booking object with full details
- Use when: User clicks a booking card to view details
- Displays: Customer info, services, therapist, room, notes

---

### 3. **READ Bookings List** 📋
**Endpoint**: `GET /api/v1/bookings/outlet/booking/list`
**Function**: `getBookings(startDate, endDate, outlet)`
**Location**: `src/services/bookingService.js:7`
**UI**: CalendarGrid component (displays all bookings on calendar)

**Parameters**:
- `pagination`: 1
- `daterange`: "DD-MM-YYYY / DD-MM-YYYY"
- `outlet`: outlet ID
- `view_type`: "calendar"

---

### 4. **UPDATE Booking** ✏️
**Endpoint**: `PUT /api/v1/bookings/{bookingId}`
**Function**: `updateBooking(bookingId, bookingData)`
**Location**: `src/services/bookingService.js:108`
**UI**: BookingForm component in BookingPanel (panelMode='edit')

**Request Structure**: Same as CREATE (customer, services, items, etc.)

---

### 5. **DELETE Booking** 🗑️
**Endpoint**: `DELETE /api/v1/bookings/{bookingId}`
**Function**: `deleteBooking(bookingId)`
**Location**: `src/services/bookingService.js:123`
**UI**: BookingDetail component (trash icon button)

---

### 6. **CANCEL Booking** ❌
**Endpoint**: `POST /api/v1/bookings/{bookingId}/cancel`
**Function**: `cancelBooking(bookingId, reason)`
**Location**: `src/services/bookingService.js:137`
**UI**: BookingDetail component (cancel button)

**Request Structure**:
```javascript
{
  reason: "optional cancellation reason"
}
```

---

### 7. **Get Available Rooms** 🏨
**Endpoint**: `GET /api/v1/room-bookings/outlet/{outletId}`
**Function**: `getAvailableRooms(outletId, date, duration)`
**Location**: `src/services/bookingService.js:154`
**UI**: RoomSelector component in BookingForm

---

## UI Components Flow

### New Booking (CREATE)
```
CalendarPage
  ├─ FloatingActionButton (+ button)
  ├─ onClick → openPanel('create')
  └─ BookingPanel (panelMode='create')
      └─ BookingForm
          ├─ Customer info fields
          ├─ Service selection
          ├─ Therapist selection
          ├─ Time/Duration picker
          ├─ Room selector
          └─ Save button → createBooking()
```

### View Booking (READ)
```
CalendarGrid
  └─ BookingCard (on click)
      ├─ onClick → openPanel('detail', bookingId)
      └─ BookingPanel (panelMode='detail')
          └─ BookingDetail
              ├─ Display all booking info
              ├─ Edit button → openPanel('edit', bookingId)
              ├─ Delete button (trash icon)
              └─ Cancel button
```

### Edit Booking (UPDATE)
```
BookingDetail
  └─ Edit button
      ├─ onClick → openPanel('edit', bookingId)
      └─ BookingPanel (panelMode='edit')
          └─ BookingForm (pre-filled with booking data)
              ├─ All fields editable
              └─ Save button → updateBooking(bookingId, data)
```

### Delete Booking
```
BookingDetail
  └─ Trash icon
      └─ onClick → deleteBooking(bookingId)
          ├─ Remove from calendar
          └─ Close panel
```

### Cancel Booking
```
BookingDetail
  └─ Cancel button
      └─ onClick → cancelBooking(bookingId, reason)
          ├─ Set status to 'Cancelled'
          ├─ Update card color to grey
          └─ Add strikethrough text
```

---

## Status Colors (Figma Design)

- **Confirmed**: Pink/Rose `#f3e0e4`
- **Check-in/In Progress**: Blue/Teal `#b0d9e9`
- **No-show**: Grey `#ced4d8`
- **Cancelled**: Light Grey `#e8e8e8` (with strikethrough)
- **Completed**: Grey `#ced4d8`

---

## Current Implementation Status

✅ **Complete**:
- getBookings() - Fetch list with correct parsing
- createBooking() - POST endpoint
- updateBooking() - PUT endpoint
- deleteBooking() - DELETE endpoint
- cancelBooking() - POST endpoint
- getBookingDetail() - GET single booking (NEWLY ADDED)
- getAvailableRooms() - GET rooms
- Response transformations (transformBookingFromApi)

⚠️ **Needs Verification**:
- BookingDetail UI matches Figma design
- Edit button triggers openPanel('edit', bookingId)
- Delete/Cancel buttons properly wired
- Therapist and room dropdowns populate correctly
- Form validation and error handling

---

## Next Steps

1. Verify BookingDetail component shows all required fields
2. Add edit button functionality to BookingDetail
3. Add delete/cancel button functionality
4. Ensure form pre-fills with booking data in edit mode
5. Test all CRUD operations end-to-end
