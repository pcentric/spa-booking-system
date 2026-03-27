import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import logger from '../../utils/logger.js';

const NavBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const navItems = [
    { label: 'Home', id: 'home', path: '/' },
    { label: 'Therapists', id: 'therapists', path: '/therapists' },
    { label: 'Sales', id: 'sales', path: '/sales' },
    { label: 'Clients', id: 'clients', path: '/clients' },
    { label: 'Transactions', id: 'transactions', path: '/transactions' },
    { label: 'Reports', id: 'reports', path: '/reports' },
  ];

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/' || location.pathname === '/calendar';
    }
    return location.pathname === path;
  };

  const handleNavClick = (path) => {
    logger.debug('NavBar', 'Navigating to', { path });
    navigate(path);
  };

  const handleLogout = () => {
    logger.info('NavBar: Logging out');
    logout();
  };

  return (
    <div className="h-16 bg-brand flex items-center justify-between px-10">
      {/* Logo */}
      <div className="text-white font-bold text-xl tracking-tight cursor-pointer hover:opacity-80 transition-opacity" onClick={() => handleNavClick('/')}>
        SPA
      </div>

      {/* Navigation Items */}
      <nav className="flex items-center gap-8 flex-1 ml-20">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleNavClick(item.path)}
            className={`text-sm font-medium whitespace-nowrap transition-colors ${
              isActive(item.path) ? 'text-brand-gold' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {/* Right Actions */}
      <div className="flex items-center gap-4 ml-auto">
        {/* Get for free button */}
        <button className="px-4 py-2 bg-white text-brand font-medium text-sm rounded-lg hover:bg-gray-100 transition-colors">
          Get for free
        </button>

        {/* User Avatar */}
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center cursor-pointer hover:bg-white/30 transition-colors" title="User menu">
          <span className="text-white font-semibold text-sm">U</span>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="px-3 py-2 text-sm text-white/60 hover:text-white transition-colors"
          title="Logout"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export default NavBar;
