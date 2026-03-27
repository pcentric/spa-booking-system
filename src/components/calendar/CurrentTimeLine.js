import React, { useState, useEffect } from 'react';
import { getTopPosition, minutesFromDayStart } from '../../utils/timeUtils';
import logger from '../../utils/logger';

/**
 * CurrentTimeLine — Red horizontal line showing current time
 * Positioned absolutely
 * Top = (minutesFromDayStart(now) / 15) * 40px
 * Updates every minute via useEffect
 */
function CurrentTimeLine({ totalWidth }) {
  const [topPosition, setTopPosition] = useState(0);

  useEffect(() => {
    const updatePosition = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const timeStr = `${hours}:${minutes}`;

      try {
        const position = getTopPosition(timeStr);
        setTopPosition(position);
        logger.debug('CurrentTimeLine', 'Updated position', { timeStr, position });
      } catch (error) {
        logger.warn('CurrentTimeLine', 'Error calculating position', { error: error.message });
      }
    };

    // Initial update
    updatePosition();

    // Update every minute
    const interval = setInterval(updatePosition, 60000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="absolute left-0 right-0 border-t-2 border-red-500 z-10 pointer-events-none"
      style={{
        top: `${topPosition}px`,
        width: `${totalWidth}px`,
      }}
    >
      <div className="absolute -left-1 -top-2 w-4 h-4 rounded-full bg-red-500 shadow-md ring-2 ring-white" />
    </div>
  );
}

export default React.memo(CurrentTimeLine);
