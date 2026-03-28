import React from 'react';

/**
 * PaginationControls — Page-based navigation footer
 *
 * Shows:  "397 bookings total  ·  30 shown"
 *         [← Prev]  Page 2 of 14  [Next →]
 *
 * Loading states:
 *   isLoading=true (first page) → spinner + "Loading bookings…"
 *   isLoading=true (page switch) → spinner, buttons disabled
 *
 * Hidden entirely when count === 0 (no data yet).
 */
const PaginationControls = ({
  pagination = {},
  isLoading = false,
  loadedCount = 0,
  onNextPage,
  onPrevPage,
}) => {
  const {
    currentPage = 1,
    lastPage = 1,
    count = 0,
  } = pagination;

  // Don't render until we have at least metadata
  if (count === 0 && !isLoading) return null;

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < lastPage;
  const multiPage = lastPage > 1;

  return (
    <div className="flex items-center justify-between px-6 py-3 bg-gray-50 select-none">

      {/* ── Left: booking count summary ─────────────────────────── */}
      <div className="text-sm text-gray-600 min-w-0">
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span
              className="inline-block w-3.5 h-3.5 border-2 border-gray-300 border-t-orange-500 rounded-full animate-spin"
              aria-hidden="true"
            />
            <span>Loading bookings…</span>
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <span className="text-green-600 font-bold mr-1">✓</span>
            <span className="font-semibold text-gray-900">
              {count.toLocaleString()}
            </span>
            <span> bookings total</span>
            {multiPage && (
              <span className="text-gray-400 ml-1">
                · {loadedCount.toLocaleString()} shown
              </span>
            )}
          </span>
        )}
      </div>

      {/* ── Right: page navigation (only shown when > 1 page) ───── */}
      {multiPage && (
        <div className="flex items-center gap-2 ml-4 flex-shrink-0">

          {/* Previous button */}
          <button
            onClick={onPrevPage}
            disabled={!hasPrev || isLoading}
            aria-label="Previous page"
            className="
              flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md
              border border-gray-300 bg-white text-gray-700
              hover:bg-gray-50 active:bg-gray-100
              disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white
              transition-colors
            "
          >
            ← Prev
          </button>

          {/* Page indicator */}
          <span className="text-sm text-gray-700 font-medium tabular-nums px-1 whitespace-nowrap">
            Page{' '}
            <span className="font-semibold text-gray-900">{currentPage}</span>
            {' '}of{' '}
            <span className="font-semibold text-gray-900">{lastPage}</span>
          </span>

          {/* Next button */}
          <button
            onClick={onNextPage}
            disabled={!hasNext || isLoading}
            aria-label="Next page"
            className="
              flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md
              border border-gray-300 bg-white text-gray-700
              hover:bg-gray-50 active:bg-gray-100
              disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white
              transition-colors
            "
          >
            Next →
          </button>

          {/* Inline spinner during page switch */}
          {isLoading && (
            <span
              className="ml-1 inline-block w-4 h-4 border-2 border-gray-300 border-t-orange-500 rounded-full animate-spin"
              aria-hidden="true"
            />
          )}
        </div>
      )}
    </div>
  );
};

export default PaginationControls;
