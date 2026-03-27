import React, { useState } from 'react';
import { useUI } from '../../hooks/useUI.js';
import { useMasterData } from '../../hooks/useMasterData.js';
import Input from '../common/Input.js';
import Select from '../common/Select.js';

const TopBar = () => {
  const { selectedDate, setSelectedDate } = useUI();
  const [dateInput, setDateInput] = useState(selectedDate);

  const handleDateChange = (e) => {
    const date = e.target.value;
    setDateInput(date);
    setSelectedDate(date);
  };

  return (
    <div className="flex items-center justify-between px-6 py-4 gap-4">
      {/* Left Section - Date Picker */}
      <div className="flex-1 max-w-xs">
        <Input
          type="date"
          value={dateInput}
          onChange={handleDateChange}
          className="text-sm"
        />
      </div>

      <div className="flex-1" />

      {/* Right Section - User Info */}
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg">
        <span className="text-sm font-medium text-gray-700">User</span>
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
          U
        </div>
      </div>
    </div>
  );
};

export default TopBar;
