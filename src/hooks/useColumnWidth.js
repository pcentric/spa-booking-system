import { useState, useEffect, useCallback } from 'react';

/**
 * Returns a responsive calendar column width based on viewport width.
 * Updates on window resize.
 */
function calcColumnWidth(w) {
  if (w < 480) return 110;
  if (w < 768) return 130;
  if (w < 1024) return 155;
  return 180;
}

export function useColumnWidth() {
  const [columnWidth, setColumnWidth] = useState(() => calcColumnWidth(window.innerWidth));

  const handleResize = useCallback(() => {
    setColumnWidth(calcColumnWidth(window.innerWidth));
  }, []);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  return columnWidth;
}
