import { useState, useMemo } from 'react';

export function useFilterState(bookings = [], therapists = []) {
  const [filters, setFilters] = useState({
    searchQuery: '',
    therapistGroup: 'All Therapist', // All Therapist, Male, Female
    selectedTherapists: new Set(), // Track selected therapist IDs
    resources: new Set(), // Rooms, Sofa, Monkey Chair
    bookingStatus: {
      Confirmed: true,
      Unconfirmed: true,
      'Checked In': true,
      Completed: true,
      Cancelled: false,
      'No Show': false,
      Holding: true,
      'Check-in (In Progress)': true,
    },
  });

  // Apply filters to bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      // Search filter
      const customerName = booking?.customer_name || '';
      const customerPhone = booking?.mobile_number || '';
      const searchLower = filters.searchQuery.toLowerCase();

      const matchesSearch =
        customerName.toLowerCase().includes(searchLower) ||
        customerPhone.includes(searchLower);

      if (!matchesSearch) return false;

      // Therapist group filter
      if (filters.therapistGroup !== 'All Therapist') {
        const therapist = therapists.find((t) => t.id === booking?.therapist_id);
        const therapistGender = therapist?.gender?.toLowerCase();

        if (filters.therapistGroup === 'Male' && therapistGender !== 'male') {
          return false;
        }
        if (filters.therapistGroup === 'Female' && therapistGender !== 'female') {
          return false;
        }
      }

      // Selected therapists filter
      if (filters.selectedTherapists.size > 0) {
        if (!filters.selectedTherapists.has(booking?.therapist_id)) {
          return false;
        }
      }

      // Booking status filter
      const status = booking?.status || '';
      if (!filters.bookingStatus[status]) {
        return false;
      }

      return true;
    });
  }, [bookings, filters, therapists]);

  // Filtered therapists based on group selection
  const filteredTherapists = useMemo(() => {
    if (filters.therapistGroup === 'All Therapist') return therapists;

    return therapists.filter((t) => {
      const gender = t.gender?.toLowerCase();
      if (filters.therapistGroup === 'Male') return gender === 'male';
      if (filters.therapistGroup === 'Female') return gender === 'female';
      return true;
    });
  }, [therapists, filters.therapistGroup]);

  const updateSearchQuery = (query) => {
    setFilters((prev) => ({
      ...prev,
      searchQuery: query,
    }));
  };

  const updateTherapistGroup = (group) => {
    setFilters((prev) => ({
      ...prev,
      therapistGroup: group,
      selectedTherapists: new Set(), // Reset selected when changing group
    }));
  };

  const toggleTherapist = (therapistId) => {
    setFilters((prev) => {
      const updated = new Set(prev.selectedTherapists);
      if (updated.has(therapistId)) {
        updated.delete(therapistId);
      } else {
        updated.add(therapistId);
      }
      return {
        ...prev,
        selectedTherapists: updated,
      };
    });
  };

  const selectAllTherapists = () => {
    setFilters((prev) => ({
      ...prev,
      selectedTherapists: new Set(filteredTherapists.map((t) => t.id)),
    }));
  };

  const toggleBookingStatus = (status) => {
    setFilters((prev) => ({
      ...prev,
      bookingStatus: {
        ...prev.bookingStatus,
        [status]: !prev.bookingStatus[status],
      },
    }));
  };

  const toggleResource = (resource) => {
    setFilters((prev) => {
      const updated = new Set(prev.resources);
      if (updated.has(resource)) {
        updated.delete(resource);
      } else {
        updated.add(resource);
      }
      return {
        ...prev,
        resources: updated,
      };
    });
  };

  const clearAllFilters = () => {
    setFilters({
      searchQuery: '',
      therapistGroup: 'All Therapist',
      selectedTherapists: new Set(),
      resources: new Set(),
      bookingStatus: {
        Confirmed: true,
        Unconfirmed: true,
        'Checked In': true,
        Completed: true,
        Cancelled: false,
        'No Show': false,
        Holding: true,
        'Check-in (In Progress)': true,
      },
    });
  };

  return {
    filters,
    filteredBookings,
    filteredTherapists,
    updateSearchQuery,
    updateTherapistGroup,
    toggleTherapist,
    selectAllTherapists,
    toggleBookingStatus,
    toggleResource,
    clearAllFilters,
  };
}
