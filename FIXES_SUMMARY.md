# API Parameter Validation Fixes — Complete Summary

## Issues Fixed

### ❌ Issue 1: Missing `service_at` in therapist endpoint
- **File**: `src/services/bookingService.js`
- **Problem**: `getTherapists()` called with no `serviceAt` param, API requires `service_at`
- **Error**: Backend returns 422 "The service_at is Required"
- **Fix**: Made `serviceAt` required parameter; throws early if missing

### ❌ Issue 2: Wrong API endpoint URL
- **File**: `src/services/therapistService.js`
- **Problem**: Used `/therapists` instead of `/api/v1/therapists`
- **Fix**: Changed to `/api/v1/therapists` (line 39)

### ❌ Issue 3: Bootstrap not passing serviceAt
- **File**: `src/hooks/useBootstrapApp.js`
- **Problem**: `getTherapists()` called with no args on line 57
- **Fix**: Now constructs current datetime and passes as `serviceAt` param
  - Format: `DD-MM-YYYY HH:MM:SS` (matches API expectation)

### ❌ Issue 4: MasterDataContext calls therapists on mount without serviceAt
- **File**: `src/contexts/MasterDataContext.js`
- **Problem**: Line 66 calls `therapistService.getTherapists()` with no args (throws)
- **Fix**: Removed initial therapist load from mount effect
  - Therapists are now fetched on-demand via `getAvailableTherapists` callback
  - Services are still loaded on mount (no datetime required)

### ❌ Issue 5: Date format mismatch
- **File**: `src/components/booking/BookingItemRow.js`
- **Problem**: Passes `serviceAt` as `"YYYY-MM-DD HH:MM"` but API expects `"DD-MM-YYYY HH:MM:SS"`
  - HTML date input produces YYYY-MM-DD format
  - API expects DD-MM-YYYY format
- **Fix**: Use `htmlDateToApiDate()` utility to convert format (line 105)

### ❌ Issue 6: Date conversion helper broken
- **File**: `src/utils/dateUtils.js`
- **Problem**: `toApiDate()` returns string dates as-is (doesn't convert YYYY-MM-DD to DD-MM-YYYY)
- **Fix**:
  - Added `htmlDateToApiDate()` function to explicitly handle HTML date input conversion
  - Updated `toApiDate()` to call it for string inputs

---

## Files Modified

### 1. `src/services/bookingService.js` ✅
**What was changed**: Already updated in previous session with required param validation

**Key improvements**:
- `getTherapists(serviceAt)` — `serviceAt` is **required** (throws if missing)
- All functions have early guard clauses for required params
- Shared `extractData()` helper for safe response parsing
- Shared `logApiError()` helper for consistent logging

### 2. `src/services/therapistService.js` ✅
**Line 39**: Changed endpoint from `/therapists` to `/api/v1/therapists`

```javascript
// Before:
const response = await apiClient.get('/therapists', { params });

// After:
const response = await apiClient.get('/api/v1/therapists', { params });
```

### 3. `src/hooks/useBootstrapApp.js` ✅
**Lines 51-61**: Now builds and passes current datetime to `getTherapists()`

```javascript
const startDate = formatDate(today);
const endDate = formatDate(tomorrow);

// New: Build serviceAt for current time (DD-MM-YYYY HH:MM:SS)
const hours = String(today.getHours()).padStart(2, '0');
const minutes = String(today.getMinutes()).padStart(2, '0');
const serviceAtNow = `${startDate} ${hours}:${minutes}:00`;

// Now passes serviceAtNow
const [bookings, therapistsData] = await Promise.all([
  getBookings(startDate, endDate),
  getTherapists(serviceAtNow),  // ← Was: getTherapists()
]);
```

### 4. `src/contexts/MasterDataContext.js` ✅
**Lines 61-83**: Removed broken initial therapist load

```javascript
// Before: Called therapistService.getTherapists() on mount → throws
// After: Removed therapist load from mount effect

// Now loads only services (no datetime required)
const loadInitialData = async () => {
  dispatch({ type: 'LOAD_SERVICES_REQUEST' });
  const services = await serviceService.getServices();
  dispatch({ type: 'LOAD_SERVICES_SUCCESS', payload: services });
  // therapists no longer loaded here; fetched on-demand instead
};
```

### 5. `src/utils/dateUtils.js` ✅
**Added**: New `htmlDateToApiDate()` function to handle HTML date input conversion

```javascript
/**
 * Convert HTML date input (YYYY-MM-DD) to API date format (DD-MM-YYYY)
 */
export function htmlDateToApiDate(htmlDate) {
  if (!htmlDate) return null;
  // If already in API format, return as-is
  if (htmlDate.includes('-') && htmlDate.split('-')[0].length === 2) {
    return htmlDate;
  }
  // Convert from YYYY-MM-DD to DD-MM-YYYY
  const [year, month, day] = htmlDate.split('-');
  return `${day}-${month}-${year}`;
}
```

**Updated**: `toApiDate()` function to handle HTML date inputs

```javascript
export function toApiDate(date) {
  if (!date) return null;
  // Handle HTML date input format (YYYY-MM-DD)
  if (typeof date === 'string') {
    return htmlDateToApiDate(date);  // ← New: convert properly
  }
  return format(new Date(date), API_DATE_FORMAT);
}
```

### 6. `src/components/booking/BookingItemRow.js` ✅
**Line 4**: Added import for date conversion

```javascript
import { htmlDateToApiDate } from '../../utils/dateUtils';
```

**Lines 104-105**: Now converts date format before passing to TherapistSelector

```javascript
// Before:
serviceAt={`${date} ${item.start_time || '09:00'}`}
// Result: "2026-03-26 09:00" — WRONG FORMAT for API

// After:
serviceAt={`${htmlDateToApiDate(date)} ${item.start_time || '09:00'}:00`}
// Result: "26-03-2026 09:00:00" — CORRECT FORMAT for API
```

---

## Validation & Testing

### Datetime Format Standardization

**HTML Date Input** → **API Format**:
```
HTML input date value: "2026-03-26"
HTML time input value: "09:00"
↓
htmlDateToApiDate("2026-03-26") → "26-03-2026"
↓
ServiceAt for API: "26-03-2026 09:00:00"
```

### API Call Verification

All therapist endpoint calls now:
✅ Have required `service_at` parameter
✅ Use correct URL: `/api/v1/therapists`
✅ Pass datetime in format: `DD-MM-YYYY HH:MM:SS`
✅ Fail fast if required params missing
✅ Log clear error messages

### Caller Fixes

| Caller | Endpoint | serviceAt | Status |
|--------|----------|-----------|--------|
| `useBootstrapApp` | `getTherapists(serviceAtNow)` | Current time | ✅ Fixed |
| `MasterDataContext.getAvailableTherapists()` | `therapistService.getAvailableTherapists(serviceId, serviceAt)` | From caller | ✅ Works |
| `TherapistSelector` | `getAvailableTherapists(serviceId, debouncedServiceAt)` | Converted date | ✅ Works |
| `BookingItemRow` | Passes to TherapistSelector | `htmlDateToApiDate()` converted | ✅ Fixed |

---

## Remaining Non-Issues

These were checked and are working correctly:

- ✅ `bookingService.getBookings()` — startDate/endDate required and passed correctly
- ✅ `BookingContext` — create/update bookings pass `service_at` in payload
- ✅ `BookingForm` — service_at field marked required in validator
- ✅ `TherapistSelector` — guards against missing serviceId/serviceAt before fetching
- ✅ `roomService.getAvailableRooms()` — date parameter required and passed
- ✅ `apiClient` — Bearer token interceptor working correctly

---

## Summary

**Root Cause**: Backend endpoint `/api/v1/therapists` requires `service_at` parameter, but frontend was calling with missing/null values and wrong date formats.

**Resolution Strategy**:
1. Made `serviceAt` required in service layer (fail-fast)
2. Fixed all call sites to pass required parameter
3. Standardized datetime formatting across codebase
4. Removed impossible initial data load (can't fetch therapists without datetime on mount)
5. Added explicit date conversion utility for HTML date inputs

**Result**: All therapist API calls now include required `service_at` in correct format (`DD-MM-YYYY HH:MM:SS`), avoiding 422 errors.
