import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import logger from '../../utils/logger.js';

const NavBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'Home', id: 'home', path: '/' },
    { label: 'Therapists', id: 'therapists', path: '/therapists' },
    { label: 'Sales', id: 'sales', path: '/sales' },
    { label: 'Clients', id: 'clients', path: '/clients' },
    { label: 'Transactions', id: 'transactions', path: '/transactions' },
    { label: 'Reports', id: 'reports', path: '/reports' },
  ];

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/' || location.pathname === '/calendar';
    return location.pathname === path;
  };

  const handleNavClick = (path) => {
    logger.debug('NavBar', 'Navigating to', { path });
    navigate(path);
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    logger.info('NavBar: Logging out');
    logout();
  };

  return (
    <>
      <div className="h-16 bg-brand flex items-center justify-between px-4 md:px-10 relative z-50 flex-shrink-0">
        {/* Logo */}
        <div
          className="text-white font-bold text-xl tracking-tight cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => handleNavClick('/')}
        >
          SPA
        </div>

        {/* Desktop Navigation Items */}
        <nav className="hidden md:flex items-center gap-8 flex-1 ml-20">
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
        <div className="flex items-center gap-3 ml-auto">
          {/* Get for free — hidden on mobile */}
          <button className="hidden sm:block px-4 py-2 bg-white text-brand font-medium text-sm rounded-lg hover:bg-gray-100 transition-colors">
            Get for free
          </button>

          {/* User Avatar */}
          <div
            className="w-8 h-8 md:w-10 md:h-10 bg-white/20 rounded-full flex items-center justify-center cursor-pointer hover:bg-white/30 transition-colors"
            title="User menu"
          >
            <span className="text-white font-semibold text-sm">U</span>
          </div>

          {/* Logout — desktop only */}
          <button
            onClick={handleLogout}
            className="hidden md:block px-3 py-2 text-sm text-white/60 hover:text-white transition-colors"
            title="Logout"
          >
            ✕
          </button>

          {/* Hamburger — mobile only */}
          <button
            className="md:hidden p-2 text-white hover:bg-white/10 rounded-md transition-colors"
            onClick={() => setMobileMenuOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="absolute top-16 left-0 right-0 bg-brand shadow-xl border-t border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.path)}
                className={`w-full text-left px-6 py-4 text-sm font-medium border-b border-white/10 transition-colors ${
                  isActive(item.path)
                    ? 'text-brand-gold bg-white/10'
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
            <div className="px-6 py-4 flex items-center justify-between">
              <button className="px-4 py-2 bg-white text-brand font-medium text-sm rounded-lg">
                Get for free
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm text-white/70 hover:text-white transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default NavBar;
