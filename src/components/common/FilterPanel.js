import React from 'react';
import './FilterPanel.css';

export function FilterPanel({
  filters,
  filteredTherapists,
  onSearchChange,
  onTherapistGroupChange,
  onTherapistToggle,
  onSelectAllTherapists,
  onStatusToggle,
  onResourceToggle,
  onClearFilters,
}) {
  const [isOpen, setIsOpen] = React.useState(false);

  const statusOptions = [
    'Confirmed',
    'Unconfirmed',
    'Checked In',
    'Completed',
    'Cancelled',
    'No Show',
    'Holding',
    'Check-in (In Progress)',
  ];

  const resourceOptions = ['Rooms', 'Sofa', 'Monkey Chair'];

  return (
    <>
      {/* Filter Button */}
      <button
        className="filter-button"
        onClick={() => setIsOpen(!isOpen)}
        title="Toggle filter panel"
      >
        🎛 Filter
      </button>

      {/* Filter Panel */}
      {isOpen && (
        <div className="filter-panel">
          <div className="filter-header">
            <h3>Filters</h3>
            <button
              className="close-button"
              onClick={() => setIsOpen(false)}
            >
              ✕
            </button>
          </div>

          <div className="filter-content">
            {/* Search */}
            <div className="filter-section">
              <input
                type="text"
                placeholder="Search bookings by phone/name"
                value={filters.searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="search-input"
              />
            </div>

            {/* Show by Group */}
            <div className="filter-section">
              <h4>Show by group (Person who is on duty)</h4>
              <div className="radio-group">
                {['All Therapist', 'Male', 'Female'].map((group) => (
                  <label key={group} className="radio-label">
                    <input
                      type="radio"
                      name="therapist-group"
                      value={group}
                      checked={filters.therapistGroup === group}
                      onChange={() => onTherapistGroupChange(group)}
                    />
                    <span>{group}</span>
                    {group === 'All Therapist' && (
                      <span className="radio-indicator">●</span>
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Resources */}
            <div className="filter-section">
              <h4>Resources</h4>
              <div className="checkbox-group">
                {resourceOptions.map((resource) => (
                  <label key={resource} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={filters.resources.has(resource)}
                      onChange={() => onResourceToggle(resource)}
                    />
                    <span>{resource}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Booking Status */}
            <div className="filter-section">
              <h4>Booking Status</h4>
              <div className="status-grid">
                {statusOptions.map((status) => (
                  <label key={status} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={filters.bookingStatus[status]}
                      onChange={() => onStatusToggle(status)}
                    />
                    <span>{status}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Select Therapist */}
            <div className="filter-section">
              <div className="therapist-header">
                <h4>Select Therapist</h4>
                <button
                  className="select-all-button"
                  onClick={onSelectAllTherapists}
                >
                  Select All ✓
                </button>
              </div>
              <input
                type="text"
                placeholder="Search by therapist"
                className="therapist-search"
                onChange={(e) => onSearchChange(e.target.value)}
              />
              <div className="therapist-list">
                {filteredTherapists.slice(0, 10).map((therapist) => (
                  <label key={therapist.id} className="therapist-item">
                    <input
                      type="checkbox"
                      checked={filters.selectedTherapists.has(therapist.id)}
                      onChange={() => onTherapistToggle(therapist.id)}
                    />
                    <span>{therapist.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Clear Filter */}
            <button className="clear-button" onClick={onClearFilters}>
              Clear Filter (Return to Default)
            </button>
          </div>
        </div>
      )}
    </>
  );
}
