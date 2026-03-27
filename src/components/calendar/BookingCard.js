import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { getTopPosition, getHeightFromDuration } from '../../utils/timeUtils';
import { useUI } from '../../hooks/useUI';

/**
 * BookingCard — Single booking block with Figma design
 * Draggable from @hello-pangea/dnd
 * Shows: Service name, Phone, Bold Client Name, Icon badges at bottom
 * Pastel colors by status
 * Selected state: purple dashed border
 * Cancelled: strikethrough text, grey bg
 */
function BookingCard({ booking, therapistIndex, bookingIndexInTherapist, onBookingClick }) {
  const { panelBookingId } = useUI();
  const isSelected = panelBookingId === booking.id;

  const getStatusColor = () => {
    if (!booking.status) return { bg: '#f3e0e4', text: '#123c22' };
    const status = String(booking.status).toLowerCase();
    // Pastel colors by status (from Figma design)
    if (status === 'confirmed') return { bg: '#f3e0e4', text: '#123c22' };
    if (status === 'check-in' || status === 'checkin') return { bg: '#b0d9e9', text: '#123c22' };
    if (status === 'completed') return { bg: '#ced4d8', text: '#123c22' };
    if (status === 'in-progress' || status === 'inprogress') return { bg: '#f6ece0', text: '#123c22' };
    if (status === 'cancelled') return { bg: '#e8e8e8', text: '#767676' };
    return { bg: '#f3e0e4', text: '#123c22' };
  };

  const isCancelled = (booking.status || '').toLowerCase() === 'cancelled';
  const topPosition = getTopPosition(booking.start_time || '09:00');
  const height = getHeightFromDuration(booking.duration || 15);
  const colors = getStatusColor();

  const handleClick = () => {
    if (onBookingClick) {
      onBookingClick(booking.id);
    }
  };

  return (
    <Draggable draggableId={`booking-${booking.id}`} index={bookingIndexInTherapist || 0}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`absolute left-0 right-0 mx-1 rounded-md cursor-move overflow-hidden transition-all duration-200 ${
            isSelected
              ? 'border-2 border-dashed border-purple-500 shadow-lg'
              : 'border border-gray-300 shadow-sm hover:shadow-md'
          }`}
          style={{
            top: `${topPosition}px`,
            height: `${height}px`,
            minHeight: '32px',
            backgroundColor: colors.bg,
            color: colors.text,
            opacity: snapshot.isDragging ? 0.6 : 1,
            ...provided.draggableProps.style,
          }}
          onClick={handleClick}
        >
          <div className="p-2 h-full flex flex-col justify-between overflow-hidden text-xs" style={{ textDecoration: isCancelled ? 'line-through' : 'none' }}>
            {/* Service Name */}
            <div className="font-medium truncate leading-snug text-[12px]">
              {booking.service_name || 'Service'}
            </div>

            {/* Phone Number */}
            <div className="font-normal truncate leading-tight text-[11px] text-gray-700 mt-0.5">
              {booking.customer_phone || ''}
            </div>

            {/* Customer Name (bold) */}
            <div className="font-bold truncate leading-snug text-[11px]">
              {booking.customer_name || 'Customer'}
            </div>

            {/* Icon Badges Row */}
            <div className="flex gap-0.5 flex-wrap mt-auto pt-1">
              {/* C icon - green */}
              <span
                style={{ background: '#367c41' }}
                className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0"
              >
                C
              </span>

              {/* ★ icon - tan */}
              <span
                style={{ background: '#aa7a5f' }}
                className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] flex-shrink-0"
              >
                ★
              </span>

              {/* S icon - brown */}
              <span
                style={{ background: '#7a5f3c' }}
                className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0"
              >
                S
              </span>

              {/* 🌐 icon - blue */}
              <span
                style={{ background: '#3b82f6' }}
                className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] flex-shrink-0"
              >
                🌐
              </span>

              {/* Notes icon - only if booking has notes */}
              {booking.notes && (
                <span className="w-4 h-4 rounded-full bg-gray-400 flex items-center justify-center text-white text-[8px] flex-shrink-0">
                  📋
                </span>
              )}

              {/* Room icon - only if room assigned */}
              {booking.room_id && (
                <span className="w-4 h-4 rounded-full bg-gray-400 flex items-center justify-center text-white text-[8px] flex-shrink-0">
                  🗂
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}

export default React.memo(BookingCard);
