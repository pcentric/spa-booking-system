import React from 'react';

/**
 * PaginationControls — Page-based navigation footer
 * Mobile: two-row stacked layout with condensed text
 * Desktop: single row with full labels
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

  if (count === 0 && !isLoading) return null;

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < lastPage;
  const multiPage = lastPage > 1;

  return (
    <div className="bg-gray-50 select-none px-3 md:px-6 py-2 md:py-3">

      {/* Single-row on desktop, two-row on mobile */}
      <div className="flex items-center justify-between sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-0">

        {/* ── Booking count summary ── */}
        <div className="text-xs sm:text-sm text-gray-600 min-w-0">
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 border-2 border-gray-300 border-t-orange-500 rounded-full animate-spin" aria-hidden="true" />
              <span>Loading bookings…</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 flex-wrap">
              <span className="text-green-600 font-bold">✓</span>
              <span className="font-semibold text-gray-900">{count.toLocaleString()}</span>
              {/* "bookings total" hidden on smallest screens */}
              <span className="hidden xs:inline sm:inline"> bookings total</span>
              <span className="inline xs:hidden sm:hidden text-gray-500">total</span>
              {multiPage && (
                <span className="text-gray-400">
                  · <span className="hidden sm:inline">{loadedCount.toLocaleString()} shown</span>
                  <span className="inline sm:hidden">{loadedCount.toLocaleString()} shown</span>
                </span>
              )}
            </span>
          )}
        </div>

        {/* ── Page navigation ── */}
        {multiPage && (
          <div className="flex items-center gap-1.5 sm:gap-2 sm:ml-4 flex-shrink-0">

            {/* Prev button */}
            <button
              onClick={onPrevPage}
              disabled={!hasPrev || isLoading}
              aria-label="Previous page"
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium rounded-md
                border border-gray-300 bg-white text-gray-700
                hover:bg-gray-50 active:bg-gray-100
                disabled:opacity-40 disabled:cursor-not-allowed
                transition-colors"
            >
              {/* Short on mobile, full on desktop */}
              <span className="sm:hidden">‹</span>
              <span className="hidden sm:inline">← Prev</span>
            </button>

            {/* Page indicator */}
            <span className="text-xs sm:text-sm text-gray-700 font-medium tabular-nums px-1 whitespace-nowrap">
              <span className="font-semibold text-gray-900">{currentPage}</span>
              <span className="text-gray-400"> / </span>
              <span className="font-semibold text-gray-900">{lastPage}</span>
            </span>

            {/* Next button */}
            <button
              onClick={onNextPage}
              disabled={!hasNext || isLoading}
              aria-label="Next page"
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium rounded-md
                border border-gray-300 bg-white text-gray-700
                hover:bg-gray-50 active:bg-gray-100
                disabled:opacity-40 disabled:cursor-not-allowed
                transition-colors"
            >
              <span className="sm:hidden">›</span>
              <span className="hidden sm:inline">Next →</span>
            </button>

            {/* Inline spinner during page switch */}
            {isLoading && (
              <span className="inline-block w-3.5 h-3.5 border-2 border-gray-300 border-t-orange-500 rounded-full animate-spin ml-1" aria-hidden="true" />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PaginationControls;
