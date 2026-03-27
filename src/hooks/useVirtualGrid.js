// Virtual grid hook — 2D virtualization for calendar
// Calculates visible columns and rows based on scroll position
import { useState, useCallback, useRef, useEffect } from 'react';

export function useVirtualGrid({
  totalColumns = 200,
  totalRows = 60, // 9 AM to 12 AM (midnight) in 15-min slots
  columnWidth = 180,
  rowHeight = 40,
  overscanColumns = 3,
  overscanRows = 5,
  containerRef = null,
}) {
  const [visibleColumnRange, setVisibleColumnRange] = useState({
    start: 0,
    end: Math.min(10 + overscanColumns, totalColumns),
  });

  const [visibleRowRange, setVisibleRowRange] = useState({
    start: 0,
    end: Math.min(15 + overscanRows, totalRows),
  });

  const scrollState = useRef({ scrollLeft: 0, scrollTop: 0 });
  const rafRef = useRef(null);

  const updateVirtualization = useCallback(() => {
    if (!containerRef?.current) return;

    const { scrollLeft, scrollTop } = containerRef.current;
    scrollState.current = { scrollLeft, scrollTop };

    // Calculate visible column range
    const colStart = Math.max(0, Math.floor(scrollLeft / columnWidth) - overscanColumns);
    const colEnd = Math.min(
      totalColumns,
      Math.ceil((scrollLeft + containerRef.current.clientWidth) / columnWidth) + overscanColumns
    );

    // Calculate visible row range
    const rowStart = Math.max(0, Math.floor(scrollTop / rowHeight) - overscanRows);
    const rowEnd = Math.min(
      totalRows,
      Math.ceil((scrollTop + containerRef.current.clientHeight) / rowHeight) + overscanRows
    );

    setVisibleColumnRange({ start: colStart, end: colEnd });
    setVisibleRowRange({ start: rowStart, end: rowEnd });
  }, [containerRef, columnWidth, rowHeight, overscanColumns, overscanRows, totalColumns, totalRows]);

  const handleScroll = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      updateVirtualization();
    });
  }, [updateVirtualization]);

  useEffect(() => {
    updateVirtualization(); // Initial calculation
  }, [updateVirtualization]);

  useEffect(() => {
    const container = containerRef?.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      return () => {
        container.removeEventListener('scroll', handleScroll);
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
        }
      };
    }
  }, [containerRef, handleScroll]);

  const totalWidth = totalColumns * columnWidth;
  const totalHeight = totalRows * rowHeight;
  const offsetLeft = visibleColumnRange.start * columnWidth;
  const offsetTop = visibleRowRange.start * rowHeight;

  const visibleColumns = [];
  for (let i = visibleColumnRange.start; i < visibleColumnRange.end; i++) {
    visibleColumns.push(i);
  }

  const visibleRows = [];
  for (let i = visibleRowRange.start; i < visibleRowRange.end; i++) {
    visibleRows.push(i);
  }

  return {
    visibleColumnRange,
    visibleRowRange,
    visibleColumns,
    visibleRows,
    totalWidth,
    totalHeight,
    offsetLeft,
    offsetTop,
    columnWidth,
    rowHeight,
    onScroll: handleScroll,
  };
}

export default useVirtualGrid;
