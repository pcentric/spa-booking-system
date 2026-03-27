import React, { useEffect, useState } from 'react';
import logger from '../../utils/logger';

/**
 * CancelDeleteModal — Modal dialog for choosing between Cancel or Delete booking
 * Shows options:
 * 1. Normal Cancellation (marks as cancelled)
 * 2. Just Delete It (removes booking entirely)
 */
const CancelDeleteModal = ({ isOpen, bookingId, bookingStatus, onCancel, onConfirm, isLoading }) => {
  const normalizedStatus = String(bookingStatus || '').trim().toLowerCase();
const isCancelled =
  normalizedStatus === 'cancelled' || normalizedStatus === 'canceled';

const [selectedOption, setSelectedOption] = useState(
  isCancelled ? 'delete' : 'cancel'
);
  const [step, setStep] = useState(1); // Step 1: choose option, Step 2: confirm

  const handleNext = () => {
    logger.debug('CancelDeleteModal', 'Next clicked', { selectedOption });
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleConfirm = () => {
    logger.debug('CancelDeleteModal', 'Confirming', { selectedOption, bookingId });
    onConfirm(selectedOption === 'delete');
  };

  const handleCancel = () => {
    setStep(1);
    setSelectedOption(isCancelled ? 'delete' : 'cancel');
    onCancel();
  };

  useEffect(() => {
    if (isCancelled) {
      setStep(2);
      setSelectedOption('delete');
    }
  }, [isCancelled]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Modal Header */}
        <div className="border-b border-gray-200 px-6 py-4">
        <h2 className="text-lg font-bold text-gray-900">
  {step === 1
    ? isCancelled
      ? 'Delete Booking'
      : 'Cancel / Delete Booking'
    : 'Confirm Action'}
</h2>
        </div>

        {/* Modal Body */}
        <div className="px-6 py-4">
          {step === 1 ? (
            <>
              <p className="text-sm text-gray-600 mb-4">Please select the cancellation type.</p>

              {/* Option 1: Normal Cancellation */}
{!isCancelled && (
  <div className="mb-4">
    <label className="flex items-start cursor-pointer">
      <input
        type="radio"
        name="cancellation"
        value="cancel"
        checked={selectedOption === 'cancel'}
        onChange={(e) => setSelectedOption(e.target.value)}
        className="mt-1"
      />
      <span className="ml-3">
        <span className="text-sm font-medium text-gray-900">Normal Cancellation</span>
        <p className="text-xs text-gray-500 mt-1">
          Booking will be marked as cancelled and kept in history
        </p>
      </span>
    </label>
  </div>
)}

              {/* Option 2: Just Delete It */}
              <div className="mb-4">
                <label className="flex items-start cursor-pointer">
                  <input
                    type="radio"
                    name="cancellation"
                    value="delete"
                    checked={selectedOption === 'delete'}
                    onChange={(e) => setSelectedOption(e.target.value)}
                    className="mt-1"
                  />
                  <span className="ml-3">
                    <span className="text-sm font-medium text-gray-900">Just Delete It</span>
                    <p className="text-xs text-gray-500 mt-1">
                      Bookings with a deposit cannot be deleted. Please cancel instead to retain a proper record.
                    </p>
                  </span>
                </label>
              </div>
            </>
          ) : (
            <>
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                <p className="text-sm text-yellow-700">
                  {selectedOption === 'delete'
                    ? '⚠️ This will permanently delete the booking from the system.'
                    : '✓ This will mark the booking as cancelled and keep it in history.'}
                </p>
              </div>
              <p className="text-sm text-gray-600">
                {selectedOption === 'delete'
                  ? 'Are you sure you want to delete this booking? This action cannot be undone.'
                  : 'Are you sure you want to cancel this booking?'}
              </p>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex gap-3 justify-end">
          <button
            onClick={handleCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>

          {step === 1 ? (
            <button
              onClick={handleNext}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              Next
            </button>
          ) : (
            <>
              <button
                onClick={handleBack}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Back
              </button>
              <button
                onClick={handleConfirm}
                disabled={isLoading}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 ${
                  selectedOption === 'delete'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isLoading ? 'Processing...' : selectedOption === 'delete' ? 'Delete' : 'Cancel Booking'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CancelDeleteModal;
