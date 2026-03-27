import React from 'react';
import { FilterPanel } from './common/FilterPanel.js';
import { useFilterState } from '../hooks/useFilterState.js';
import './Dashboard.css';

export function Dashboard({ initialBookings, therapists }) {
  const {
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
  } = useFilterState(initialBookings, therapists);

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <h1>📅 SPA Booking Dashboard</h1>
        <p>Manage spa bookings and therapist schedules</p>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <input
          type="text"
          placeholder="Search bookings by phone/name"
          value={filters.searchQuery}
          onChange={(e) => updateSearchQuery(e.target.value)}
          className="toolbar-search"
        />

        <div style={{ position: 'relative' }}>
          <FilterPanel
            filters={filters}
            filteredTherapists={filteredTherapists}
            onSearchChange={updateSearchQuery}
            onTherapistGroupChange={updateTherapistGroup}
            onTherapistToggle={toggleTherapist}
            onSelectAllTherapists={selectAllTherapists}
            onStatusToggle={toggleBookingStatus}
            onResourceToggle={toggleResource}
            onClearFilters={clearAllFilters}
          />
        </div>
      </div>

      {/* Bookings Summary */}
      <div className="summary">
        <div className="summary-card">
          <h3>Total Bookings</h3>
          <p className="count">{filteredBookings.length}</p>
        </div>
        <div className="summary-card">
          <h3>Active Therapists</h3>
          <p className="count">{filteredTherapists.length}</p>
        </div>
        <div className="summary-card">
          <h3>Filter Status</h3>
          <p className="status">
            {filters.searchQuery && `Search: "${filters.searchQuery}"`}
            {filters.therapistGroup !== 'All Therapist' && ` | Group: ${filters.therapistGroup}`}
            {filters.selectedTherapists.size > 0 && ` | Selected: ${filters.selectedTherapists.size}`}
          </p>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bookings-section">
        <h2>Filtered Bookings ({filteredBookings.length})</h2>
        {filteredBookings.length === 0 ? (
          <div className="empty-state">
            <p>No bookings match your filters</p>
            <button onClick={clearAllFilters} className="reset-button">
              Clear Filters
            </button>
          </div>
        ) : (
          <table className="bookings-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Phone</th>
                <th>Service</th>
                <th>Therapist</th>
                <th>Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.slice(0, 20).map((booking) => {
                const therapist = therapists.find((t) => t.id === booking.therapist_id);
                return (
                  <tr key={booking.id}>
                    <td>{booking.customer_name}</td>
                    <td>{booking.mobile_number}</td>
                    <td>{booking.items?.[0]?.service?.name || 'N/A'}</td>
                    <td>{therapist?.name || 'N/A'}</td>
                    <td>{booking.items?.[0]?.start_time || 'N/A'}</td>
                    <td>
                      <span className={`status-badge status-${booking.status?.toLowerCase()}`}>
                        {booking.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Debug Info */}
      <div className="debug-info">
        <h3>Active Filters</h3>
        <pre>{JSON.stringify(filters, (key, value) => {
          if (value instanceof Set) {
            return Array.from(value);
          }
          return value;
        }, 2)}</pre>
      </div>
    </div>
  );
}
