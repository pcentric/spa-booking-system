import React from 'react';
import { htmlDateToApiDate } from '../../utils/dateUtils';

/**
 * BookingPreview — Shows a summary of the booking before submission
 * Displays customer info, service details, and therapist assignment
 */
const BookingPreview = ({ formData, therapists = [] }) => {
  if (!formData) return null;

  const mainItem = formData.items?.[0];
  if (!mainItem) return null;

  // Find therapist name
  const therapistId = mainItem.therapist_id;
  const therapist = therapists.find(t => Number(t.id) === Number(therapistId));
  const therapistName = therapist?.name || therapist?.alias || 'Not selected';

  const customerInfo = {
    name: formData.customer_name,
    phone: formData.customer_phone,
    email: formData.customer_email,
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0">
          <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 2a1 1 0 011-1h8a1 1 0 011 1v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v6h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1H8v1a1 1 0 11-2 0v-1H4a2 2 0 01-2-2v-2H1a1 1 0 110-2h1V7H1a1 1 0 012-2h2V2zm10 5H5v8h10V7z" clipRule="evenodd" />
          </svg>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Booking Preview</h3>

          {/* Customer Info */}
          <div className="space-y-2 mb-3 pb-3 border-b border-blue-200">
            <div className="flex justify-between items-start">
              <span className="text-xs font-medium text-gray-600">Customer:</span>
              <span className="text-sm font-semibold text-gray-900">{customerInfo.name}</span>
            </div>
            {customerInfo.phone && (
              <div className="flex justify-between items-start">
                <span className="text-xs font-medium text-gray-600">Phone:</span>
                <span className="text-sm text-gray-700">{customerInfo.phone}</span>
              </div>
            )}
          </div>

          {/* Booking Details */}
          <div className="space-y-2 mb-3 pb-3 border-b border-blue-200">
            {formData.service_at && (
              <div className="flex justify-between items-start">
                <span className="text-xs font-medium text-gray-600">Date:</span>
                <span className="text-sm font-semibold text-gray-900">
                  {typeof formData.service_at === 'string'
                    ? new Date(formData.service_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                    : formData.service_at}
                </span>
              </div>
            )}
            {mainItem.start_time && (
              <div className="flex justify-between items-start">
                <span className="text-xs font-medium text-gray-600">Time:</span>
                <span className="text-sm font-semibold text-gray-900">
                  {mainItem.start_time} - {mainItem.end_time || 'N/A'}
                </span>
              </div>
            )}
            {mainItem.duration && (
              <div className="flex justify-between items-start">
                <span className="text-xs font-medium text-gray-600">Duration:</span>
                <span className="text-sm text-gray-700">{mainItem.duration} min</span>
              </div>
            )}
          </div>

          {/* Service & Therapist */}
          <div className="space-y-2">
            <div className="flex justify-between items-start">
              <span className="text-xs font-medium text-gray-600">Therapist:</span>
              <span className="text-sm font-semibold text-gray-900">{therapistName}</span>
            </div>
            {formData.source && (
              <div className="flex justify-between items-start">
                <span className="text-xs font-medium text-gray-600">Source:</span>
                <span className="text-sm text-gray-700">{formData.source}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingPreview;
