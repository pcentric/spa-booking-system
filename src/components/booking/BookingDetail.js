import React, { useState } from 'react';
import { useUI } from '../../hooks/useUI';
import { useBookings } from '../../hooks/useBookings';
import logger from '../../utils/logger';
import { toDisplayDate, toDisplayTime, toDisplayTimeRange } from '../../utils/dateUtils';
import Button from '../common/Button';
import CancelDeleteModal from '../common/CancelDeleteModal';

const BookingDetail = ({ booking, onClose }) => {
  const { openPanel, closePanel, openModal } = useUI();
  const { cancelBooking, deleteBooking } = useBookings();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showModal, setShowModal] = useState(false);

  if (!booking) {
    return <p className="text-gray-500 text-center py-8">No booking selected</p>;
  }

  const handleEdit = () => {
    logger.debug('BookingDetail', 'Edit clicked', { bookingId: booking.id });
    openPanel('edit', booking.id);
  };

  const handleDeleteOrCancel = () => {
    logger.debug('BookingDetail', 'Delete/Cancel clicked', { bookingId: booking.id });
    setShowModal(true);
  };

  const handleModalConfirm = async (isDelete) => {
    setShowModal(false);

    if (isDelete) {
      setIsDeleting(true);
      try {
        logger.info('BookingDetail', 'Deleting booking', { id: booking.id });
        await deleteBooking(booking.id);
        logger.info('BookingDetail', 'Booking deleted successfully', { id: booking.id });

        // Show success modal
        openModal('success', {
          title: 'Booking Deleted',
          message: 'The appointment has been successfully deleted.',
          buttonText: 'OK',
        });

        // Close panel after successful deletion
        setTimeout(() => {
          closePanel();
          if (onClose) onClose();
        }, 2000);
      } catch (error) {
        logger.error('BookingDetail', 'Failed to delete booking', error);
        setIsDeleting(false);

        // Show error modal
        openModal('error', {
          title: 'Delete Failed',
          message: error.message || 'Failed to delete the booking. Please try again.',
          buttonText: 'Try Again',
        });
      }
    } else {
      setIsCancelling(true);
      try {
        logger.info('BookingDetail', 'Cancelling booking', { id: booking.id });
        await cancelBooking(booking.id);
        logger.info('BookingDetail', 'Booking cancelled successfully', { id: booking.id });

        // Show success modal
        openModal('success', {
          title: 'Booking Cancelled',
          message: 'The appointment has been successfully cancelled.',
          buttonText: 'OK',
        });

        setIsCancelling(false);
        // Status update is handled by reducer
      } catch (error) {
        logger.error('BookingDetail', 'Failed to cancel booking', error);
        setIsCancelling(false);

        // Show error modal
        openModal('error', {
          title: 'Cancellation Failed',
          message: error.message || 'Failed to cancel the booking. Please try again.',
          buttonText: 'Try Again',
        });
      }
    }
  };

  const handleModalCancel = () => {
    logger.debug('BookingDetail', 'Modal cancelled');
    setShowModal(false);
  };
  console.log(booking, "fetchedBooking")

  const customerPhone =
  booking.customer_phone ||
  booking.mobile_number ||
  booking.contact_number ||
  booking.user?.contact_number ||
  booking.user?.mobile_number ||
  booking.user?.phone ||
  '';

  const rawStatus =
  booking.status ||
  booking.booking_status ||
  booking.status_name ||
  '';

const normalizedStatus = String(rawStatus).trim().toLowerCase();

const isCancelled =
  normalizedStatus === 'cancelled' ||
  normalizedStatus === 'canceled' ||
  normalizedStatus === 'cancel';

const displayStatus = rawStatus || 'Unknown';

  return (
    <div className="space-y-6 divide-y divide-gray-200">
      {/* Customer Information */}
      <div className="pb-6">
        <h3 className="text-base font-bold text-gray-900 mb-4">Customer</h3>
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Name</p>
            <p className="text-sm font-medium text-gray-900 mt-1">{booking.customer_name}</p>
          </div>
          {booking.customer_email && (
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Email</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{booking.customer_email}</p>
            </div>
          )}
         {customerPhone && (
  <div>
    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Phone</p>
    <p className="text-sm font-medium text-gray-900 mt-1">{customerPhone}</p>
  </div>
)}
        </div>
      </div>

      {/* Booking Details */}
      <div className="pb-6">
        <h3 className="text-base font-bold text-gray-900 mb-4">Booking Information</h3>
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Date</p>
            <p className="text-sm font-medium text-gray-900 mt-1">{toDisplayDate(booking.date)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Time</p>
            <p className="text-sm font-medium text-gray-900 mt-1">
              {toDisplayTimeRange(booking.start_time, booking.end_time, booking.duration)}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Duration</p>
            <p className="text-sm font-medium text-gray-900 mt-1">{booking.duration} minutes</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Status</p>
            <p className={`text-sm font-medium mt-1 ${
              booking.status === 'Cancelled' ? 'text-red-600' : 'text-green-600'
            }`}>
              {booking.status}
            </p>
          </div>
        </div>
      </div>

      {/* Service Information */}
      <div className="pb-6">
        <h3 className="text-base font-bold text-gray-900 mb-4">Service Details</h3>
        <div className="space-y-3">
          {booking.service_name && (
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Service</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{booking.service_name}</p>
            </div>
          )}
          {booking.therapist_name && (
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Therapist</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{booking.therapist_name}</p>
            </div>
          )}
          {booking.room_name && (
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Room</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{booking.room_name}</p>
            </div>
          )}
        </div>
      </div>

      {/* Additional Information */}
      {(booking.source || booking.payment_status || booking.notes) && (
        <div className="pb-6">
          <h3 className="text-base font-bold text-gray-900 mb-4">Additional Information</h3>
          <div className="space-y-3 text-sm">
            {booking.source && (
              <div>
                <p className="text-gray-600">Source</p>
                <p className="font-medium text-gray-900">{booking.source}</p>
              </div>
            )}
            {booking.payment_status && (
              <div>
                <p className="text-gray-600">Payment Status</p>
                <p className="font-medium text-gray-900">{booking.payment_status}</p>
              </div>
            )}
            {booking.notes && (
              <div>
                <p className="text-gray-600">Notes</p>
                <p className="font-medium text-gray-900 break-words">{booking.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2 pt-4">
        <button
          onClick={handleEdit}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
          disabled={isDeleting || isCancelling}
        >
          Edit Booking
        </button>
        {!isCancelled ? (
  <button
    onClick={handleDeleteOrCancel}
    className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    disabled={isDeleting || isCancelling}
  >
    {isDeleting || isCancelling ? 'Processing...' : 'Cancel / Delete'}
  </button>
) : (
  <button
    onClick={handleDeleteOrCancel}
    className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    disabled={isDeleting}
  >
    {isDeleting ? 'Deleting...' : 'Delete Booking'}
  </button>
)}
      </div>

    {/* Cancel/Delete Modal */}
<CancelDeleteModal
  isOpen={showModal}
  bookingId={booking.id}
  bookingStatus={booking.status}
  onCancel={handleModalCancel}
  onConfirm={handleModalConfirm}
  isLoading={isDeleting || isCancelling}
/>
    </div>
  );
};

export default BookingDetail;
