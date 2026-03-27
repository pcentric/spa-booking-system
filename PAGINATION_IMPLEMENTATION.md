# Pagination Implementation Guide

## Overview
Added pagination support to the booking system to improve performance by loading bookings in chunks instead of all at once.

## How It Works

### 1. **Service Layer** (`bookingService.js`)
Updated `getBookings()` to support pagination parameters:

```javascript
export async function getBookings(
  startDate,
  endDate,
  outlet = 1,
  limit = 100,    // Bookings per page
  offset = 0      // Starting position
)
```

**Returns:**
```javascript
{
  bookings: [...],        // Array of booking objects
  pagination: {
    limit,                // Items per page (100)
    offset,               // Current offset
    total,                // Total bookings available
    hasMore,              // Boolean - more pages available
    currentPage,          // Current page number
    totalPages,           // Total number of pages
  }
}
```

### 2. **Context State** (`BookingContext.js`)

**New state fields:**
```javascript
pagination: {
  limit: 100,
  offset: 0,
  total: 0,
  hasMore: false,
  currentPage: 1,
  totalPages: 0,
}
isLoadingMore: false
```

**New actions:**
- `LOAD_MORE_REQUEST` — Start loading next page
- `LOAD_MORE_SUCCESS` — Successfully loaded more bookings
- `LOAD_MORE_FAILURE` — Error loading more bookings

**New function:**
```javascript
loadMoreBookings(startDate, endDate, outlet = 1, limit = 100)
```

### 3. **UI Component** (`PaginationControls.js`)

Displays pagination information and "Load More" button:

```
┌─────────────────────────────────────────────────────────────┐
│ Showing 100 of 250 bookings (Page 1 of 3)    [Load More] │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
- Shows current count vs total
- Displays page numbers if applicable
- Loading spinner while fetching
- Disabled when no more data available

### 4. **Integration** (`CalendarPage.js`)

- Stores date info for load more functionality
- Displays PaginationControls below calendar
- Handles "Load More" button clicks
- Manages loading state

## Data Flow

```
Initial Load:
  CalendarPage → fetchBookings(startDate, endDate)
    ↓
  BookingService.getBookings(..., limit=100, offset=0)
    ↓
  API returns 100 bookings + pagination info
    ↓
  BookingContext stores pagination state
    ↓
  PaginationControls displays "Showing 100 of 250"

Load More:
  User clicks [Load More]
    ↓
  CalendarPage.handleLoadMore()
    ↓
  loadMoreBookings(startDate, endDate, offset=100)
    ↓
  BookingService.getBookings(..., limit=100, offset=100)
    ↓
  API returns next 100 bookings + updated pagination
    ↓
  BookingContext MERGES new bookings with existing ones
    ↓
  CalendarGrid updates with all 200+ bookings
    ↓
  PaginationControls shows new count
```

## Configuration

### Default Limit
Currently set to **100 bookings per page**. To change:

1. **In CalendarPage.js**, update `fetchBookings()` call:
```javascript
// Change from default 100 to 50
await fetchBookings(apiDate, endDate, outlet, 50);
```

2. **In loadMoreBookings()**, do the same:
```javascript
await loadMoreBookings(startDate, endDate, outlet, 50);
```

### API Response Format
The implementation expects pagination info in the API response:

```javascript
{
  data: {
    data: {
      data: {
        list: {
          bookings: [...],
          pagination: {
            total: 250,  // Total available records
            // ... other info
          }
        }
      }
    }
  }
}
```

## Key Features

✅ **Incremental Loading** - Load first 100, then load more on demand
✅ **Merged State** - New bookings merge with existing ones (not replaced)
✅ **Progress Display** - Shows "Showing X of Y bookings"
✅ **Smart Button** - "Load More" disappears when all loaded
✅ **Error Handling** - Graceful error display if load fails
✅ **Loading State** - Spinner during fetch to indicate progress
✅ **Date Persistence** - Remembers date range when loading more

## Usage in Components

### Access pagination state:
```javascript
const { pagination, isLoadingMore } = useBookings();

// pagination.hasMore — check if more data available
// pagination.total — total records
// pagination.currentPage — current page number
// isLoadingMore — true while fetching next page
```

### Load more bookings:
```javascript
const { loadMoreBookings } = useBookings();

await loadMoreBookings(startDate, endDate, outlet, 100);
```

## Performance Benefits

1. **Faster Initial Load** — Load 100 instead of 2000+ bookings
2. **Reduced Memory** — Calendar renders only loaded bookings
3. **Better UX** — Shows clear progress indicators
4. **Scalability** — Works with any number of bookings
5. **Network Efficient** — Load only what's needed

## Testing Checklist

- [ ] Calendar loads initial 100 bookings quickly
- [ ] PaginationControls shows correct counts
- [ ] "Load More" button appears when more data available
- [ ] Click "Load More" loads next batch
- [ ] New bookings appear in calendar
- [ ] Page count updates correctly
- [ ] "Load More" disappears when all loaded
- [ ] Error state displays gracefully
- [ ] Changing dates resets pagination
- [ ] Filters work with paginated data

## Future Enhancements

1. **Infinite Scroll** — Auto-load when scrolling near bottom
2. **Page Selector** — Jump to specific page number
3. **Customizable Limit** — User-selectable items per page
4. **Caching** — Cache previous pages to avoid re-fetching
5. **Sort Options** — Sort by date, therapist, status, etc.

