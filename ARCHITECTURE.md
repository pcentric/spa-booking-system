# Architecture Overview — SPA Wellness Booking System

## Table of Contents

1. [High-Level Overview](#high-level-overview)
2. [Technology Stack](#technology-stack)
3. [Folder Structure](#folder-structure)
4. [State Management](#state-management)
5. [Context Providers](#context-providers)
6. [Component Architecture](#component-architecture)
7. [Calendar System](#calendar-system)
8. [Performance Strategy](#performance-strategy)
9. [API Integration Layer](#api-integration-layer)
10. [Data Flow](#data-flow)
11. [Drag and Drop](#drag-and-drop)
12. [Caching Strategy](#caching-strategy)
13. [Error Handling and Logging](#error-handling-and-logging)
14. [Routing and Bootstrap](#routing-and-bootstrap)
15. [Key Assumptions](#key-assumptions)

---

## High-Level Overview

This is a React 19 Single Page Application for spa and wellness outlet management. The primary interface is a scrollable calendar board where therapists are arranged horizontally and time runs vertically in 15-minute increments. Staff can create, view, edit, cancel, and reschedule bookings directly from the board.

The application is optimised to handle up to **200 therapists** and **2,000 bookings per day** without UI lag. This is achieved through 2D virtual rendering, Map-based state storage, and memoised component trees.

---

## Technology Stack

| Concern | Choice | Reason |
|---|---|---|
| UI framework | React 19 (CRA) | Concurrent features, stable ecosystem |
| State management | React Context + useReducer | No external dependency; predictable actions |
| Styling | Tailwind CSS | Utility-first, no runtime cost |
| HTTP client | Axios | Interceptor support for auth and error handling |
| Drag and drop | @hello-pangea/dnd | Maintained fork of react-beautiful-dnd |
| Routing | React Router v6 | Declarative routes, lazy loading |
| Date handling | date-fns | Lightweight, tree-shakeable |
| Logging | Custom Logger class | Ring buffer, structured output, exportable |

---

## Folder Structure

```
src/
├── App.js                    Bootstrap gate — shows loading/error before routing
├── index.js                  Provider tree + React root
│
├── contexts/                 Global state (useReducer pattern)
│   ├── AuthContext.js        Token lifecycle, login/logout, 401 handling
│   ├── BookingContext.js     All booking CRUD, optimistic DnD, pagination
│   ├── MasterDataContext.js  Therapists, services, rooms with caching
│   └── UIContext.js          Panel open/close, modal, toasts, selected date
│
├── hooks/                    Custom hooks (thin consumers + logic)
│   ├── useAuth.js            Reads AuthContext
│   ├── useBookings.js        Reads BookingContext
│   ├── useMasterData.js      Reads MasterDataContext
│   ├── useUI.js              Reads UIContext
│   ├── useBootstrapApp.js    One-time app init (login + first data load)
│   ├── useMergedTherapists.js Derives visible therapist list from bookings
│   ├── useVirtualGrid.js     2D scroll virtualisation (column + row windowing)
│   ├── useDebounce.js        Value debounce hook
│   └── useFilterState.js     Client-side filter/search derived state
│
├── services/                 API layer (Axios calls only, no business logic)
│   ├── apiClient.js          Axios singleton with request/response interceptors
│   ├── authService.js        Login endpoint
│   ├── bookingService.js     Booking CRUD + customer creation
│   ├── therapistService.js   Therapist list with in-memory TTL cache
│   ├── serviceService.js     Service catalogue endpoint
│   └── roomService.js        Room availability endpoint
│
├── components/
│   ├── auth/                 LoginPage, ProtectedRoute
│   ├── booking/              BookingForm, BookingDetail, BookingItemRow,
│   │                         RoomSelector, ServiceSelector,
│   │                         TherapistSelector, TimeSlotPicker
│   ├── calendar/             CalendarGrid, CalendarHeader, TherapistColumn,
│   │                         BookingCard, EmptySlot, TimeGutter,
│   │                         CurrentTimeLine, BookingInProgressCard/Slot
│   ├── common/               Button, Input, Select, Badge, Modal, Toast,
│   │                         ErrorBoundary, FilterModal, CancelDeleteModal,
│   │                         LoadingSpinner, PaginationControls
│   └── layout/               AppShell, NavBar, FiltersBar, RightPanel
│
├── pages/
│   ├── CalendarPage.js       Main calendar page — data fetch orchestration
│   ├── BookingsPage.js       List view (stub)
│   └── SettingsPage.js       Settings (stub)
│
└── utils/
    ├── bookingTransform.js   Normalise API response to internal booking shape
    ├── dateUtils.js          date-fns wrappers, DD-MM-YYYY conversions
    ├── timeUtils.js          Pixel math for time-grid positioning
    ├── validators.js         Field validation functions
    └── logger.js             Structured logger with ring buffer
```

---

## State Management

The application uses **four independent React Contexts**, each backed by a `useReducer` reducer. This replaces Redux without introducing an external dependency. Each context owns a discrete domain and exposes only actions and derived values — components never write state directly.

### Provider Nesting Order (`index.js`)

```
AuthProvider
  └── MasterDataProvider
        └── BookingProvider
              └── UIProvider
                    └── App
```

`Auth` is outermost because all other providers may depend on the current user or token. `MasterData` is loaded before `Booking` because therapist and service lists are referenced during booking transforms.

### BookingContext State Shape

```js
{
  bookings: Map<id, booking>,   // O(1) lookup by ID
  selectedBookingId: null,
  isLoading: false,
  isSubmitting: false,
  error: null,
  pagination: {
    currentPage, lastPage,
    perPage, count, hasMore
  },
  loadingProgress: { loaded, total },
  batchPage: 1,
  totalBatches: 0,
}
```

`Map` is used instead of an array so drag-and-drop can look up and update a booking in O(1). Rollback on DnD failure is also O(1) — the previous booking object is stored before the optimistic update and restored directly by ID.

---

## Context Providers

### AuthContext

Stores the auth token and current user object. On bootstrap, `useBootstrapApp` calls `login()` and stores the returned token in `localStorage` under `spa_auth_token`. Registers an `onUnauthorized` callback with `apiClient` so that a 401 response from any endpoint triggers an automatic logout without coupling service files to auth state.

### BookingContext

Central store for all bookings. Exposes: `fetchBatch`, `fetchAllBookings`, `createBooking`, `updateBooking`, `deleteBooking`, `cancelBooking`, `rescheduleOptimistic`, `rescheduleRollback`.

- **Batch fetching**: `fetchBatch` loads 3 API pages concurrently (up to 300 bookings) per call. `CalendarPage` uses this as the default strategy to avoid overwhelming the API.
- **Full fetch**: `fetchAllBookings` fires all remaining pages concurrently after loading page 1. Used when a complete day's data is required immediately.

### MasterDataContext

Stores therapists (array), services (array), rooms (`Map<"date_outlet", rooms[]>`). Rooms are cached per outlet+date combination and invalidated explicitly via `invalidateRooms()`. Therapist responses are additionally cached in `therapistService.js` at the service layer with a 5-minute TTL.

### UIContext

Controls the right panel mode (`detail` | `create` | `edit`), the selected booking ID for the panel, modal state (success/error/info), toast queue, selected calendar date, and sidebar visibility. All UI transitions go through `openPanel`, `closePanel`, `showModal`, `addToast` — components never touch layout state directly.

---

## Component Architecture

### AppShell

Top-level layout shell. Renders `NavBar`, `FiltersBar`, the current page as children, and `RightPanel`. Owns local `filters` state which is injected into the current page via `React.cloneElement`. This keeps filter state co-located with the UI controls that modify it.

### RightPanel

Slide-in panel driven by `UIContext.isPanelOpen`. Renders either:
- `BookingDetail` — read-only view with Edit and Cancel/Delete actions
- `BookingForm` — create or edit form (distinguished by `panelMode`)

The submit button lives in `RightPanel`'s footer and fires `formRef.current.requestSubmit()` so browser-native form validation runs before the submit handler.

### FiltersBar

Date navigation (Today / prev / next / date picker) + therapist name search (200ms debounced dropdown) + Filter button that opens `FilterModal`. The therapist search adds therapist IDs to `filters.selectedTherapists` which `CalendarGrid` uses to filter rendered bookings.

---

## Calendar System

### Time Grid Constants (`timeUtils.js`)

| Constant | Value |
|---|---|
| Day start | 09:00 |
| Day end | 24:00 (midnight) |
| Slot height | 40px |
| Slot duration | 15 minutes |
| Total slots | 60 (15 hours × 4) |
| Total column height | 2,400px |
| Column width | 180px |

### Layout

Therapist columns are rendered horizontally. Booking cards within each column are positioned **absolutely** using:

```
top    = (minutesFromDayStart(start_time) / 15) × 40px
height = (duration_minutes / 15) × 40px   (minimum 40px)
```

`TimeGutter` (left sticky column) shows an hourly label every 4th slot. `CalendarHeader` (top sticky row) shows therapist alias, gender colour badge, and booking count.

### CurrentTimeLine

A red horizontal rule at the current wall-clock time, recalculated every 60 seconds via `setInterval`. Positioned using the same `getTopPosition` formula as booking cards.

---

## Performance Strategy

### 1. 2D Virtual Rendering (`useVirtualGrid`)

`useVirtualGrid` listens to scroll events on the calendar container using `requestAnimationFrame` throttling and calculates which columns and rows are within the viewport plus an overscan buffer (3 columns, 5 rows). Only those `TherapistColumn` components are mounted; off-screen columns are absent from the DOM entirely.

```
Visible columns = floor(scrollLeft / 180) ± 3  (overscan)
Visible rows    = floor(scrollTop  / 40)  ± 5  (overscan)
```

At 200 therapists on a 1,440px wide screen, only ~11 columns are rendered at any time regardless of total therapist count.

### 2. Map-Based Booking Storage

`BookingContext` stores bookings as `Map<id, booking>`:
- O(1) lookup for drag-and-drop optimistic updates and rollbacks
- O(1) lookup for cancel and delete
- O(n) iteration for the calendar render pass (unavoidable, done once per render in `bookingsByTherapist`)

### 3. Pre-Grouped Booking Data

`CalendarGrid` runs one `useMemo` pass to group all bookings by `therapist_id` into a `Map<therapistId, booking[]>`. Each `TherapistColumn` receives only its own subset, eliminating an O(n) filter per column per render.

### 4. Memoisation

| Component | Strategy |
|---|---|
| `CalendarGrid` | `React.memo` with custom comparator |
| `CalendarHeader` | `React.memo` |
| `TherapistColumn` | `React.memo` |
| `BookingCard` | `React.memo` |
| `EmptySlot` | `React.memo` |
| `TimeGutter` | `React.memo` |
| `CurrentTimeLine` | `React.memo` |

All context action functions are stabilised with `useCallback`. Derived values (`visibleTherapists`, `bookingsList`, `bookingsByTherapist`, `timeLabels`) are wrapped in `useMemo`.

### 5. Lazy Loading

`AppShell`, `CalendarPage`, `BookingsPage`, and `SettingsPage` are code-split via `React.lazy` + `Suspense`. The initial bundle only contains bootstrap and routing code.

### 6. Batch Pagination

`fetchBatch` loads 3 API pages (300 bookings) at a time using `Promise.all`. The user navigates batches via `PaginationControls`. This limits initial network load and avoids the 20+ concurrent requests that a full-day fetch at 2,000 bookings would otherwise require.

---

## API Integration Layer

### Axios Client (`services/apiClient.js`)

- **Base URL**: `REACT_APP_API_BASE_URL` environment variable (falls back to the dev server).
- **Timeout**: 30 seconds.
- **Request interceptor**: reads `spa_auth_token` from `localStorage` and injects `Authorization: Bearer <token>` on every outgoing request.
- **Response interceptor**: handles 401 by clearing localStorage and firing the registered `onUnauthorized` callback; all errors are logged through the structured logger.

### Booking Endpoints

| Action | Method + Path |
|---|---|
| List bookings | `GET /api/v1/bookings/outlet/booking/list` |
| Booking detail | `GET /api/v1/bookings/:id` |
| Create booking | `POST /api/v1/bookings/create` (FormData) |
| Update booking | `POST /api/v1/bookings/:id` (FormData) |
| Delete booking | `DELETE /api/v1/bookings/destroy/:id` |
| Cancel item | `POST /api/v1/bookings/item/cancel` |
| Login | `POST /api/v1/login` |
| Create customer | `POST /api/v1/users/create` |
| Therapist list | `GET /api/v1/therapists` |
| Service catalogue | `GET /api/v1/service-category` |
| Rooms | `GET /api/v1/room-bookings/outlet/:outletId` |

### Date Format

The API uses `DD-MM-YYYY` throughout. The `daterange` query parameter uses the format `DD-MM-YYYY / DD-MM-YYYY` (space-slash-space separator). All conversions are centralised in `utils/dateUtils.js`.

### Response Normalisation (`bookingTransform.js`)

API booking responses are normalised to a stable internal shape via `transformBookingFromApi`. This single transform point decouples the rest of the application from API field-naming changes. The inverse, `transformBookingToApi`, prepares the FormData payload for create and update calls.

---

## Data Flow

### Booking Load (CalendarPage mount)

```
CalendarPage.useEffect
  → fetchBatch(startDate, endDate, batchPage=1)
    → BookingContext dispatch FETCH_REQUEST
    → bookingService.getBookings() × 3 concurrent (pages 1-3)
    → transformBookingsFromApi(allRaw)
    → BookingContext dispatch FETCH_BATCH_SUCCESS
      → bookings Map rebuilt
        → CalendarGrid re-renders
          → bookingsByTherapist recomputed (useMemo)
            → visibleTherapists sliced (useMemo)
              → TherapistColumn[] rendered (virtualised)
```

### Booking Create

```
EmptySlot.onClick
  → UIContext.openPanel('create', { date, time, therapist_id })
    → RightPanel renders BookingForm in create mode
      → User fills form
        → RightPanel footer submit → formRef.requestSubmit()
          → BookingForm.handleSubmit
            → BookingContext.createBooking(formData)
              → bookingService.createOrGetCustomer()
              → bookingService.createBooking(transformedData)
              → transformBookingFromApi(response)
              → dispatch CREATE_SUCCESS → booking added to Map
                → BookingCard appears on calendar
              → UIContext.closePanel()
```

### Drag and Drop Reschedule

```
User drags BookingCard to new TherapistColumn
  → CalendarGrid.handleDragEnd
    → parse source therapistId, destination therapistId from droppableId
    → rescheduleOptimistic(bookingId, { therapist_id, therapist_name })
      → Map updated immediately → card moves visually
    → updateBooking(bookingId, updateData, currentBooking) [async]
      → success: UPDATE_SUCCESS → Map updated with server response
      → failure: rescheduleRollback(bookingId, previousState)
                 → Map restored → card snaps back
                 → addToast('error', 'Reschedule failed')
```

---

## Drag and Drop

Library: `@hello-pangea/dnd` (maintained fork of react-beautiful-dnd).

- `DragDropContext` wraps `CalendarGrid`.
- Each `TherapistColumn` is a `Droppable` with `droppableId="therapist-{id}"` and `type="BOOKING"`.
- Each `BookingCard` is a `Draggable` with `draggableId="booking-{id}"`.

**Optimistic update pattern**: The UI responds instantly by updating the booking in the Map before the API call completes. If the API call fails, the previous booking state (captured before the optimistic update) is restored and an error toast is shown.

**Scope**: Drag currently supports therapist reassignment (horizontal movement). `snapToNearestSlot` in `timeUtils.js` provides the pixel-to-time conversion required for future vertical time-slot drag support.

---

## Caching Strategy

| Data | Location | Persistence | TTL |
|---|---|---|---|
| Auth token | `localStorage` | Survives page reload | Until logout or 401 |
| Auth user | `localStorage` | Survives page reload | Until logout |
| Booking Map | `BookingContext` in-memory | Session only | Cleared on date change |
| Therapist API responses | `therapistService.js` module Map | Session only | 5 minutes |
| Rooms | `MasterDataContext` Map | Session only | Manual invalidation |
| Services | `MasterDataContext` array | Session only | Session |

There is no persistence layer (IndexedDB, sessionStorage, service worker) for booking data. A page refresh triggers a full re-fetch from the API.

---

## Error Handling and Logging

### ErrorBoundary

A class component wrapping the entire application tree catches render-time errors, displays a fallback UI, and offers a reset button. Errors are logged via the structured logger.

### API Errors

All service functions use try/catch and re-throw. Context action handlers extract `error.response?.data?.message || error.message` before dispatching failure actions. HTTP 422 responses (validation errors) surface field-level error messages in the form rather than a generic notification.

### Structured Logger (`utils/logger.js`)

```
Logger
  ├── Ring buffer (max 1,000 entries)
  ├── Levels: DEBUG | INFO | WARN | ERROR
  ├── DEBUG suppressed in production (NODE_ENV !== 'development')
  └── exportLogs() → JSON string for support/debugging
```

Usage pattern:
```js
logger.debug('CalendarGrid', 'Processing bookings', { count });
logger.info('Booking', 'Created booking', { id });
logger.warn('API', '401 received', { url });
logger.error('Booking', 'Create failed', error);
```

The first argument is a context label (component or domain name) used to group log entries during debugging.

---

## Routing and Bootstrap

### Routes (`App.js`)

| Path | Component |
|---|---|
| `/` | CalendarPage |
| `/calendar` | CalendarPage |
| `/bookings` | BookingsPage |
| `/settings` | SettingsPage |
| `/dashboard` | Dashboard |
| `*` | Redirect to `/` |

All page-level components are loaded with `React.lazy`. `Suspense` shows `LoadingSpinner` while the chunk downloads.

### Bootstrap Sequence (`useBootstrapApp.js`)

```
App renders BootstrapWrapper
  → useBootstrapApp fires
    → authService.login(credentials)
      → token stored in localStorage
      → AuthContext updated
    → MasterDataContext.loadTherapists()
    → isReady = true → AppContent renders routing tree
```

The app performs an automatic login on startup. Until `isReady` is true, the user sees a full-screen loading state. If login fails, an error screen with a retry button is shown.

---

## Key Assumptions

1. **Single outlet**: The application is scoped to one outlet at a time. The outlet ID defaults to `1` in most API calls. Multi-outlet support would require an outlet selector and propagating the chosen ID through context.

2. **Business hours**: The calendar renders 09:00–24:00 only. Bookings outside this window are not visible on the board.

3. **Customer creation**: Booking creation always calls `POST /users/create` first. The API is expected to deduplicate and return an existing customer if the provided email matches a known record.

4. **API contract**: The backend uses `POST` for both create and update operations (not `PUT`/`PATCH`). Date parameters use `DD-MM-YYYY` format. Pagination is page-based with `per_page` and `page` query parameters (not offset-based).

5. **Authentication**: The app uses a pre-configured demo account. `LoginPage.js` and `ProtectedRoute.js` exist but authentication is handled automatically by the bootstrap hook on every page load.

6. **Virtual rendering baseline**: `useVirtualGrid` assumes the calendar container fills the browser viewport. If the container is smaller, the visible range calculation over-renders slightly (conservative direction — never under-renders).
