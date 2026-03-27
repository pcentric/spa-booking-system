import React from 'react';

/**
 * PaginationControls — Display pagination info and load more button
 */
const PaginationControls = ({
  pagination = {},
  onLoadMore,
  isLoading = false,
  isLoadingMore = false,
}) => {
  // Return null if no pagination data or total is 0
  if (!pagination || !pagination.total || pagination.total === 0) {
    return null;
  }

  const { currentPage = 1, totalPages = 1, total = 0, limit = 100, offset = 0, hasMore = false } = pagination;
  const loadedCount = Math.min(offset + limit, total);

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
      <div className="text-sm text-gray-600">
        <span>Showing </span>
        <span className="font-semibold">{loadedCount}</span>
        <span> of </span>
        <span className="font-semibold">{total}</span>
        <span> bookings</span>
        {totalPages && totalPages > 1 && (
          <span className="ml-4 text-gray-500">
            Page <span className="font-semibold">{currentPage}</span> of{' '}
            <span className="font-semibold">{totalPages}</span>
          </span>
        )}
      </div>

      {hasMore && onLoadMore && (
        <button
          onClick={onLoadMore}
          disabled={isLoading || isLoadingMore}
          className="px-4 py-2 text-sm font-semibold text-white bg-brand rounded-lg hover:bg-brand/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isLoadingMore ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Loading...
            </>
          ) : (
            'Load More Bookings'
          )}
        </button>
      )}

      {!hasMore && loadedCount > 0 && (
        <div className="text-sm text-gray-500">
          All bookings loaded
        </div>
      )}
    </div>
  );
};

export default PaginationControls;
