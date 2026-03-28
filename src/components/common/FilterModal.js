import React, { useState } from 'react';
import { useMasterData } from '../../hooks/useMasterData';
import logger from '../../utils/logger';

/**
 * FilterModal — Advanced filtering for bookings
 * Allows filtering by:
 * - Therapist (gender)
 * - Rooms/Resources
 * - Booking Status
 * - Specific Therapists
 */
const FilterModal = ({ isOpen, onClose, onApplyFilters, appliedFilters = {} }) => {
  const { therapists } = useMasterData();

  // Filter state
  const [filters, setFilters] = useState({
    therapistGroup: appliedFilters.therapistGroup || 'All Therapist', // All Therapist, Male, Female
    rooms: appliedFilters.rooms || [],
    bookingStatus: appliedFilters.bookingStatus || {
      confirmed: true,
      unconfirmed: true,
      checkedIn: true,
      completed: true,
      cancelled: false,
      noShow: false,
      holding: true,
      checkInProgress: true,
    },
    selectedTherapists: appliedFilters.selectedTherapists || [],
    searchTherapist: '',
  });

  const rooms = [
    { id: 1, name: 'Sofa' },
    { id: 2, name: 'Monkey Chair' },
    { id: 3, name: '806 Couples Room' },
  ];

  const handleTherapistGroupChange = (group) => {
    setFilters(prev => ({ ...prev, therapistGroup: group }));
  };

  const handleStatusToggle = (status) => {
    setFilters(prev => ({
      ...prev,
      bookingStatus: {
        ...prev.bookingStatus,
        [status]: !prev.bookingStatus[status],
      },
    }));
  };

  const handleRoomToggle = (roomId) => {
    setFilters(prev => ({
      ...prev,
      rooms: prev.rooms.includes(roomId)
        ? prev.rooms.filter(id => id !== roomId)
        : [...prev.rooms, roomId],
    }));
  };

  const handleTherapistToggle = (therapistId) => {
    setFilters(prev => ({
      ...prev,
      selectedTherapists: prev.selectedTherapists.includes(therapistId)
        ? prev.selectedTherapists.filter(id => id !== therapistId)
        : [...prev.selectedTherapists, therapistId],
    }));
  };

  const handleSelectAllTherapists = () => {
    const allTherapistIds = therapists.map(t => t.id);
    const allSelected = filters.selectedTherapists.length === allTherapistIds.length;

    setFilters(prev => ({
      ...prev,
      selectedTherapists: allSelected ? [] : allTherapistIds,
    }));
  };

  const handleApply = () => {
    logger.debug('FilterModal', 'Filters applied', filters);
    onApplyFilters(filters);
    onClose();
  };

  const handleClearFilters = () => {
    logger.debug('FilterModal', 'Filters cleared');
    setFilters({
      therapistGroup: 'All',
      rooms: [],
      bookingStatus: {
        confirmed: true,
        unconfirmed: true,
        checkedIn: true,
        completed: true,
        cancelled: false,
        noShow: false,
        holding: true,
        checkInProgress: true,
      },
      selectedTherapists: [],
      searchTherapist: '',
    });
    onApplyFilters({});
    onClose();
  };

  const filteredTherapists = therapists.filter(t => {
    const lowerQuery = filters.searchTherapist.toLowerCase();
    if (!lowerQuery) return true;
    const name = (t.name || '').toLowerCase();
    const alias = (t.alias || '').toLowerCase();
    return name.startsWith(lowerQuery) || alias.startsWith(lowerQuery);
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Filter</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Show by Group */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3">Show by group (Person who is on duty)</h3>
            <div className="space-y-2">
              {['All Therapist', 'Male', 'Female'].map(group => (
                <label key={group} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="therapistGroup"
                    value={group}
                    checked={filters.therapistGroup === group}
                    onChange={() => handleTherapistGroupChange(group)}
                    className="w-4 h-4"
                  />
                  <span className={group === 'All Therapist' ? 'font-medium text-gray-900' : 'text-gray-600'}>
                    {group}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Resources/Rooms */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3">Resources</h3>
            <div className="space-y-2">
              {rooms.map(room => (
                <label key={room.id} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.rooms.includes(room.id)}
                    onChange={() => handleRoomToggle(room.id)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-gray-600">{room.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Booking Status */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3">Booking Status</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'confirmed', label: 'Confirmed' },
                { key: 'unconfirmed', label: 'Unconfirmed' },
                { key: 'checkedIn', label: 'Checked In' },
                { key: 'completed', label: 'Completed' },
                { key: 'cancelled', label: 'Cancelled' },
                { key: 'noShow', label: 'No Show' },
                { key: 'holding', label: 'Holding' },
                { key: 'checkInProgress', label: 'Check-in (In Progress)' },
              ].map(status => (
                <label key={status.key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.bookingStatus[status.key]}
                    onChange={() => handleStatusToggle(status.key)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm text-gray-600">{status.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Select Therapist */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900">Select Therapist</h3>
              <button
                onClick={handleSelectAllTherapists}
                className="text-xs font-semibold text-gray-900 hover:text-brand"
              >
                {filters.selectedTherapists.length === therapists.length ? 'Deselect All' : 'Select All'} ✓
              </button>
            </div>

            <input
              type="text"
              placeholder="Search by therapist"
              value={filters.searchTherapist}
              onChange={(e) => setFilters(prev => ({ ...prev, searchTherapist: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded mb-3 focus:outline-none focus:ring-2 focus:ring-brand"
            />

            <div className="max-h-40 overflow-y-auto space-y-2">
              {filteredTherapists.map(therapist => (
                <label key={therapist.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.selectedTherapists.includes(therapist.id)}
                    onChange={() => handleTherapistToggle(therapist.id)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm text-gray-600">
                    {therapist.alias} {therapist.gender && `(${therapist.gender})`}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 space-y-3">
          <button
            onClick={handleClearFilters}
            className="w-full px-4 py-2 text-brand-orange font-semibold text-sm hover:bg-orange-50 rounded transition-colors"
          >
            Clear Filter (Return to Default)
          </button>
          <button
            onClick={handleApply}
            className="w-full px-4 py-2 bg-brand text-white font-semibold text-sm rounded hover:bg-brand/90 transition-colors"
          >
            Apply Filter
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilterModal;
