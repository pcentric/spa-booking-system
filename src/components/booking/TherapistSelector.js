import React, { useState, useEffect } from 'react';
import { useMasterData } from '../../hooks/useMasterData';
import { useDebounce } from '../../hooks/useDebounce';
import logger from '../../utils/logger';

const TherapistSelector = ({ serviceId, serviceAt, value, onChange, label = 'Therapist', error: validationError }) => {
  const { getAvailableTherapists } = useMasterData();
  const [therapists, setTherapists] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Debounce serviceAt to avoid too many API calls
  const debouncedServiceAt = useDebounce(serviceAt, 300);

  useEffect(() => {
    if (!serviceId || !debouncedServiceAt) {
      setTherapists([]);
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
        logger.debug('TherapistSelector', 'Therapists loaded', {
          count: availableTherapists?.length,
        });
      } catch (err) {
        logger.error('TherapistSelector', 'Failed to load therapists', err);
        setError('Failed to load therapists');
        setTherapists([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTherapists();
  }, [serviceId, debouncedServiceAt, getAvailableTherapists]);

  const handleChange = (e) => {
    const therapistId = parseInt(e.target.value) || '';
    onChange(therapistId);
    logger.debug('TherapistSelector', 'Therapist selected', { therapistId });
  };

  const getGenderColor = (gender) => {
    if (gender?.toLowerCase() === 'female') return 'bg-pink-100 text-pink-700';
    if (gender?.toLowerCase() === 'male') return 'bg-blue-100 text-blue-700';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="w-full">
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

      <select
        value={value}
        onChange={handleChange}
        disabled={isLoading || therapists.length === 0}
        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors ${
          validationError ? 'border-red-500' : 'border-gray-300'
        }`}
      >
        <option value="">Select a therapist</option>
        {therapists.map(therapist => (
          <option key={therapist.id} value={therapist.id}>
            {therapist.alias} ({therapist.gender || 'Unknown'})
          </option>
        ))}
      </select>

      {validationError && <p className="text-red-600 text-sm mt-1">{validationError}</p>}

      {therapists.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {therapists.slice(0, 3).map(therapist => (
            <span
              key={therapist.id}
              className={`inline-block px-2 py-1 text-xs font-semibold rounded ${getGenderColor(
                therapist.gender
              )}`}
            >
              {therapist.gender === 'Female' ? '♀' : '♂'} {therapist.name}
            </span>
          ))}
          {therapists.length > 3 && (
            <span className="inline-block px-2 py-1 text-xs font-semibold text-gray-600">
              +{therapists.length - 3} more
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default TherapistSelector;
