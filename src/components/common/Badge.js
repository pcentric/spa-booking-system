import React from 'react';

const Badge = ({ status, className = '' }) => {
  const statusClasses = {
    Confirmed: 'bg-blue-100 text-blue-800 border border-blue-300',
    'Check-in': 'bg-pink-100 text-pink-800 border border-pink-300',
    Cancelled: 'bg-gray-100 text-gray-800 border border-gray-300',
  };

  const classes = statusClasses[status] || 'bg-gray-100 text-gray-800 border border-gray-300';

  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${classes} ${className}`}>
      {status}
    </span>
  );
};

export default Badge;
