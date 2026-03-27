import React, { useEffect, useRef, useState } from 'react';
import { useUI } from '../../hooks/useUI';
import { useBookings } from '../../hooks/useBookings';
import logger from '../../utils/logger';
import BookingDetail from './BookingDetail';
import BookingForm from './BookingForm';
import { getBookingDetail, getUserDetails } from '../../services/bookingService';

const BookingPanel = ({ onClose }) => {
  const formRef = useRef(null);
  const { isPanelOpen, panelMode, panelBookingId, closePanel } = useUI();
  const { selectedBooking } = useBookings();
  const [fetchedBooking, setFetchedBooking] = useState(null);
  const [isLoadingBooking, setIsLoadingBooking] = useState(false);

  // Fetch booking details when detail or edit panel opens
  useEffect(() => {
    if ((panelMode === 'detail' || panelMode === 'edit') && panelBookingId) {
      setIsLoadingBooking(true);
      setFetchedBooking(null);
      getBookingDetail(panelBookingId)
        .then(async (booking) => {
          logger.debug('BookingPanel', 'Booking fetched successfully', { id: panelBookingId });
          let customerData = null;
          let customerId = booking?.customer_id;

          // If no customer_id, try to parse content field
          if (!customerId && booking?.content && typeof booking.content === 'string') {
            try {
              const contentData = JSON.parse(booking.content);
              customerId = contentData.customer;
            } catch (e) {
              logger.warn('BookingPanel', 'Error parsing content JSON', { error: e.message });
            }
          }

          // Fetch user details if we have a customer ID
          if (customerId) {
            customerData = await getUserDetails(customerId);
          }

          // Merge customer data with booking
          const enhancedBooking = customerData ? {
            ...booking,
            customer_name: customerData.name || booking.customer_name,
            customer_email: customerData.email || booking.customer_email,
            customer_phone: customerData.contact_number || booking.customer_phone,
            customer_lastname: customerData.lastname || '',
            customer_passport: customerData.passport_number || '',
            customer_nationality: customerData.nationality || '',
            customer_dob: customerData.dob || '',
            customer_gender: customerData.gender || '',
            customer_membership: customerData.membership || booking.membership,
          } : booking;

          setFetchedBooking(enhancedBooking);
        })
        .catch((error) => {
          logger.error('BookingPanel', 'Failed to fetch booking details', error);
          // Fallback to selectedBooking from context if fetch fails
          setFetchedBooking(selectedBooking || null);
        })
        .finally(() => {
          setIsLoadingBooking(false);
        });
        
    } else {
      setFetchedBooking(null);
    }
  }, [panelMode, panelBookingId, selectedBooking]);

  // Log panel state changes
  useEffect(() => {
    if (isPanelOpen) {
      logger.debug('BookingPanel', 'Panel opened', { mode: panelMode, bookingId: panelBookingId });
    }
  }, [isPanelOpen, panelMode, panelBookingId]);

  const handleClose = () => {
    closePanel();
    if (onClose) onClose();
  };

  const handleFormSuccess = () => {
    closePanel();
    if (onClose) onClose();
  };

  // Don't render if panel is closed
  if (!isPanelOpen) {
    return null;
  }

  return (
    <>
      {/* Overlay backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-30 transition-opacity duration-300"
        onClick={handleClose}
      />

      {/* Panel drawer */}
      <div
        className="fixed right-0 top-0 h-screen w-96 bg-white shadow-2xl transition-transform duration-300 ease-in-out z-40 flex flex-col"
        style={{
          boxShadow: 'rgba(16, 24, 40, 0.2) -4px 0px 12px -2px',
        }}
      >
      {/* Panel Header */}
      <div className="flex items-center justify-between h-20 px-6 bg-gray-50 border-b border-gray-200 mt-16 flex-shrink-0">
        <div className="flex items-center gap-3 flex-1">
          <button
            onClick={handleClose}
            className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors text-gray-700"
            aria-label="Back"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-base font-medium text-gray-900">
            {panelMode === 'detail' && 'Appointment'}
            {panelMode === 'create' && 'New Booking'}
            {panelMode === 'edit' && 'Edit Booking'}
          </h2>
        </div>

        {/* Action buttons in header */}
        <div className="flex items-center gap-2">
          {panelMode === 'detail' && (
            <>
              <button
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-600"
                title="Edit booking"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-600"
                title="More options"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                </svg>
              </button>
            </>
          )}
          <button
            className="px-3 py-1 text-sm font-medium text-brand-orange hover:text-brand transition-colors"
            onClick={handleClose}
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-auto px-5 py-4">
        {panelMode === 'detail' && (
          <>
            {isLoadingBooking ? (
              <p className="text-gray-500 text-center py-8">Loading booking details...</p>
            ) : fetchedBooking ? (
              <BookingDetail booking={fetchedBooking} />
            ) : (
              <p className="text-gray-500 text-center py-8">Select a booking to view details</p>
            )}
          </>
        )}
        {(panelMode === 'create' || panelMode === 'edit') && (
          <>
            {isLoadingBooking ? (
              <p className="text-gray-500 text-center py-8">Loading booking details...</p>
            ) : (
              <BookingForm
                ref={formRef}
                booking={panelMode === 'edit' ? fetchedBooking : selectedBooking}
                onSuccess={handleFormSuccess}
              />
            )}
          </>
        )}
      </div>

      {/* Footer CTA Button */}
      <div className="px-5 py-4 border-t border-gray-200 bg-white">
        <button
          onClick={() => {
            if (panelMode === 'create' || panelMode === 'edit') {
              formRef.current?.requestSubmit();
            } else {
              handleClose();
            }
          }}
          className="w-full py-3 bg-brand text-white font-semibold text-base rounded hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {panelMode === 'detail' ? 'Close' : panelMode === 'create' ? 'Create Booking' : 'Update Booking'}
        </button>
      </div>
    </div>
    </>
  );
};

// Memoize BookingPanel to prevent unnecessary re-renders
// Only re-render if isPanelOpen, panelMode, panelBookingId, or selectedBooking changes
export default React.memo(BookingPanel, (prevProps, nextProps) => {
  // Return true if props are equal (no re-render), false if different (re-render)
  return prevProps.onClose === nextProps.onClose;
});
