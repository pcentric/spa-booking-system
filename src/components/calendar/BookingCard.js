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
          {/*
            Height tiers:
            < 50px  (15 min)  → single line: service · customer
            50–79px (30 min)  → service + customer, NO icons
            80–119px (45 min) → service + customer + icons
            120px+  (60 min+) → all fields: service + phone + customer + icons
          */}
          {height < 50 ? (
            /* ── TINY: 15 min ── */
            <div
              className="px-1.5 h-full flex items-center overflow-hidden"
              style={{ textDecoration: isCancelled ? 'line-through' : 'none' }}
            >
              <span className="font-semibold truncate text-[10px] leading-none">
                {booking.service_name || 'Service'}
              </span>
              {booking.customer_name && (
                <span className="ml-1 font-bold truncate text-[9px] leading-none opacity-80 flex-shrink-0">
                  · {booking.customer_name}
                </span>
              )}
            </div>
          ) : height < 80 ? (
            /* ── SHORT: 30 min — service + customer, no icons ── */
            <div
              className="px-1.5 py-1 h-full flex flex-col justify-between overflow-hidden"
              style={{ textDecoration: isCancelled ? 'line-through' : 'none' }}
            >
              <div className="font-semibold truncate text-[11px] leading-tight">
                {booking.service_name || 'Service'}
              </div>
              <div className="font-bold truncate text-[10px] leading-tight">
                {booking.customer_name || 'Customer'}
              </div>
            </div>
          ) : (
            /* ── NORMAL: 45 min+ — full layout ── */
            <div
              className="p-1.5 h-full flex flex-col overflow-hidden text-xs"
              style={{ textDecoration: isCancelled ? 'line-through' : 'none' }}
            >
              {/* Service Name */}
              <div className="font-semibold truncate leading-tight text-[11px]">
                {booking.service_name || 'Service'}
              </div>

              {/* Service Description — 120px+ only */}
              {booking.service_description && height >= 120 && (
                <div className="truncate text-[9px] opacity-60 mt-0.5">
                  {booking.service_description}
                </div>
              )}

              {/* Phone Number — 120px+ only */}
              {height >= 120 && booking.customer_phone && (
                <div className="truncate text-[10px] text-gray-600 mt-0.5">
                  {booking.customer_phone}
                </div>
              )}

              {/* Customer Name */}
              <div className="font-bold truncate text-[10px] mt-0.5">
                {booking.customer_name || 'Customer'}
              </div>

              {/* Icon Badges — pushed to bottom */}
              <div className="flex gap-0.5 flex-wrap mt-auto pt-0.5">
                <span style={{ background: '#367c41' }} className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-white text-[7px] font-bold flex-shrink-0">C</span>
                <span style={{ background: '#aa7a5f' }} className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-white text-[8px] flex-shrink-0">★</span>
                <span style={{ background: '#7a5f3c' }} className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-white text-[7px] font-bold flex-shrink-0">S</span>
                <span style={{ background: '#3b82f6' }} className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-white text-[7px] flex-shrink-0">🌐</span>
                {(booking.description || booking.notes) && (
                  <span className="w-3.5 h-3.5 rounded-full bg-gray-400 flex items-center justify-center text-white text-[7px] flex-shrink-0">📋</span>
                )}
                {booking.room_id && (
                  <span className="w-3.5 h-3.5 rounded-full bg-gray-400 flex items-center justify-center text-white text-[7px] flex-shrink-0">🗂</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}

export default React.memo(BookingCard);
