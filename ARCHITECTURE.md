# Architecture Overview — SPA Wellness Booking System

## Table of Contents

1. [Frontend Architecture](#frontend-architecture)
2. [Technology Stack](#technology-stack)
3. [Folder Structure](#folder-structure)
4. [State Management Strategy](#state-management-strategy)
5. [Performance Strategy](#performance-strategy)
6. [API Integration Approach](#api-integration-approach)
7. [Data Flow](#data-flow)
8. [Scalability and Large Data Loads](#scalability-and-large-data-loads)
9. [Key Technical Decisions and Trade-offs](#key-technical-decisions-and-trade-offs)
10. [Error Handling Strategy](#error-handling-strategy)
11. [Logging Approach](#logging-approach)
12. [Drag and Drop](#drag-and-drop)
13. [Routing and Bootstrap](#routing-and-bootstrap)
14. [Key Assumptions](#key-assumptions)
15. [React Hooks — Senior Developer Reference](#react-hooks--senior-developer-reference)

---

## Frontend Architecture

This is a **React 19 Single Page Application** for spa and wellness outlet management. The primary interface is a scrollable calendar board: therapists run horizontally, time runs vertically in 15-minute increments. Staff can create, view, edit, cancel, and drag-and-drop reschedule bookings directly from the board.

### Architectural pillars

| Pillar | Implementation |
|---|---|
| State | 4 independent React Contexts + `useReducer` — no Redux |
| Rendering | 2D virtual grid — only visible columns and rows are in the DOM |
| Data | Page-based API pagination with in-memory cache + silent prefetch |
| Styling | Tailwind CSS utility classes — zero runtime CSS-in-JS cost |
| Interactions | `@hello-pangea/dnd` with optimistic updates + rollback |

The app is designed to handle **up to 200 therapists** and **2,000 bookings per day** without UI lag, achieved through virtual rendering, Map-based O(1) state lookups, memoised component trees, and a multi-layer caching strategy.

---

## Technology Stack

| Concern | Choice | Reason |
|---|---|---|
| UI framework | React 19 (CRA) | Concurrent features, stable ecosystem |
| State management | React Context + `useReducer` | No external dependency; predictable flux-style actions |
| Styling | Tailwind CSS | Utility-first, no runtime cost, consistent design tokens |
| HTTP client | Axios | Interceptor support for auth injection and 401 handling |
| Drag and drop | @hello-pangea/dnd | Actively maintained fork of react-beautiful-dnd |
| Routing | React Router v6 | Declarative routes, `React.lazy` code-splitting |
| Date handling | date-fns + custom utils | Lightweight, tree-shakeable, DD-MM-YYYY API format |
| Logging | Custom Logger class | Ring buffer, structured output, level suppression in prod |

---

## Folder Structure

```
src/
├── App.js                    Bootstrap gate — shows loading/error state before routing
├── index.js                  Provider tree composition + React root
│
├── contexts/                 Global state (useReducer pattern)
│   ├── AuthContext.js        Token lifecycle, login/logout, 401 interception
│   ├── BookingContext.js     Booking CRUD, optimistic DnD, page cache, prefetch
│   ├── MasterDataContext.js  Therapists, services, rooms with TTL/per-date caching
│   └── UIContext.js          Panel, modal, toasts, selected date, refresh trigger
│
├── hooks/                    Custom hooks — thin context consumers + composed logic
│   ├── useAuth.js
│   ├── useBookings.js
│   ├── useMasterData.js
│   ├── useUI.js
│   ├── useBootstrapApp.js    One-time app init (auto-login + first data load)
│   ├── useMergedTherapists.js Derives visible therapist list from current bookings
│   ├── useVirtualGrid.js     2D scroll virtualisation (column + row windowing)
│   ├── useDebounce.js
│   └── useFilterState.js     Client-side filter/search derived state
│
├── services/                 API layer — Axios calls only, zero business logic
│   ├── apiClient.js          Axios singleton with request/response interceptors
│   ├── authService.js        Login endpoint
│   ├── bookingService.js     Booking CRUD + customer creation
│   ├── therapistService.js   Therapist list with in-memory 5-minute TTL cache
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
│   │                         CurrentTimeLine, CalendarSkeleton
│   ├── common/               Button, Input, Select, Badge, Modal, Toast,
│   │                         ErrorBoundary, FilterModal, CancelDeleteModal,
│   │                         LoadingSpinner, PaginationControls
│   └── layout/               AppShell, NavBar, FiltersBar, RightPanel
│
├── pages/
│   ├── CalendarPage.js       Data fetch orchestration, pagination, date management
│   ├── BookingsPage.js       List view (stub)
│   └── SettingsPage.js       Settings (stub)
│
└── utils/
    ├── bookingTransform.js   Normalise API ↔ internal booking shape
    ├── dateUtils.js          date-fns wrappers + DD-MM-YYYY conversions
    ├── timeUtils.js          Pixel math for time-grid positioning
    ├── validators.js         Form field validation
    └── logger.js             Structured logger with ring buffer
```

---

## State Management Strategy

The application uses **four independent React Contexts**, each backed by a `useReducer` reducer. This replaces Redux without introducing an external dependency. Each context owns a single domain and exposes only named actions and derived values — components never write state directly.

### Provider nesting (`index.js`)

```
AuthProvider
  └── MasterDataProvider
        └── BookingProvider
              └── UIProvider
                    └── App
```

`Auth` is outermost because all downstream providers may need the current token. `MasterData` sits above `Booking` because therapist and service lists are referenced when transforming raw API responses.

### BookingContext state shape

```js
{
  bookings:      Map<id, booking>,  // O(1) lookup by booking ID
  selectedBookingId: null,
  isLoading:     false,             // first page of new date range → skeleton
  isPageLoading: false,             // page navigation → overlay, keeps current bookings visible
  isSubmitting:  false,
  error:         null,
  pagination: {
    currentPage, lastPage,
    perPage: 30, count, hasMore
  },
}
```

`Map` is used instead of an array so drag-and-drop can look up and update a booking in O(1). DnD rollback is also O(1) — the previous booking object is stored before the optimistic update and restored directly by ID.

### UIContext additions

`UIContext` carries a `refreshKey` counter. The Today button calls `triggerRefresh()` which increments it. `CalendarPage` includes `refreshKey` in its `useEffect` dependency array and bypasses the de-duplicate fetch guard when the key changes, forcing a fresh API load even when the selected date has not changed.

### Why not Redux / Zustand / Jotai?

The domain is small enough (4 slices, clear boundaries) that Context + `useReducer` provides the same flux-style predictability without bundle weight or learning-curve overhead. If the app grows to 10+ slices or needs cross-cutting middleware (logging, undo), Zustand would be the next natural step.

---

## Performance Strategy

### 1. Two-tier loading states

| State | Trigger | UX |
|---|---|---|
| `isLoading` | First page of a new date range | Full skeleton replaces calendar |
| `isPageLoading` | Page navigation (Prev / Next) | Semi-transparent overlay keeps previous content visible |

This prevents blank-screen flash on first load while still giving feedback during page switches.

### 2. 2D virtual rendering (`useVirtualGrid`)

`useVirtualGrid` listens to scroll events via `requestAnimationFrame` throttling and calculates which columns and rows are within the viewport plus an overscan buffer.

```
Visible columns = floor(scrollLeft / 180) ± 3 overscan
Visible rows    = floor(scrollTop  / 40)  ± 5 overscan
```

At 200 therapists on a 1,440 px screen, only ~11 `TherapistColumn` components are mounted at any time regardless of total therapist count. Off-screen columns are fully absent from the DOM.

### 3. Map-based booking storage

- O(1) lookup for DnD optimistic updates and rollbacks
- O(1) lookup for cancel and delete
- O(n) iteration for the calendar render pass — unavoidable, done once per render in `bookingsByTherapist`

### 4. Pre-grouped booking data

`CalendarGrid` runs one `useMemo` pass that groups all filtered bookings by `therapist_id` into `Map<therapistId, booking[]>`. Each `TherapistColumn` receives only its own subset — eliminates an O(n) filter per column per render.

### 5. Memoisation

| Component | Strategy |
|---|---|
| `CalendarGrid` | `React.memo` with custom prop comparator |
| `CalendarHeader` | `React.memo` |
| `TherapistColumn` | `React.memo` |
| `BookingCard` | `React.memo` |
| `EmptySlot` | `React.memo` |
| `TimeGutter` | `React.memo` |
| `CurrentTimeLine` | `React.memo` |

All context action functions are stabilised with `useCallback`. Derived values (`visibleTherapists`, `bookingsList`, `bookingsByTherapist`, `timeLabels`) use `useMemo`.

### 6. Page-based pagination with in-memory cache

`BookingContext` maintains four refs that hold all caching state. They use `useRef` (not `useState`) so cache writes never trigger a re-render:

```
pageCacheRef        Map<page, { bookings, pagination }>  — fetched page snapshots
activeFetchRef      Set<page>                            — user-triggered fetches in flight
prefetchRef         Set<page>                            — silent background fetches in flight
prefetchPromisesRef Map<page, Promise>                   — handoff: lets fetchPage await
                                                           an in-flight prefetch instead of
                                                           firing a duplicate API request
```

Cache is invalidated (`pageCacheRef.current.clear()`) after any create, update, delete, or cancel success.

### 7. Prefetch strategy — keep the next 2 pages warm

After any page renders (cache hit, handoff, or fresh fetch), `prewarm()` fires `prefetchPageSilent` for `currentPage + 1` and `currentPage + 2`. All three guards inside `prefetchPageSilent` prevent duplicates:

```
page 1 loaded  → prefetch [2, 3]
page 2 reached → prefetch [3, 4]  — 3 already in flight/cached, only 4 is new
page 3 reached → prefetch [4, 5]  — 4 already cached, only 5 is new
```

`prefetchPageSilent` is a synchronous function that returns immediately. The async work runs inside an IIFE Promise that is stored in `prefetchPromisesRef`. If the user navigates to a page that is still being prefetched, `fetchPage` awaits that existing Promise instead of firing a duplicate API request — zero extra network calls.

### 8. Code-splitting

`AppShell`, `CalendarPage`, `BookingsPage`, and `SettingsPage` are lazy-loaded via `React.lazy` + `Suspense`. The initial bundle is limited to bootstrap and routing code.

---

## API Integration Approach

### Axios client (`services/apiClient.js`)

- **Base URL**: `REACT_APP_API_BASE_URL` environment variable.
- **Timeout**: 30 seconds.
- **Request interceptor**: reads `spa_auth_token` from `localStorage`, injects `Authorization: Bearer <token>` on every outgoing request.
- **Response interceptor**: on 401, clears `localStorage` and fires the registered `onUnauthorized` callback, decoupling the auth trigger from the service layer. All errors are logged through the structured logger before re-throwing.

### Booking endpoints

| Action | Method + Path |
|---|---|
| List bookings | `GET /api/v1/bookings/outlet/booking/list?daterange=…&per_page=30&page=N` |
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

### Date format

The API uses `DD-MM-YYYY` throughout. The `daterange` query parameter uses the format `DD-MM-YYYY / DD-MM-YYYY`. All conversions are centralised in `utils/dateUtils.js` — no component or service parses date strings directly.

### Response normalisation (`bookingTransform.js`)

API responses are normalised to a stable internal shape via `transformBookingFromApi`. This single transform point decouples the rest of the application from API field-naming changes. The inverse, `transformBookingToApi`, prepares the FormData payload for create and update calls.

---

## Data Flow

### Booking load (CalendarPage mount / date change)

```
CalendarPage.useEffect [selectedDate, refreshKey]
  → compute startDate / endDate
  → bypass lastFetchedRef guard if refreshKey changed (Today button)
  → fetchPage(startDate, endDate, page=1, outlet, isFirstLoad=true)
    → clear pageCacheRef + all in-flight refs
    → dispatch FETCH_PAGE_REQUEST (isFirstLoad=true)
      → bookings Map cleared, isLoading=true → CalendarSkeleton shown
    → bookingService.getBookings(startDate, endDate, outlet, 30, 1)
    → transformBookingsFromApi(raw)
    → dispatch FETCH_PAGE_SUCCESS → Map rebuilt, isLoading=false
    → prewarm(1, lastPage) → prefetch pages [2, 3] silently
      → CalendarGrid re-renders
        → bookingsByTherapist recomputed (useMemo)
          → visibleTherapists sliced (useMemo)
            → TherapistColumn[] rendered (virtualised)
```

### Page navigation (Prev / Next)

```
PaginationControls.onNextPage
  → CalendarPage.handleNextPage
    → fetchPage(startDate, endDate, currentPage + 1)

      ── Cache hit:
         dispatch FETCH_PAGE_SUCCESS instantly (0 API calls, 0 loader)

      ── Prefetch handoff:
         dispatch FETCH_PAGE_REQUEST (isPageLoading=true → overlay)
         await prefetchPromisesRef.get(page)
         serve from cache → dispatch FETCH_PAGE_SUCCESS

      ── Cache miss:
         dispatch FETCH_PAGE_REQUEST (isPageLoading=true → overlay)
         await bookingService.getBookings(...)
         cache write → dispatch FETCH_PAGE_SUCCESS
         prewarm(currentPage, lastPage)
```

### Booking create

```
EmptySlot.onClick
  → UIContext.openPanel('create', { date, time, therapist_id })
    → RightPanel renders BookingForm
      → user fills form
        → RightPanel footer → formRef.requestSubmit()
          → BookingForm.handleSubmit
            → bookingService.createOrGetCustomer()
            → bookingService.createBooking(transformedFormData)
            → dispatch CREATE_SUCCESS → booking added to Map
            → pageCacheRef.current.clear() — cache invalidated
              → BookingCard appears on calendar
            → UIContext.closePanel()
```

### Drag-and-drop reschedule

```
User drags BookingCard to new TherapistColumn
  → CalendarGrid.handleDragEnd
    → rescheduleOptimistic(bookingId, { therapist_id, therapist_name })
      → Map updated immediately → card moves visually
    → updateBooking(bookingId, updateData, currentBooking) [async]
      → success: UPDATE_SUCCESS → Map updated with server response
                 pageCacheRef.current.clear()
      → failure: rescheduleRollback(bookingId, previousState)
                 → Map restored → card snaps back
                 → addToast('Reschedule failed', 'error')
```

---

## Scalability and Large Data Loads

### The problem

A busy spa day can have 2,000 bookings across 200 therapists. Rendering all of them simultaneously would create thousands of DOM nodes, make every re-render slow, and hammer the API on load.

### Solutions applied at each layer

**Network layer — paginated fetching (30 per page)**

`per_page=30` keeps each API response under ~15 KB. Page 1 loads and renders while pages 2 and 3 prefetch silently. Navigation between pages hits the in-memory cache (zero API calls after first visit), and the prefetch strategy keeps the next 2 pages warm at all times.

**State layer — Map<id, booking>**

Using a `Map` instead of an array means all CRUD operations (lookup, update, delete) are O(1). The alternative — scanning an array — would be O(n) per operation, visibly slow at 2,000 entries.

**Render layer — 2D virtualisation**

`useVirtualGrid` limits the DOM to the viewport's visible columns and rows plus an overscan buffer. At 200 therapists, only ~11 columns exist in the DOM at any time. Adding more therapists has negligible render cost.

**Render layer — pre-grouped bookings**

`bookingsByTherapist` is a single `useMemo` that converts the flat booking array into `Map<therapistId, booking[]>`. Each `TherapistColumn` receives only its own slice — eliminates an O(n) scan per column per render, reducing per-render complexity from O(n×k) to O(n+k).

**Component layer — memoisation**

Every calendar component uses `React.memo`. Updating one booking only re-renders the one `TherapistColumn` that owns it and the `BookingCard` that changed — not the entire grid.

**Calendar layer — virtual rows**

Within each column, only booking cards whose time falls inside `visibleRowRange` are rendered. Cards scrolled far off screen are unmounted.

---

## Key Technical Decisions and Trade-offs

### What was optimised for

| Decision | Rationale |
|---|---|
| **Instant page navigation** | Pages are served from in-memory cache after the first visit. The prefetch strategy means Prev/Next often resolve from cache with no loader shown at all. |
| **Zero re-renders from cache** | Cache state lives in `useRef` refs (`pageCacheRef`, `activeFetchRef`, `prefetchRef`, `prefetchPromisesRef`). Cache writes never touch React state and never trigger re-renders. |
| **Optimistic DnD** | The calendar responds to drag-drop instantly. The API call runs in the background. Failure is handled by rollback + toast — the user gets immediate feedback. |
| **No duplicate API requests** | `activeFetchRef` and `prefetchRef` are `Set`s that track in-flight requests. `prefetchPromisesRef` allows `fetchPage` to await an in-flight prefetch instead of firing a second identical request. |
| **Mutation-safe date handling** | `CalendarPage` always clones `selectedDate` (`new Date(selectedDate)`) before calling `.setHours()`. Mutating the original would corrupt UIContext state silently. |
| **Skeleton vs overlay distinction** | `isLoading` (new date range) shows a full skeleton — users need to understand the entire view is being replaced. `isPageLoading` (page switch) shows a subtle overlay that keeps the previous page visible — switching page 2→3 is a refinement, not a full context change. |

### What was deprioritised

| Decision | Trade-off |
|---|---|
| **No persistent cache** | Booking data is not stored in IndexedDB or sessionStorage. A page refresh fetches from the API again. For a staff-facing tool with live data, freshness matters more than offline support. |
| **No TypeScript** | Chosen to move fast. The normalisation layer (`bookingTransform.js`) and explicit `propTypes` partially compensate, but a large refactor would benefit from types. |
| **Client-side filtering only** | Filters (therapist group, status, room) are applied to the current page's data in `CalendarGrid`. Filtering does not trigger a new API fetch with server-side filter params. This is fast but only filters the loaded page, not the full dataset. |
| **Hardcoded room list** | The rooms array in `FilterModal` is hardcoded. A production version would fetch this from the API. |
| **Single outlet scope** | All API calls default to `outlet=1`. Multi-outlet support would require propagating an outlet selector through context. |
| **No time-slot drag** | DnD supports horizontal therapist reassignment. Vertical time-slot dragging exists in `snapToNearestSlot` (utility function) but is not wired to the UI. |

---

## Error Handling Strategy

### Layers of error handling

**1. ErrorBoundary (render errors)**

A class component wraps the entire application tree. It catches any uncaught render-time exception, shows a fallback UI with a reset button, and logs the error through the structured logger. Without this, a single bad booking object crashing `BookingCard` would unmount the entire application.

**2. Axios response interceptor (network errors)**

The interceptor in `apiClient.js` handles the 401 case globally — it clears `localStorage` and fires `onUnauthorized()` (registered by `AuthContext`), which triggers a logout and redirect. All other errors are logged and re-thrown so the calling context can decide how to present them.

**3. Context action handlers (API errors)**

Every async action (`createBooking`, `updateBooking`, `fetchPage`, etc.) wraps the API call in `try/catch`. On failure it extracts `error.response?.data?.message || error.message` and dispatches a `*_FAILURE` action. The context state holds an `error` field which components can display.

**4. HTTP 422 validation errors**

Drag-and-drop reschedule catches 422 responses specifically: it extracts field-level errors from `error.response.data.errors`, shows them in a toast, and auto-opens the edit panel after a short delay so the user can resolve the missing fields.

**5. DnD rollback**

The `previousState` of a booking is captured before every optimistic update. On API failure, `rescheduleRollback(bookingId, previousState)` restores the Map entry exactly — the card snaps back to its original position.

**6. Prefetch failures (silent)**

`prefetchPageSilent` catches errors silently. A failed prefetch is not surfaced to the user. When the user navigates to that page, `fetchPage` detects the cache miss and runs a normal active fetch with the overlay loader.

---

## Logging Approach

### Logger (`utils/logger.js`)

```
Logger
  ├── Ring buffer (max 1,000 entries, oldest dropped first)
  ├── Levels: DEBUG | INFO | WARN | ERROR
  ├── DEBUG suppressed in production (process.env.NODE_ENV !== 'development')
  └── exportLogs() → JSON string for support tickets / debugging sessions
```

### Usage convention

```js
logger.debug('CalendarGrid', 'Processing bookings', { count, filters });
logger.info('Booking', 'Page 2/4 fetched → cached', { count: 30 });
logger.warn('API', '401 received', { url });
logger.error('Booking', 'Create failed', { error: err.message });
```

The first argument is a **context label** (component or domain name). This groups entries when scanning logs — searching for `"BookingContext"` shows the complete booking lifecycle, searching for `"CalendarGrid"` shows render and DnD activity.

### What is logged

| Level | When |
|---|---|
| `DEBUG` | Per-render derived values, scroll events, cache hits, skipped fetches |
| `INFO` | Successful API responses, page loads, booking CRUD completions, cache writes |
| `WARN` | Missing data (booking not found, invalid drop target), non-critical API quirks |
| `ERROR` | API failures, validation errors, DnD rollbacks, uncaught exceptions |

### Why a ring buffer

In a long-running staff session, uncapped logging would grow unbounded. The 1,000-entry ring buffer retains the most recent events (the ones relevant to any incident) while discarding stale history. `exportLogs()` allows a support agent to capture the buffer as JSON without requiring browser devtools access.

---

## Drag and Drop

Library: `@hello-pangea/dnd` (actively maintained fork of react-beautiful-dnd).

- `DragDropContext` wraps `CalendarGrid`.
- Each `TherapistColumn` is a `Droppable` with `droppableId="therapist-{id}"` and `type="BOOKING"`.
- Each `BookingCard` is a `Draggable` with `draggableId="booking-{id}"`.

**Optimistic update pattern**: The UI responds instantly — the booking Map is updated before the API call. If the API call fails, the previous booking state (captured before the optimistic update) is restored via `rescheduleRollback` and an error toast is displayed.

**Current scope**: horizontal therapist reassignment. `snapToNearestSlot` in `timeUtils.js` provides the pixel-to-time conversion required for future vertical time-slot drag support.

---

## Routing and Bootstrap

### Routes (`App.js`)

| Path | Component |
|---|---|
| `/` | CalendarPage |
| `/calendar` | CalendarPage |
| `/bookings` | BookingsPage |
| `/settings` | SettingsPage |
| `*` | Redirect to `/` |

All page components are loaded with `React.lazy`. `Suspense` shows `LoadingSpinner` while the chunk downloads.

### Bootstrap sequence (`useBootstrapApp.js`)

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

1. **Single outlet** — The app is scoped to outlet ID `1`. Multi-outlet support requires an outlet selector propagated through context and passed to every API call.

2. **Business hours** — The calendar renders 09:00–24:00. Bookings outside this window are not visible on the board.

3. **Customer deduplication** — Booking creation always calls `POST /users/create` first. The API is expected to return an existing customer if the provided email already exists.

4. **API contract** — The backend uses `POST` for both create and update (not `PUT`/`PATCH`). Date parameters use `DD-MM-YYYY`. Pagination is page-based with `per_page` and `page` query parameters.

5. **Authentication** — A pre-configured demo account is used. `LoginPage.js` and `ProtectedRoute.js` exist but auth is handled automatically by the bootstrap hook on every page load.

6. **Virtual rendering baseline** — `useVirtualGrid` assumes the calendar container fills the browser viewport. If the container is smaller, the visible range calculation over-renders slightly — it errs in the conservative direction and never under-renders.

---

## React Hooks — Senior Developer Reference

A senior developer working on this codebase (or any complex React application) needs deep familiarity with the following hooks. Understanding not just the API but the mental model behind each one is what separates mid-level from senior-level React work.

---

### `useState`

The foundation of component-local state. Key nuance: state updates are **asynchronous** — the new value is not immediately available on the next line, only on the next render. Functional updates (`setState(prev => ...)`) are required when the new value depends on the current one to avoid stale closure bugs.

---

### `useReducer`

Preferred over multiple `useState` calls when:
- State transitions are complex or interdependent (e.g., `isLoading`, `error`, `data` always change together)
- State logic needs to be testable in isolation
- Actions benefit from having named types (makes debugging and logging straightforward)

This codebase uses `useReducer` for all four Context providers. The reducer is a pure function — easy to unit test without rendering anything.

---

### `useEffect`

The most commonly misused hook. Key rules:
- Every reactive value used inside the effect **must** appear in the dependency array — omitting them creates stale closures that read outdated values.
- Effects run **after** the browser has painted. Use `useLayoutEffect` for DOM measurements that must happen before paint.
- The cleanup function runs before the next effect execution and on unmount — critical for clearing timers, aborting fetch requests, and removing event listeners.
- An empty `[]` dependency array means "run once on mount" — but it also means the effect closure captures the initial values of all variables forever.

In this codebase: `CalendarPage.useEffect` depends on `[selectedDate, refreshKey, fetchPage, loadTherapists, loadRooms]`. Adding `refreshKey` was required to force a re-fetch when the Today button is clicked even when the date hasn't changed.

---

### `useCallback`

Returns a memoised function reference that only changes when its dependencies change. Critical for two scenarios:
1. **Functions passed to `React.memo` children** — a new function reference on every render defeats memoisation.
2. **Functions listed in `useEffect` dependencies** — an unstable function reference causes the effect to re-run on every render.

In this codebase: `fetchPage`, `prefetchPageSilent`, all CRUD actions, and all event handlers are stabilised with `useCallback`. `prefetchPageSilent` has an empty `[]` dependency array because it only reads `useRef` values (which are stable by definition).

---

### `useMemo`

Returns a memoised computed value. Use it when:
- The computation is expensive (e.g., grouping 2,000 bookings by therapist)
- The result is used as a prop and the child is wrapped in `React.memo`
- A new array/object reference would unnecessarily invalidate downstream memos

In this codebase: `bookingsByTherapist`, `bookingsList`, and `visibleTherapists` are all `useMemo`. Without them, every context update would re-group all bookings and re-render all visible columns.

> **Common mistake**: wrapping every value in `useMemo`. The hook has overhead. Only use it when the computation is measurably expensive or when referential stability is required.

---

### `useRef`

Returns a mutable container (`{ current: value }`) that persists across renders **without causing re-renders** when changed. Two distinct use cases:

**1. DOM references** — accessing a DOM node directly (e.g., `containerRef` on the scroll container to read `scrollLeft` / `scrollTop` in `useVirtualGrid`).

**2. Mutable instance variables** — values that must persist across renders but must not trigger re-renders when changed:
- `pageCacheRef` — the page cache. Writing to the cache must not re-render the calendar.
- `activeFetchRef`, `prefetchRef`, `prefetchPromisesRef` — in-flight request tracking.
- `lastFetchedRef` — stores the last-fetched date range to prevent duplicate API calls on re-renders.
- `prevRefreshKeyRef` — stores the previous `refreshKey` value to detect Today-button clicks.

> **Senior insight**: if a value needs to be read inside an effect or callback but must not be listed as a dependency (because listing it would cause an infinite loop or unnecessary re-runs), store it in a ref. The ref object itself is stable — only `.current` changes.

---

### `useContext`

Subscribes a component to a context value. Every consumer re-renders whenever any part of the context value changes. This is why the four contexts in this app are **split by domain** — a toast added to `UIContext` does not re-render `BookingContext` consumers, and a new booking dispatched to `BookingContext` does not re-render the `FiltersBar` which only reads `UIContext`.

---

### `useLayoutEffect`

Runs synchronously after DOM mutations but **before** the browser paints. Use for:
- Reading DOM layout (element dimensions, scroll position) before the user sees the frame
- Imperatively repositioning elements to avoid flicker

In most cases `useEffect` is correct. `useLayoutEffect` is for the rare cases where you must read the DOM synchronously after an update.

---

### `useId` (React 18+)

Generates a stable, unique ID that is consistent between server and client renders. Use for `aria-*` and `htmlFor` / `id` attribute pairs in accessible form components. Avoids the index-based ID anti-pattern.

---

### Custom hooks

The senior skill is knowing when to extract logic into a custom hook:
- Reuse across multiple components (`useDebounce`, `useVirtualGrid`)
- Isolate context consumption (`useBookings`, `useUI`, `useMasterData`)
- Co-locate complex derived state with the logic that produces it (`useMergedTherapists`, `useFilterState`)

Custom hooks can call other hooks, return JSX helpers, and have their own effects and cleanup. They are the primary composition primitive in modern React.

---

### Hook dependency array — the mental model

```
useEffect / useCallback / useMemo all take a dependency array.

Rule: every value from the component scope that is READ inside the
      callback/effect must be in the array.

If that rule causes an infinite loop → the value you need to read
without reacting to is mutable instance state → move it to a useRef.

If that rule causes unnecessary re-runs → the value changes reference
but not meaning (e.g., a new array literal each render) → stabilise
with useMemo or useCallback upstream.
```

Understanding this mental model is what prevents the two most common senior-level React bugs: stale closures (value omitted from deps) and infinite re-render loops (unstable value in deps).
