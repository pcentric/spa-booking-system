import React from 'react';
import { useUI } from '../../hooks/useUI';

/**
 * Modal Component — displays success/error/info messages
 * Used for booking Create/Update/Delete operations
 */
const Modal = () => {
  const { isModalOpen, modalType, modalData, closeModal } = useUI();

  if (!isModalOpen || !modalType) {
    return null;
  }

  const { title, message, buttonText = 'OK' } = modalData || {};

  const getIconColor = () => {
    if (modalType === 'success') return 'text-green-600';
    if (modalType === 'error') return 'text-red-600';
    return 'text-blue-600';
  };

  const getButtonColor = () => {
    if (modalType === 'success') return 'bg-green-600 hover:bg-green-700';
    if (modalType === 'error') return 'bg-red-600 hover:bg-red-700';
    return 'bg-blue-600 hover:bg-blue-700';
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center"
        onClick={closeModal}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <div className="bg-white rounded-lg shadow-2xl max-w-sm w-full mx-4 pointer-events-auto">
          {/* Icon */}
          <div className="flex justify-center pt-8">
            <div className={`text-5xl ${getIconColor()}`}>
              {modalType === 'success' && '✓'}
              {modalType === 'error' && '✕'}
              {modalType === 'info' && 'ℹ'}
            </div>
          </div>

          {/* Title */}
          {title && (
            <h2 className="text-center text-lg font-semibold text-gray-900 mt-6 px-6">
              {title}
            </h2>
          )}

          {/* Message */}
          {message && (
            <p className="text-center text-gray-600 text-sm mt-3 px-6 pb-6">
              {message}
            </p>
          )}

          {/* Button */}
          <div className="flex gap-3 p-6 border-t border-gray-200">
            <button
              onClick={closeModal}
              className={`flex-1 py-2 px-4 rounded font-medium text-white transition-colors ${getButtonColor()}`}
            >
              {buttonText}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Modal;
