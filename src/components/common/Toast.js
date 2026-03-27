import React from 'react';

const Toast = ({ message, type = 'info', onClose, autoClose = true, duration = 3000 }) => {
  React.useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [autoClose, duration, onClose]);

  const typeClasses = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-blue-600',
    warning: 'bg-yellow-600',
  };

  return (
    <div className={`${typeClasses[type]} text-white px-4 py-3 rounded-lg shadow-lg animate-fade-in`}>
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
};

export default Toast;
