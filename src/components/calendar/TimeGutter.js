import React, { useMemo } from 'react';
import useVirtualGrid from '../../hooks/useVirtualGrid';
import { getTimeFromSlotIndex, SLOT_HEIGHT, TOTAL_SLOTS } from '../../utils/timeUtils';

/**
 * TimeGutter — Left sidebar with time labels (09:00, 09:15, ..., 23:00)
 * Sticky position, virtualized to show only visible time slots
 */
function TimeGutter({ containerRef }) {
  const virtualGrid = useVirtualGrid({
    totalColumns: 1,
    totalRows: TOTAL_SLOTS,
    columnWidth: 60,
    rowHeight: SLOT_HEIGHT,
    overscanRows: 2,
    containerRef,
  });

  const timeLabels = useMemo(() => {
    const labels = [];
    for (let i = virtualGrid.visibleRowRange.start; i < virtualGrid.visibleRowRange.end; i++) {
      const time = getTimeFromSlotIndex(i);
      const [hours, minutes] = time.split(':').map(Number);
      const isHour = minutes === 0;
      let label = '';
      if (isHour) {
        const period = hours >= 12 ? 'PM' : 'AM';
        const h = hours % 12 || 12;
        label = `${h} ${period}`;
      } else {
        label = `:${String(minutes).padStart(2, '0')}`;
      }
      labels.push({ index: i, label, isHour });
    }
    return labels;
  }, [virtualGrid.visibleRowRange]);

  return (
    <div
      className="sticky left-0 z-30 bg-white border-r border-gray-300 flex flex-col flex-shrink-0"
      style={{
        width: '60px',
        height: `${virtualGrid.totalHeight}px`,
        top: 0,
      }}
    >
      <div
        style={{
          transform: `translateY(${virtualGrid.offsetTop}px)`,
          height: `${
            (virtualGrid.visibleRowRange.end - virtualGrid.visibleRowRange.start) *
            SLOT_HEIGHT
          }px`,
        }}
      >
        {timeLabels.map(({ index, label, isHour }) => (
          <div
            key={`time-${index}`}
            className="flex items-start justify-end pr-2 pt-0.5 border-b border-gray-100"
            style={{ height: `${SLOT_HEIGHT}px` }}
          >
            {isHour ? (
              <span className="text-[11px] font-bold text-gray-700 leading-none">{label}</span>
            ) : (
              <span className="text-[9px] text-gray-400 leading-none">{label}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default React.memo(TimeGutter);
