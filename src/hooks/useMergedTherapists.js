import { useMemo } from 'react';
import useMasterData from './useMasterData';
import useBookings from './useBookings';
import logger from '../utils/logger';

/**
 * Merge therapists from two sources:
 * 1. API therapist list (has full info: name, gender, alias, etc.)
 * 2. Booking payloads (has therapist_id, may reference therapists not in API)
 *
 * Returns: Array of therapists with normalized IDs, sorted by id
 * This ensures therapists with bookings always appear in grid, even if not in API response
 */
export function useMergedTherapists() {
  const { therapists: apiTherapists } = useMasterData();
  const { bookings } = useBookings();

  const mergedTherapists = useMemo(() => {
    // Create a map keyed by therapist_id to deduplicate
    const therapistMap = new Map();

    // Step 1: Add all therapists from API
    if (Array.isArray(apiTherapists)) {
      apiTherapists.forEach(therapist => {
        const id = Number(therapist.id);
        if (!isNaN(id)) {
          therapistMap.set(id, {
            id,
            name: therapist.name || therapist.alias || `Therapist ${id}`,
            alias: therapist.alias,
            gender: therapist.gender,
            ...therapist,
          });
        }
      });
    }

    // Step 2: Extract therapist_ids from bookings and fill in missing names
    // This ensures therapists with bookings always have names
    if (bookings && bookings.size > 0) {
      console.log('🔍 Processing bookings for missing therapists:', {
        totalBookings: bookings.size,
        alreadyInMap: Array.from(therapistMap.keys()),
      });

      let addedCount = 0;
      bookings.forEach(booking => {
        const therapistId = Number(booking.therapist_id);
        if (!isNaN(therapistId)) {
          const existing = therapistMap.get(therapistId);

          if (!existing) {
            // Add new therapist from booking (was missing from API)
            therapistMap.set(therapistId, {
              id: therapistId,
              name: booking.therapist_name || `Therapist ${therapistId}`,
              alias: null,
              gender: null,
            });
            addedCount++;

            console.log('✅ Added missing therapist from booking:', {
              therapistId,
              therapistName: booking.therapist_name,
            });

            logger.debug(
              'useMergedTherapists',
              'Added therapist from booking',
              { therapistId, therapistName: booking.therapist_name }
            );
          } else if (!existing.name || existing.name === '') {
            // Update therapist name from booking if API had empty name
            existing.name = booking.therapist_name || `Therapist ${therapistId}`;
            console.log('✅ Updated therapist name from booking:', {
              therapistId,
              name: existing.name,
            });
          }
        }
      });

      console.log('📊 Booking therapists updated:', addedCount);
    }

    // Step 3: Convert to sorted array (by id) for stable rendering
    let sorted = Array.from(therapistMap.values()).sort((a, b) => a.id - b.id);

    // Step 4: Filter to only therapists with bookings (avoid rendering 146 empty therapists)
    if (bookings && bookings.size > 0) {
      const bookingTherapistIds = new Set();
      bookings.forEach(b => {
        const tid = Number(b.therapist_id);
        if (!isNaN(tid)) bookingTherapistIds.add(tid);
      });

      // Keep only therapists that have bookings
      sorted = sorted.filter(t => bookingTherapistIds.has(t.id));

      console.log('🎯 Filtered to therapists with bookings:', {
        originalCount: Array.from(therapistMap.values()).length,
        filteredCount: sorted.length,
        therapistIds: sorted.map(t => t.id),
      });
    }

    logger.debug('useMergedTherapists', 'Merged therapists', {
      apiCount: apiTherapists?.length || 0,
      mergedCount: sorted.length,
      bookingCount: bookings?.size || 0,
      therapistIds: sorted.map(t => t.id),
      therapistNames: sorted.map(t => t.name),
    });

    return sorted;
  }, [apiTherapists, bookings]);

  return mergedTherapists;
}

export default useMergedTherapists;
