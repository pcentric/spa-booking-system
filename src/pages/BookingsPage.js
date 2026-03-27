import React from 'react';
import { logger } from '../utils/logger.js';

const BookingsPage = () => {
  React.useEffect(() => {
    logger.info('BookingsPage: Mounted');
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Bookings</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600">Bookings list will be rendered here</p>
      </div>
    </div>
  );
};

export default BookingsPage;
