import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useUI } from '../../hooks/useUI.js';
import useMergedTherapists from '../../hooks/useMergedTherapists';
import FilterModal from '../common/FilterModal';

const FiltersBar = ({ filters = {}, onFiltersChange }) => {
  const { selectedDate, setSelectedDate } = useUI();
  const therapists = useMergedTherapists();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredResults, setFilteredResults] = useState([]);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const dateInputRef = useRef(null);

  // Filter therapists based on search query
  const filterTherapists = useCallback((query) => {
    if (!therapists || therapists.length === 0) {
      setFilteredResults([]);
      return;
    }

    if (!query.trim()) {
      setFilteredResults(therapists);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const filtered = therapists.filter(therapist => {
      const name = (therapist.name || therapist.alias || '').toLowerCase();
      const alias = (therapist.alias || '').toLowerCase();
      return name.includes(lowerQuery) || alias.includes(lowerQuery);
    });

    setFilteredResults(filtered);
  }, [therapists]);

  // Initial load of therapists on mount
  useEffect(() => {
    if (therapists && therapists.length > 0) {
      setFilteredResults(therapists);
    }
  }, [therapists]);

  // Handle search query changes
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      filterTherapists(searchQuery);
    }, 200);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, filterTherapists]);

  const handleSelectTherapist = (therapist) => {
    setSearchQuery(therapist.alias || therapist.name || '');
    setShowSearchResults(false);

    // Add therapist to selectedTherapists array in filters
    const selectedTherapists = filters.selectedTherapists || [];
    const isAlreadySelected = selectedTherapists.includes(therapist.id);

    let updatedTherapists;
    if (isAlreadySelected) {
      updatedTherapists = selectedTherapists.filter(id => id !== therapist.id);
    } else {
      updatedTherapists = [...selectedTherapists, therapist.id];
    }

    const updatedFilters = {
      ...filters,
      selectedTherapists: updatedTherapists,
    };

    if (onFiltersChange) {
      onFiltersChange(updatedFilters);
    }
  };

  const handleDateChange = (e) => {
    const date = e.target.value;
    setSelectedDate(date);
  };
  const openDatePicker = () => {
    if (!dateInputRef.current) return;
  
    if (typeof dateInputRef.current.showPicker === 'function') {
      dateInputRef.current.showPicker();
    } else {
      dateInputRef.current.focus();
      dateInputRef.current.click();
    }
  };
  const getDateString = (date) => {
    // Convert Date object to YYYY-MM-DD string
    if (!date) return '';
    if (typeof date === 'string') {
      return date;
    }
    if (date instanceof Date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return '';
  };

  const handleTodayClick = () => {
    setSelectedDate(new Date());
  };

  const handlePreviousDay = () => {
    const d = selectedDate instanceof Date ? new Date(selectedDate) : new Date();
    d.setDate(d.getDate() - 1);
    setSelectedDate(d);
  };

  const handleNextDay = () => {
    const d = selectedDate instanceof Date ? new Date(selectedDate) : new Date();
    d.setDate(d.getDate() + 1);
    setSelectedDate(d);
  };

  const formatDateDisplay = (date) => {
    if (!date) return 'Select date';
    let d = date;
    if (typeof date === 'string') {
      const [year, month, day] = date.split('-');
      d = new Date(year, parseInt(month) - 1, parseInt(day));
    }
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    return d.toLocaleDateString('en-US', options);
  };

  const handleApplyFilters = (appliedFilters) => {
    if (onFiltersChange) {
      onFiltersChange(appliedFilters);
    }
    setIsFilterModalOpen(false);
  };

  // Check if any filters are active
  const isFilterActive = () => {
    if (!filters) return false;
    return (
      filters.therapistGroup !== 'All' ||
      (filters.selectedTherapists && filters.selectedTherapists.length > 0) ||
      (filters.rooms && filters.rooms.length > 0) ||
      (filters.bookingStatus && Object.values(filters.bookingStatus).some(val => !val))
    );
  };

  return (
    <>
      <div className="h-20 bg-white border-b border-gray-200 px-6 flex items-center gap-4">
        {/* Left: Outlet Info */}
        <div className="flex flex-col gap-0.5 min-w-fit">
          <div className="text-sm font-bold text-gray-900 cursor-pointer hover:text-brand leading-tight">
            Liat Towers ▾
          </div>
          <div className="text-xs font-semibold text-gray-600 cursor-pointer hover:text-brand leading-tight">
            Display: 15 Min ▾
          </div>
        </div>

        {/* Center: Search with Dropdown */}
        <div className="flex-1 max-w-md relative" ref={searchRef}>
          <div className="relative flex items-center">
            <span className="absolute left-3 text-gray-400 pointer-events-none text-sm">🔍</span>
            <input
              type="text"
              placeholder="Search Sales by phone/name"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowSearchResults(true)}
              onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
              className="w-full pl-9 pr-9 py-2 text-sm bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  const clearedFilters = { ...filters };
                  delete clearedFilters.selectedTherapists;
                  if (onFiltersChange) onFiltersChange(clearedFilters);
                }}
                className="absolute right-3 text-gray-400 hover:text-gray-600 transition-colors text-xs"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          {showSearchResults && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-50 max-h-96 overflow-y-auto">
              {(!therapists || therapists.length === 0) && (
                <div className="px-4 py-6 text-center">
                  <p className="text-sm text-gray-500">Loading therapists...</p>
                </div>
              )}
              {therapists && filteredResults.length > 0 && (
                <>
                  <div className="sticky top-0 bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <p className="text-xs font-semibold text-gray-700">
                      {searchQuery.trim() ? `Found ${filteredResults.length} therapist${filteredResults.length !== 1 ? 's' : ''}` : `All Therapists (${filteredResults.length})`}
                    </p>
                  </div>
                  {filteredResults.map((therapist, idx) => {
                    const isSelected = (filters.selectedTherapists || []).includes(therapist.id);
                    return (
                      <div
                        key={`therapist-${therapist.id || idx}`}
                        className={`px-4 py-3 border-b border-gray-100 hover:bg-orange-50 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : ''}`}
                        onClick={() => handleSelectTherapist(therapist)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="text-sm font-bold text-gray-900">
                              {therapist.alias || therapist.name || 'Unknown Therapist'}
                            </div>
                            <div className="text-xs text-gray-600 mt-0.5">
                              {therapist.gender && `(${therapist.gender})`}
                            </div>
                          </div>
                          {isSelected && <div className="ml-2 text-blue-600 font-bold">✓</div>}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
              {therapists && filteredResults.length === 0 && searchQuery.trim() && (
                <div className="px-4 py-6 text-center">
                  <p className="text-sm text-gray-500">No therapists match "{searchQuery}"</p>
                  <p className="text-xs text-gray-400 mt-2">Try searching by therapist name</p>
                </div>
              )}
              {therapists && filteredResults.length === 0 && !searchQuery.trim() && (
                <div className="px-4 py-6 text-center">
                  <p className="text-sm text-gray-500">No therapists available</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-2 ml-auto relative">

          {/* Filter Button */}
          <button
            onClick={() => setIsFilterModalOpen(true)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold border rounded-md transition-colors relative ${
              isFilterActive()
                ? 'bg-brand-orange text-white border-brand-orange hover:bg-brand-orange/90'
                : 'text-gray-800 border-gray-300 bg-white hover:bg-gray-50'
            }`}
          >
            Filter
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="14" y2="12"/><line x1="4" y1="18" x2="8" y2="18"/>
            </svg>
            {isFilterActive() && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white border-2 border-brand-orange rounded-full"></span>
            )}
          </button>

          {/* Today + Date Nav + Calendar — grouped */}
          <div className="flex items-center border border-gray-300 rounded-md overflow-visible bg-white relative">
            <button
              onClick={handleTodayClick}
              className="px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 transition-colors border-r border-gray-300"
            >
              Today
            </button>
            <button
              onClick={handlePreviousDay}
              className="px-2 py-2 text-gray-500 hover:bg-gray-50 transition-colors text-lg leading-none"
              title="Previous day"
            >
              ‹
            </button>
            <span className="px-3 py-2 text-sm font-semibold text-gray-800 min-w-[110px] text-center select-none">
              {formatDateDisplay(selectedDate)}
            </span>
            <button
              onClick={handleNextDay}
              className="px-2 py-2 text-gray-500 hover:bg-gray-50 transition-colors text-lg leading-none"
              title="Next day"
            >
              ›
            </button>
            <div className="w-px bg-gray-300 h-8 self-center" />
            <button
  type="button"
  onClick={openDatePicker}
  className="px-3 py-2 text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer flex items-center"
  title="Open calendar"
>
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
</button>
          </div>

          {/* Date input - styled as hidden but clickable via label */}
          <input
  id="date-picker"
  ref={dateInputRef}
  type="date"
  value={getDateString(selectedDate)}
  onChange={handleDateChange}
  className="absolute opacity-0 pointer-events-none w-0 h-0"
/>
        </div>
      </div>

      {/* Filter Modal */}
      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        onApplyFilters={handleApplyFilters}
        appliedFilters={filters}
      />
    </>
  );
};

export default FiltersBar;
