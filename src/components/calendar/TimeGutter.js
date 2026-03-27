import React, { useMemo } from 'react';
import useVirtualGrid from '../../hooks/useVirtualGrid';
import { getTimeFromSlotIndex, SLOT_HEIGHT, TOTAL_SLOTS } from '../../utils/timeUtils';
import logger from '../../utils/logger';

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

  const formatTimeDisplay = (time) => {
    // Input: "09:00" format, output: "09.00 AM"
    if (!time) return '';
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${String(displayHours).padStart(2, '0')}.${String(minutes).padStart(2, '0')} ${period}`;
  };

  const timeLabels = useMemo(() => {
    const labels = [];
    // Only show every 4th slot (hourly) for header clarity
    for (let i = virtualGrid.visibleRowRange.start; i < virtualGrid.visibleRowRange.end; i++) {
      if (i % 4 === 0) {  // Every 15 mins * 4 = hourly
        labels.push({
          index: i,
          time: getTimeFromSlotIndex(i),
          displayTime: formatTimeDisplay(getTimeFromSlotIndex(i)),
        });
      }
    }
    return labels;
  }, [virtualGrid.visibleRowRange]);

  logger.debug('TimeGutter', 'Rendering time slots', {
    visibleStart: virtualGrid.visibleRowRange.start,
    visibleEnd: virtualGrid.visibleRowRange.end,
    count: timeLabels.length,
  });

  return (
    <div
      className="sticky left-0 z-30 bg-white border-r border-gray-300 flex flex-col flex-shrink-0"
      style={{
        width: '60px',
        height: `${virtualGrid.totalHeight}px`,
        backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${SLOT_HEIGHT - 1}px, #f0f0f0 ${SLOT_HEIGHT - 1}px, #f0f0f0 ${SLOT_HEIGHT}px)`,
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
        {timeLabels.map(({ index, displayTime, time }) => (
          <div
            key={`time-${index}`}
            className="flex flex-col items-center justify-center border-b border-gray-300 bg-white"
            style={{ height: `${SLOT_HEIGHT * 4}px` }}
          >
            <div className="text-xs font-bold text-gray-800">{displayTime}</div>
            <div className="text-[10px] text-gray-500 mt-0.5">23F 25M</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default React.memo(TimeGutter);
