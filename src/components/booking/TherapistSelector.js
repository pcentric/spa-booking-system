import React, { useState, useEffect, useRef } from 'react';
import { useMasterData } from '../../hooks/useMasterData';
import { useDebounce } from '../../hooks/useDebounce';
import logger from '../../utils/logger';

const TherapistSelector = ({ serviceId, serviceAt, value, onChange, label = 'Therapist', error: validationError }) => {
  const { getAvailableTherapists } = useMasterData();
  const [therapists, setTherapists] = useState([]);
  const [filteredTherapists, setFilteredTherapists] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef(null);

  // Debounce serviceAt to avoid too many API calls
  const debouncedServiceAt = useDebounce(serviceAt, 300);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  // Fetch therapists when service/date changes
  useEffect(() => {
    if (!serviceId || !debouncedServiceAt) {
      setTherapists([]);
      setFilteredTherapists([]);
      return;
    }

    const fetchTherapists = async () => {
      setIsLoading(true);
      setError(null);
      try {
        logger.debug('TherapistSelector', 'Fetching available therapists', {
          serviceId,
          serviceAt: debouncedServiceAt,
        });
        const availableTherapists = await getAvailableTherapists(serviceId, debouncedServiceAt);
        setTherapists(availableTherapists || []);
        setFilteredTherapists(availableTherapists || []);
        logger.debug('TherapistSelector', 'Therapists loaded', {
          count: availableTherapists?.length,
        });
      } catch (err) {
        logger.error('TherapistSelector', 'Failed to load therapists', err);
        setError('Failed to load therapists');
        setTherapists([]);
        setFilteredTherapists([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTherapists();
  }, [serviceId, debouncedServiceAt, getAvailableTherapists]);

  // Filter therapists based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredTherapists(therapists);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = therapists.filter(therapist => {
      const name = (therapist.name || '').toLowerCase();
      const alias = (therapist.alias || '').toLowerCase();
      const gender = (therapist.gender || '').toLowerCase();
      return name.includes(query) || alias.includes(query) || gender.includes(query);
    });

    setFilteredTherapists(filtered);
  }, [searchQuery, therapists]);

  const handleSelectTherapist = (therapistId) => {
    onChange(therapistId);
    setShowDropdown(false);
    setSearchQuery('');
    logger.debug('TherapistSelector', 'Therapist selected', { therapistId });
  };

  const getSelectedTherapistName = () => {
    if (!value) return 'Select a therapist';
    const therapist = therapists.find(t => t.id === value);
    if (!therapist) return 'Select a therapist';
    return `${therapist.alias || therapist.name} (${therapist.gender || 'Unknown'})`;
  };

  return (
    <div className="w-full relative" ref={containerRef}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        <span className="text-red-600 ml-1">*</span>
      </label>

      {isLoading && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
          <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
          <span className="text-sm text-blue-600">Loading therapists...</span>
        </div>
      )}

      {error && (
        <p className="text-red-600 text-sm mb-2">{error}</p>
      )}

      {!isLoading && therapists.length > 0 && (
        <div>
          {/* Search/Display Button */}
          <button
            type="button"
            onClick={() => setShowDropdown(!showDropdown)}
            className={`w-full px-3 py-2 border rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors flex justify-between items-center ${
              validationError ? 'border-red-500' : 'border-gray-300'
            } ${value ? 'bg-white text-gray-900' : 'bg-white text-gray-500'}`}
          >
            <span className="text-sm">{getSelectedTherapistName()}</span>
            <svg
              className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {showDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-80 overflow-hidden flex flex-col">
              {/* Search Input */}
              <div className="sticky top-0 bg-white border-b border-gray-200 p-2 flex-shrink-0">
                <input
                  type="text"
                  placeholder="Search therapist..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              {/* Therapist List */}
              <div className="overflow-y-auto flex-1">
                {filteredTherapists.length > 0 ? (
                  filteredTherapists.map(therapist => (
                    <button
                      key={therapist.id}
                      type="button"
                      onClick={() => handleSelectTherapist(therapist.id)}
                      className={`w-full px-3 py-2 text-left border-b border-gray-100 hover:bg-blue-50 transition-colors ${
                        value === therapist.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {therapist.alias || therapist.name}
                          </div>
                          <div className="text-xs text-gray-500">{therapist.gender || 'Unknown'}</div>
                        </div>
                        {value === therapist.id && (
                          <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-4 text-center text-sm text-gray-500">
                    No therapists match "{searchQuery}"
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {!isLoading && therapists.length === 0 && (
        <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 text-sm">
          No therapists available
        </div>
      )}

      {validationError && <p className="text-red-600 text-sm mt-1">{validationError}</p>}
    </div>
  );
};

export default TherapistSelector;
