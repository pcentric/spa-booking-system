import React from 'react';

/**
 * PaginationControls — Batch-based pagination with Next/Prev buttons
 */
const PaginationControls = ({
  pagination = {},
  onLoadMore,
  isLoading = false,
  loadedCount = 0,
  loadingProgress = {},
  batchPage = 1,
  totalBatches = 0,
  onNextBatch,
  onPrevBatch,
}) => {
  // Return null if no pagination data or count is 0
  // Note: pagination.count is the total bookings from the API (not pagination.total)
  if (!pagination || pagination.count === undefined || pagination.count === 0) {
    return null;
  }

  const canShowBatchNav = totalBatches > 1;
  const hasPrev = batchPage > 1;
  const hasNext = batchPage < totalBatches;
  const isLoaded = !isLoading && loadedCount > 0;

  // Format large numbers with commas
  const formatNumber = (num) => num.toLocaleString();

  // Get total count from pagination (real total bookings, not estimated)
  const totalBookings = pagination?.count ?? 0;

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
      {/* Left: Pagination Info */}
      <div className="flex-1 text-sm">
        {isLoaded ? (
          <div className="flex items-center gap-2 text-gray-700">
            <span className="text-green-600 font-bold">✓</span>
            <span>
              <span className="font-semibold">{formatNumber(totalBookings)}</span>
              <span> bookings total</span>
              {canShowBatchNav && (
                <span className="ml-3 text-gray-500">
                  · Batch <span className="font-semibold">{batchPage}</span> of{' '}
                  <span className="font-semibold">{totalBatches}</span>
                </span>
              )}
            </span>
          </div>
        ) : (
          <div className="text-gray-600">Loading bookings...</div>
        )}
      </div>

      {/* Right: Batch Navigation Buttons */}
      {canShowBatchNav && (
        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={onPrevBatch}
            disabled={!hasPrev || isLoading}
            className="px-3 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white flex items-center gap-1"
            title="Previous batch"
          >
            ← Prev
          </button>

          <span className="text-xs text-gray-500 px-2">
            {batchPage} / {totalBatches}
          </span>

          <button
            onClick={onNextBatch}
            disabled={!hasNext || isLoading}
            className="px-3 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white flex items-center gap-1"
            title="Next batch"
          >
            Next →
          </button>

          {isLoading && (
            <div className="ml-2 w-4 h-4 border-2 border-gray-300 border-t-brand-orange rounded-full animate-spin" />
          )}
        </div>
      )}
    </div>
  );
};

export default PaginationControls;
