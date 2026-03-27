import React, { useEffect, useState, useRef } from 'react';
import { useUI } from '../../hooks/useUI.js';
import { useBookings } from '../../hooks/useBookings.js';
import { getBookingDetail } from '../../services/bookingService.js';
import logger from '../../utils/logger.js';
import BookingDetail from '../booking/BookingDetail.js';
import BookingForm from '../booking/BookingForm.js';

const RightPanel = () => {
  const formRef = useRef(null);
  const { isPanelOpen, panelMode, panelBookingId, closePanel } = useUI();
  const { selectedBooking, deleteBooking, cancelBooking } = useBookings();
  const [fetchedBooking, setFetchedBooking] = useState(null);
  const [isLoadingBooking, setIsLoadingBooking] = useState(false);

  // Fetch booking details when detail or edit panel opens
  useEffect(() => {
    if ((panelMode === 'detail' || panelMode === 'edit') && panelBookingId) {
      setIsLoadingBooking(true);
      setFetchedBooking(null);

      getBookingDetail(panelBookingId)
      .then((booking) => {
        logger.debug('RightPanel', 'Booking fetched successfully', { id: panelBookingId });
    
        setFetchedBooking({
          ...(selectedBooking || {}),
          ...(booking || {}),
          customer_phone:
            booking?.customer_phone ||
            booking?.mobile_number ||
            booking?.contact_number ||
            booking?.user?.contact_number ||
            booking?.user?.mobile_number ||
            selectedBooking?.customer_phone ||
            selectedBooking?.mobile_number ||
            selectedBooking?.contact_number ||
            selectedBooking?.user?.contact_number ||
            selectedBooking?.user?.mobile_number ||
            '',
        });
      })
        .catch((error) => {
          logger.error('RightPanel', 'Failed to fetch booking details', error);
          setFetchedBooking(selectedBooking || null);
        })
        .finally(() => {
          setIsLoadingBooking(false);
        });
    } else {
      setFetchedBooking(null);
    }
  }, [panelMode, panelBookingId, selectedBooking]);

  const getPanelTitle = () => {
    if (panelMode === 'detail') return 'Appointment Details';
    if (panelMode === 'create') return 'New Booking';
    if (panelMode === 'edit') return 'Edit Booking';
    return 'Details';
  };

  const handleFormSuccess = () => {
    logger.debug('RightPanel', 'Booking operation completed successfully');
    closePanel();
  };

  const handleDeleteSuccess = async () => {
    try {
      await deleteBooking(panelBookingId);
      logger.info('RightPanel', 'Booking deleted successfully', { id: panelBookingId });
      closePanel();
    } catch (error) {
      logger.error('RightPanel', 'Failed to delete booking', error);
    }
  };

  const handleCancelSuccess = async () => {
    try {
      await cancelBooking(panelBookingId);
      logger.info('RightPanel', 'Booking cancelled successfully', { id: panelBookingId });
      setFetchedBooking(prev => prev ? { ...prev, status: 'Cancelled' } : null);
    } catch (error) {
      logger.error('RightPanel', 'Failed to cancel booking', error);
    }
  };

  const bookingForEdit = panelMode === 'edit' ? (fetchedBooking || selectedBooking) : null;
  return (
    <div
      className={`fixed right-0 top-16 h-[calc(100%-4rem)] w-96 bg-white border-l border-gray-200 shadow-lg transition-transform duration-300 ease-in-out z-40 ${
        isPanelOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-900">
          {getPanelTitle()}
        </h2>
        <button
          onClick={closePanel}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Close panel"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Panel Content */}
      <div className="overflow-auto h-[calc(100%-5rem)] px-6 py-4">
        {panelMode === 'detail' ? (
          <>
            {isLoadingBooking ? (
              <p className="text-gray-500 text-center py-8">Loading booking details...</p>
            ) : fetchedBooking ? (
              <BookingDetail booking={fetchedBooking} onClose={closePanel} />
            ) : (
              <p className="text-gray-500 text-center py-8">Select a booking to view details</p>
            )}
          </>
        ) : (panelMode === 'create' || panelMode === 'edit') ? (
          <>
            {isLoadingBooking && panelMode === 'edit' ? (
              <p className="text-gray-500 text-center py-8">Loading booking details...</p>
            ) : (
              <BookingForm
                ref={formRef}
                booking={bookingForEdit}
                onSuccess={handleFormSuccess}
              />
            )}
          </>
        ) : (
          <p className="text-gray-500 text-center py-8">Select an item to view details</p>
        )}
      </div>

      {/* Footer CTA Button */}
      {(panelMode === 'create' || panelMode === 'edit') && (
        <div className="px-6 py-4 border-t border-gray-200 bg-white">
          <button
            onClick={() => {
              if (panelMode === 'create' || panelMode === 'edit') {
                formRef.current?.requestSubmit();
              }
            }}
            className="w-full py-3 bg-brand text-white font-semibold text-base rounded hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {panelMode === 'create' ? 'Create Booking' : 'Update Booking'}
          </button>
        </div>
      )}
    </div>
  );
};

export default RightPanel;
