import React, { useState, useEffect } from 'react';
import { useMasterData } from '../../hooks/useMasterData';
import { logger } from '../../utils/logger';

const RoomSelector = ({ value, onChange, date, duration, label = 'Room' }) => {
  const { loadRooms, isLoadingRooms } = useMasterData();
  const [rooms, setRooms] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!date || !duration) {
      setRooms([]);
      return;
    }

    const fetchRooms = async () => {
      setError(null);
      try {
        logger.debug('RoomSelector', 'Loading available rooms', { date, duration });
        const availableRooms = await loadRooms(date, 1, duration);
        setRooms(availableRooms || []);
        logger.debug('RoomSelector', 'Rooms loaded', { count: availableRooms?.length });
      } catch (err) {
        logger.error('RoomSelector', 'Failed to load rooms', err);
        setError('Failed to load rooms');
        setRooms([]);
      }
    };

    fetchRooms();
  }, [date, duration, loadRooms]);

  const handleChange = (e) => {
    const roomId = parseInt(e.target.value) || '';
    onChange(roomId);
    logger.debug('RoomSelector', 'Room selected', { roomId });
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>

      {isLoadingRooms && (
        <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg mb-2">
          <div className="w-3 h-3 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
          <span className="text-xs text-blue-600">Loading rooms...</span>
        </div>
      )}

      {error && (
        <p className="text-red-600 text-sm mb-2">{error}</p>
      )}

      <select
        value={value}
        onChange={handleChange}
        disabled={isLoadingRooms || rooms.length === 0}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
      >
        <option value="">Select a room</option>
        {rooms.map(room => (
          <option key={room.id} value={room.id}>
            {room.name || `Room ${room.id}`}
            {room.code && ` (${room.code})`}
            {room.item_category && ` - ${room.item_category}`}
          </option>
        ))}
      </select>

      {rooms.length === 0 && !isLoadingRooms && date && duration && (
        <p className="text-gray-500 text-xs mt-1">No rooms available for this date and duration</p>
      )}
    </div>
  );
};

export default RoomSelector;
