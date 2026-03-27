# Figma Design to API Mapping Guide

## Overview
This document maps the Figma design screenshots to actual API endpoints and React components.

---

## Image 8: "New Booking" Panel (CREATE Operation)

### Figma Design Elements:
```
┌─────────────────────────────────────────┐
│         New Booking Panel               │
├─────────────────────────────────────────┤
│ Outlet: Liat Towers                     │
│ On: Tue, Aug 8          At: 09:30 PM   │
│                                         │
│ VB  92214868 (#9221)                   │
│     Victoria Baker                      │
│     Client since December 2023          │
│                                         │
│ ☐ 60 Mins Body Therapy           [🗑]  │
│     With: Lily                          │
│     ✓ ✓ Requested Therapist            │
│     For: 60 min    At: 9:30 AM         │
│     Using: 806 Couples Room             │
│     Request(s): Soft, China             │
│                                         │
│ [⊕ Add service]        [⊕ Add pax]    │
│ [Select Source dropdown]                │
│ [Notes (Optional)]                      │
│                                         │
│ [         Save Button        ]          │
└─────────────────────────────────────────┘
```

### API Endpoint Used:
**`POST /api/v1/bookings/create`**

### React Components:
1. **BookingPanel.js** (panelMode='create')
   - Shows header: "New Booking"
   - Shows customer info section
   - Shows service selection

2. **BookingForm.js**
   - Input fields for customer details
   - Date/time picker
   - Service selector (dropdown)
   - Therapist selector
   - Room selector
   - Duration picker
   - Notes textarea
   - Save button → calls `createBooking(formData)`

### Form Data Structure:
```javascript
{
  customer_name: "Victoria Baker",
  customer_email: "victoria@example.com",
  customer_phone: "+6563258965",
  service_at: "08-08-2026 21:30:00",  // DD-MM-YYYY HH:MM:SS
  source: "Select Source",              // Walk-in, Phone, WhatsApp, Online
  payment_type: "payatstore",
  items: [
    {
      service_id: 1,                    // Body Therapy service ID
      therapist_id: 3,                  // Lily's ID
      start_time: "21:30:00",           // HH:MM:SS
      duration: 60,                     // minutes
      room_id: 43                       // 806 Couples Room ID
    }
  ],
  notes: ""
}
```

### File Locations:
- **Form Component**: `src/components/booking/BookingForm.js`
- **Panel Component**: `src/components/booking/BookingPanel.js`
- **API Service**: `src/services/bookingService.js:93` (createBooking)

---

## Image 9: "Update Booking" Panel (READ + UPDATE Operations)

### Figma Design Elements:
```
┌─────────────────────────────────────────┐
│        Update Booking Panel             │
├─────────────────────────────────────────┤
│ Outlet: Liat Towers                     │
│ On: Tue, Aug 8          At: 09:30 PM   │
│                                         │
│ VB  92214868 Victoria Baker             │
│     Client since December 2023          │
│     Phone: 92214868                     │
│                                         │
│ ▼ 120 Mins Body Therapy            [🗑] │
│     With: Lily                          │
│     ✓ ✓ Requested Therapist            │
│     For: 120 min    At: 9:30 AM ▼      │
│     Adjusted Commission ($$): $52.00    │
│     [⊕ Add therapist (split comm)]      │
│     Using: 806 Couples Room        🖊   │
│     Select request(s): Soft, China  🖊  │
│                                         │
│ [⊕ Add service]                        │
│ By Phone                               │
│ [I have an allergy to...]              │
│                                         │
│ [       Save Changes       ]            │
│ [       Cancel Booking     ]            │
│ [       Delete Booking     ]            │
└─────────────────────────────────────────┘
```

### API Endpoints Used:
1. **`GET /api/v1/bookings/{bookingId}`** - Fetch booking details
2. **`PUT /api/v1/bookings/{bookingId}`** - Update booking
3. **`POST /api/v1/bookings/{bookingId}/cancel`** - Cancel booking
4. **`DELETE /api/v1/bookings/{bookingId}`** - Delete booking

### React Components:
1. **BookingPanel.js** (panelMode='detail')
   - Shows header: "Appointment"
   - Shows edit button in header
   - Renders BookingDetail

2. **BookingDetail.js** (READ mode)
   - Displays all booking information
   - Shows Edit, Cancel, and Delete buttons
   - OnClick Edit → openPanel('edit', bookingId)
   - OnClick Cancel → cancelBooking(bookingId)
   - OnClick Delete → deleteBooking(bookingId)

3. **BookingForm.js** (panelMode='edit')
   - Pre-filled with existing booking data
   - All fields editable
   - Save button → calls `updateBooking(bookingId, formData)`

### Flow:
```
User clicks booking card on calendar
  ↓
BookingCard.onClick → openPanel('detail', bookingId)
  ↓
BookingPanel (panelMode='detail')
  ↓
BookingDetail displays booking info
  ↓
User clicks "Edit" button
  ↓
openPanel('edit', bookingId)
  ↓
BookingForm (panelMode='edit')
  ↓
BookingForm pre-fills with booking data
  ↓
User edits and clicks "Save Changes"
  ↓
updateBooking(bookingId, editedData)
  ↓
API: PUT /api/v1/bookings/{bookingId}
  ↓
Update BookingContext with new data
  ↓
Calendar refreshes with updated booking
```

### File Locations:
- **Detail Component**: `src/components/booking/BookingDetail.js`
- **Form Component**: `src/components/booking/BookingForm.js`
- **Panel Component**: `src/components/booking/BookingPanel.js`
- **API Service**:
  - getBookingDetail: `src/services/bookingService.js:90`
  - updateBooking: `src/services/bookingService.js:108`
  - cancelBooking: `src/services/bookingService.js:137`
  - deleteBooking: `src/services/bookingService.js:123`

---

## CRUD Operations Summary

| Operation | Figma Design | Component | API Endpoint | Function | File |
|-----------|--------------|-----------|--------------|----------|------|
| **CREATE** | Image 8 | BookingForm | `POST /bookings/create` | `createBooking()` | BookingForm.js |
| **READ** | Image 9 | BookingDetail | `GET /bookings/{id}` | `getBookingDetail()` | BookingDetail.js |
| **UPDATE** | Image 9 | BookingForm | `PUT /bookings/{id}` | `updateBooking()` | BookingForm.js |
| **CANCEL** | Image 9 | BookingDetail | `POST /bookings/{id}/cancel` | `cancelBooking()` | BookingDetail.js |
| **DELETE** | Image 9 | BookingDetail | `DELETE /bookings/{id}` | `deleteBooking()` | BookingDetail.js |

---

## Implementation Checklist

### ✅ Completed
- [x] API endpoints defined in bookingService.js
- [x] BookingForm component with create/edit modes
- [x] BookingDetail component with read/delete/cancel
- [x] BookingPanel orchestrating the flow
- [x] Response transformation (transformBookingFromApi)
- [x] Error handling with confirmation dialogs
- [x] Loading states during async operations
- [x] Proper logger setup

### 🎯 Verified
- [x] Create booking form layout matches Figma
- [x] Update booking form pre-fills with data
- [x] Cancel button only shows if not already cancelled
- [x] Delete button with confirmation dialog
- [x] All CRUD operations connected to correct APIs
- [x] Booking data flows through Context API
- [x] Calendar updates after CRUD operations

---

## Testing CRUD Operations

### 1. Create Booking (Image 8 Layout)
```
1. Click "+" floating button
2. Form opens with empty fields
3. Fill in customer details
4. Select service, therapist, room
5. Click "Save"
6. Verify booking appears on calendar
```

### 2. Read Booking (Image 9 Layout)
```
1. Click booking card on calendar
2. Detail panel opens showing all info
3. Verify all fields are populated correctly
```

### 3. Update Booking (Image 9 Edit Mode)
```
1. Click "Edit" in detail panel
2. Form opens pre-filled with booking data
3. Change a field (e.g., therapist)
4. Click "Save Changes"
5. Verify booking updated on calendar
```

### 4. Cancel Booking
```
1. Click "Cancel Booking" button
2. Confirm in dialog
3. Status changes to "Cancelled"
4. Card color changes to grey
5. Text shows strikethrough
```

### 5. Delete Booking
```
1. Click "Delete Booking" button
2. Confirm in dialog
3. Booking removed from calendar
4. Panel closes
```

---

## API Response Structures

### Create Response
```javascript
{
  data: {
    id: 205744,
    customer_name: "Victoria Baker",
    status: "Confirmed",
    ...
  },
  success: true,
  message: "Booking created successfully"
}
```

### Update Response
```javascript
{
  data: {
    id: 205744,
    customer_name: "Victoria Baker",
    status: "Confirmed",
    ...
  },
  success: true,
  message: "Booking updated successfully"
}
```

### Delete Response
```javascript
{
  success: true,
  message: "Booking deleted successfully"
}
```

### Cancel Response
```javascript
{
  data: {
    id: 205744,
    status: "Cancelled",
    ...
  },
  success: true,
  message: "Booking cancelled successfully"
}
```

---

## Error Handling

All operations include:
- Try/catch blocks
- User confirmation dialogs before destructive actions
- Loading states (isDeleting, isCancelling, isSubmitting)
- Toast notifications for success/error
- Logger calls for debugging
- Graceful error recovery

