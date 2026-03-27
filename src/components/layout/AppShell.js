import React, { useState } from 'react';
import NavBar from './NavBar.js';
import FiltersBar from './FiltersBar.js';
import RightPanel from './RightPanel.js';
import Modal from '../common/Modal.js';

const AppShell = ({ children }) => {
  const [filters, setFilters] = useState({});

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
  };

  const childrenWithFilters = React.cloneElement(children, { filters });

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Top Navigation Bar */}
      <NavBar />

      {/* Filters/Header Bar */}
      <FiltersBar filters={filters} onFiltersChange={handleFiltersChange} />

      {/* Main Calendar Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {childrenWithFilters}
      </div>

      {/* Right Booking Panel */}
      <RightPanel />

      {/* Modal for success/error messages */}
      <Modal />
    </div>
  );
};

export default AppShell;
