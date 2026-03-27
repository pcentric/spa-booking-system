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

  const getDateString = (date) => {
    // Convert Date object to YYYY-MM-DD string
    if (!date) return '';
    let d = date;
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
      <div className="h-20 bg-white border-b border-gray-200 px-10 py-4 flex items-center justify-between gap-6">
        {/* Left: Outlet Info */}
        <div className="flex flex-col gap-1">
          <div className="text-sm font-medium text-gray-900 cursor-pointer hover:text-brand">
            Liat Towers ▾
          </div>
          <div className="text-xs font-semibold text-gray-900 cursor-pointer hover:text-brand">
            Display: 15 Min ▾
          </div>
        </div>

        {/* Right: Filters & Controls */}
        <div className="flex-1 flex items-center gap-4 ml-12">
          {/* Search with Dropdown */}
          <div className="flex-1 max-w-xs relative" ref={searchRef}>
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="Search Sales by phone/name"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                }}
                onFocus={() => {
                  setShowSearchResults(true);
                }}
                onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
                className="w-full px-4 py-2 pr-10 text-sm bg-gray-100 border border-gray-300 rounded text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    const clearedFilters = { ...filters };
                    delete clearedFilters.selectedTherapists;
                    if (onFiltersChange) {
                      onFiltersChange(clearedFilters);
                    }
                  }}
                  className="absolute right-3 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Search Results Dropdown */}
            {showSearchResults && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-50 max-h-96 overflow-y-auto">
                {!therapists || therapists.length === 0 && (
                  <div className="px-4 py-6 text-center">
                    <p className="text-sm text-gray-500">Loading therapists...</p>
                  </div>
                )}

                {therapists && filteredResults.length > 0 && (
                  <>
                    {/* Results Header */}
                    <div className="sticky top-0 bg-gray-50 px-4 py-2 border-b border-gray-200">
                      <p className="text-xs font-semibold text-gray-700">
                        {searchQuery.trim() ? `Found ${filteredResults.length} therapist${filteredResults.length !== 1 ? 's' : ''}` : `All Therapists (${filteredResults.length})`}
                      </p>
                    </div>

                    {/* Therapist List */}
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
                            {isSelected && (
                              <div className="ml-2 text-blue-600 font-bold">✓</div>
                            )}
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

          {/* Date Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePreviousDay}
              className="p-2 hover:bg-gray-100 rounded transition-colors"
              title="Previous day"
            >
              ‹
            </button>
            <div className="text-sm font-semibold text-gray-900 min-w-[120px] text-center">
              {formatDateDisplay(selectedDate)}
            </div>
            <button
              onClick={handleNextDay}
              className="p-2 hover:bg-gray-100 rounded transition-colors"
              title="Next day"
            >
              ›
            </button>
          </div>

          {/* Calendar Icon - Hidden input reference */}
          <input
            ref={dateInputRef}
            type="date"
            value={getDateString(selectedDate)}
            onChange={handleDateChange}
            className="hidden"
          />

          <button
            onClick={() => dateInputRef.current?.click()}
            className="p-2 hover:bg-gray-100 rounded transition-colors text-gray-600"
            title="Open calendar"
          >
            📅
          </button>

          {/* Today Button */}
          <button
            onClick={handleTodayClick}
            className="text-sm font-semibold text-gray-900 hover:text-brand transition-colors"
          >
            Today
          </button>

          {/* Filter Button */}
          <button
            onClick={() => setIsFilterModalOpen(true)}
            className={`px-4 py-2 text-sm font-semibold rounded transition-colors relative ${
              isFilterActive()
                ? 'bg-brand-orange text-white border border-brand-orange hover:bg-brand-orange/90'
                : 'text-brand-orange border border-brand-orange hover:bg-brand-orange/10'
            }`}
          >
            ⚙ Filter
            {isFilterActive() && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-white rounded-full"></span>
            )}
          </button>
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
