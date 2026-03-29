import React, { useMemo } from 'react';
import logger from '../../utils/logger';

/**
 * CalendarHeader — Top sticky row showing therapist names
 * Color-coded by gender (pink female #EC4899, blue male #3B82F6)
 * Receives virtualization state from CalendarGrid to stay in sync
 */
function CalendarHeader({ containerRef, virtualGrid, therapists = [], bookings = [], columnWidth = 180 }) {
  const visibleTherapists = useMemo(() => {
    if (!therapists || therapists.length === 0) return [];
    return therapists.slice(
      virtualGrid.visibleColumnRange.start,
      virtualGrid.visibleColumnRange.end
    );
  }, [therapists, virtualGrid.visibleColumnRange]);

  const getBadgeColor = (gender) => {
    if (!gender) return 'bg-gray-300';
    const lower = String(gender).toLowerCase();
    if (lower === 'female' || lower === 'f') return 'bg-pink-500';
    if (lower === 'male' || lower === 'm') return 'bg-blue-500';
    return 'bg-gray-300';
  };

  const getGenderLabel = (gender) => {
    if (!gender) return 'N/A';
    const lower = String(gender).toLowerCase();
    if (lower === 'female' || lower === 'f') return 'Female';
    if (lower === 'male' || lower === 'm') return 'Male';
    return 'Other';
  };

  logger.debug('CalendarHeader', 'Rendering therapist headers', {
    visibleStart: virtualGrid.visibleColumnRange.start,
    visibleEnd: virtualGrid.visibleColumnRange.end,
    count: visibleTherapists.length,
  });

  return (
    <div
      className="flex h-full"
      style={{
        height: '60px',
      }}
    >
      <div
        style={{
          display: 'flex',
          transform: `translateX(${virtualGrid.offsetLeft}px)`,
          width: '100%',
        }}
      >
        {visibleTherapists.map((therapist, idx) => {
          const genderLabel = getGenderLabel(therapist.gender);
          const bookingCount = bookings.filter(b => Number(b.therapist_id) === Number(therapist.id)).length;
          return (
            <div
              key={`header-${therapist.id}`}
              className="relative flex flex-col items-center justify-center border-r border-gray-300 bg-white"
              style={{
                width: `${columnWidth}px`,
                height: '60px',
                minWidth: `${columnWidth}px`,
              }}
            >
              <div
                className={`absolute top-2 left-2 w-6 h-6 rounded-full ${getBadgeColor(
                  therapist.gender
                )} flex items-center justify-center shadow-md`}
              >
                <span className="text-[10px] font-bold text-white">
                  {bookingCount}
                </span>
              </div>
              {/* Therapist Name */}
              <div className="text-xs font-semibold text-gray-900 truncate px-8 max-w-full text-center">
                {therapist.alias}
              </div>

              {/* Gender Label */}
              <div className="text-[10px] font-medium text-gray-600 mt-0.5">
                {genderLabel}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default React.memo(CalendarHeader);
