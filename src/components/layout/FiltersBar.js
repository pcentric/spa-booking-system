import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useUI } from '../../hooks/useUI.js';
import useBookings from '../../hooks/useBookings';
import FilterModal from '../common/FilterModal';

// Highlights matched substring in orange — used in search results
const HighlightMatch = ({ text, query }) => {
  if (!query || !text) return <span>{text}</span>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <span>{text}</span>;
  return (
    <span>
      {text.slice(0, idx)}
      <span style={{ color: '#c8531a', fontWeight: 700 }}>{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </span>
  );
};

// Status badge colours — mirrors the booking card palette
const STATUS_STYLES = {
  confirmed:          'bg-blue-100 text-blue-700',
  unconfirmed:        'bg-yellow-100 text-yellow-700',
  'checked in':       'bg-green-100 text-green-700',
  completed:          'bg-gray-100 text-gray-600',
  cancelled:          'bg-red-100 text-red-600',
  'no show':          'bg-orange-100 text-orange-700',
  holding:            'bg-purple-100 text-purple-700',
  'in progress':      'bg-teal-100 text-teal-700',
};

const statusStyle = (status = '') =>
  STATUS_STYLES[(status || '').toLowerCase()] || 'bg-gray-100 text-gray-500';

const FiltersBar = ({ filters = {}, onFiltersChange }) => {
  const { selectedDate, setSelectedDate, triggerRefresh, openPanel } = useUI();
  const { bookings } = useBookings();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const dateInputRef = useRef(null);

  // Unique customers for pre-search dropdown (A-Z, deduplicated by name+phone)
  const uniqueCustomers = useMemo(() => {
    const seen = new Set();
    const list = [];
    for (const booking of bookings.values()) {
      const key = `${(booking.customer_name || '').toLowerCase()}|${booking.customer_phone || ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        list.push({ name: booking.customer_name || '', phone: booking.customer_phone || '', bookingId: booking.id });
      }
    }
    list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [bookings]);

  // Search bookings by customer name or phone (debounced 300 ms)
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = setTimeout(() => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) {
        setSearchResults([]);
        return;
      }

      const results = [];
      for (const booking of bookings.values()) {
        const name  = (booking.customer_name  || '').toLowerCase();
        const phone = (booking.customer_phone || '').toLowerCase();
        if (name.includes(q) || phone.includes(q)) {
          results.push(booking);
          if (results.length >= 25) break; // cap results for performance
        }
      }
      setSearchResults(results);
    }, 300);

    return () => clearTimeout(searchTimeoutRef.current);
  }, [searchQuery, bookings]);

  const handleSelectBooking = (booking) => {
    setShowSearchResults(false);
    setSearchQuery('');
    openPanel('detail', booking.id);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
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
    triggerRefresh(); // force re-fetch even if date hasn't changed
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
      (filters.therapistGroup && filters.therapistGroup !== 'All' && filters.therapistGroup !== 'All Therapist') ||
      (filters.selectedTherapists && filters.selectedTherapists.length > 0) ||
      (filters.rooms && filters.rooms.length > 0) ||
      (filters.bookingStatus && Object.values(filters.bookingStatus).some(val => !val))
    );
  };

  return (
    <>
      <div className="bg-white border-b border-gray-200 px-3 md:px-6 py-2 md:py-0 md:h-20 flex flex-wrap md:flex-nowrap items-center gap-2 md:gap-4">
        {/* Left: Outlet Info — desktop only */}
        <div className="hidden md:flex flex-col gap-0.5 min-w-fit">
          <div className="text-sm font-bold text-gray-900 cursor-pointer hover:text-brand leading-tight">
            Liat Towers ▾
          </div>
          <div className="text-xs font-semibold text-gray-600 cursor-pointer hover:text-brand leading-tight">
            Display: 15 Min ▾
          </div>
        </div>

        {/* Center: Customer booking search — full-width on mobile, constrained on desktop */}
        <div className="w-full md:flex-1 md:max-w-md order-last md:order-none relative" ref={searchRef}>
          <div className="relative flex items-center">
            <svg
              className="absolute left-3 text-gray-400 pointer-events-none"
              width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Search customer by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowSearchResults(true)}
              onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
              className="w-full pl-9 pr-9 py-2 text-sm bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 text-gray-400 hover:text-gray-600 transition-colors"
                title="Clear search"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>

          {/* Dropdown: pre-search customer list OR search results */}
          {showSearchResults && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-[420px] overflow-y-auto">

              {/* ── PRE-SEARCH: show all unique customers ── */}
              {!searchQuery.trim() && (
                <>
                  <div className="sticky top-0 bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Customers</p>
                  </div>
                  {uniqueCustomers.length > 0 ? (
                    uniqueCustomers.map((customer, idx) => (
                      <div
                        key={`customer-${idx}`}
                        className="px-4 py-2.5 border-b border-gray-100 last:border-0 hover:bg-orange-50 cursor-pointer transition-colors"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSearchQuery(customer.name);
                        }}
                      >
                        <p className="text-sm font-bold text-gray-900 leading-tight">{customer.name}</p>
                        {customer.phone && (
                          <p className="text-xs text-gray-400 mt-0.5">{customer.phone}</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-6 text-center">
                      <p className="text-sm text-gray-400">No customers loaded yet</p>
                    </div>
                  )}
                </>
              )}

              {/* ── SEARCH RESULTS ── */}
              {searchQuery.trim() && (
                <>
                  {/* Header */}
                  <div className="sticky top-0 bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                    <p className="text-xs font-semibold text-gray-600">
                      {searchResults.length > 0
                        ? `${searchResults.length} booking${searchResults.length !== 1 ? 's' : ''} found`
                        : 'No bookings found'}
                    </p>
                    {searchResults.length === 25 && (
                      <p className="text-xs text-gray-400">Showing first 25 — refine your search</p>
                    )}
                  </div>

                  {searchResults.length > 0 ? (
                    searchResults.map((booking, idx) => {
                      const isFirst = idx === 0;
                      return (
                        <div
                          key={`booking-result-${booking.id}`}
                          className="px-4 py-3 border-b border-gray-100 last:border-0 cursor-pointer transition-colors"
                          onMouseEnter={(e) => { if (!isFirst) e.currentTarget.style.backgroundColor = '#fff7f0'; }}
                          onMouseLeave={(e) => { if (!isFirst) e.currentTarget.style.backgroundColor = ''; }}
                          onClick={() => handleSelectBooking(booking)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            {/* Left: customer + booking info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-semibold truncate ${ 'text-gray-900'}`}>
                                  <HighlightMatch text={booking.customer_name || 'Unknown'} query={searchQuery} />
                                </span>
                                {booking.customer_phone && (
                                  <span className={`text-xs flex-shrink-0 ${'text-gray-500'}`}>
                                    <HighlightMatch text={booking.customer_phone} query={searchQuery} />
                                  </span>
                                )}
                              </div>
                              <div className={`text-xs mt-0.5 flex items-center gap-1.5 flex-wrap ${'text-gray-500'}`}>
                                {booking.service_name && (
                                  <span className={`font-medium truncate max-w-[160px] ${'text-gray-700'}`}>
                                    {booking.service_name}
                                  </span>
                                )}
                                {booking.start_time && (
                                  <>
                                    <span className={'text-gray-300'}>·</span>
                                    <span>{booking.start_time}</span>
                                  </>
                                )}
                                {booking.therapist_name && (
                                  <>
                                    <span className={'text-gray-300'}>·</span>
                                    <span className="truncate max-w-[100px]">{booking.therapist_name}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            {/* Right: status badge */}
                            {booking.status && (
                              <span className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${ statusStyle(booking.status)}`}>
                                {booking.status}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="px-4 py-8 text-center">
                      <p className="text-sm text-gray-500">No bookings match <strong>"{searchQuery}"</strong></p>
                      <p className="text-xs text-gray-400 mt-1">Try a different name or phone number</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-1.5 md:gap-2 ml-auto relative flex-shrink-0">

          {/* Filter Button */}
          <button
            onClick={() => setIsFilterModalOpen(true)}
            className={`flex items-center gap-1.5 px-3 md:px-4 py-2 text-sm font-semibold border rounded-md transition-colors relative ${
              isFilterActive()
                ? 'bg-brand-orange text-white border-brand-orange hover:bg-brand-orange/90'
                : 'text-gray-800 border-gray-300 bg-white hover:bg-gray-50'
            }`}
          >
            <span className="hidden sm:inline">Filter</span>
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
              className="px-2 md:px-3 py-2 text-xs md:text-sm font-semibold text-gray-800 hover:bg-gray-50 transition-colors border-r border-gray-300"
            >
              Today
            </button>
            <button
              onClick={handlePreviousDay}
              className="px-1.5 md:px-2 py-2 text-gray-500 hover:bg-gray-50 transition-colors text-lg leading-none"
              title="Previous day"
            >
              ‹
            </button>
            <span className="px-1.5 md:px-3 py-2 text-xs md:text-sm font-semibold text-gray-800 min-w-[80px] md:min-w-[110px] text-center select-none">
              {formatDateDisplay(selectedDate)}
            </span>
            <button
              onClick={handleNextDay}
              className="px-1.5 md:px-2 py-2 text-gray-500 hover:bg-gray-50 transition-colors text-lg leading-none"
              title="Next day"
            >
              ›
            </button>
            <div className="w-px bg-gray-300 h-8 self-center" />
            <button
              type="button"
              onClick={openDatePicker}
              className="px-2 md:px-3 py-2 text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer flex items-center"
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
