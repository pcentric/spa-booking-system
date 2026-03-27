import React from 'react';

/**
 * BookingInProgressCard — Shows when user is creating a booking from grid
 * Displays the selected time and therapist information
 */
const BookingInProgressCard = ({ initialData, therapist }) => {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/70 backdrop-blur-sm rounded-lg border-2 border-orange-500">
      <div className="text-center">
        <div className="inline-block mb-3">
          <div className="w-12 h-12 border-3 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">Booking in Progress</h3>

        {/* Show selected time and therapist */}
        {initialData && (
          <div className="mt-3 space-y-1">
            {initialData.time && (
              <p className="text-sm font-semibold text-gray-800">
                {initialData.time}
                {therapist && ` - ${therapist.alias || therapist.name}`}
              </p>
            )}
            {therapist && therapist.gender && (
              <p className="text-xs text-gray-600">
                ({therapist.gender})
              </p>
            )}
          </div>
        )}

        <p className="text-sm text-gray-600 mt-3">Fill in the details on the right panel</p>
      </div>
    </div>
  );
};

export default BookingInProgressCard;
