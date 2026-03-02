import React from 'react';
import logo from '../assets/logo.png';

interface HeaderProps {
  currentView: 'booking' | 'login' | 'admin';
  onHomeClick: () => void;
  onLoginClick: () => void;
  onAdminDashboardClick: () => void;
  onLogoutClick: () => void;
  username?: string;
}

const Header: React.FC<HeaderProps> = ({
  currentView,
  onHomeClick,
  onLoginClick,
  onAdminDashboardClick,
  onLogoutClick,
  username
}) => {
  return (
    <nav className="flex w-full items-center justify-between border-b border-slate-200 bg-white px-8 py-4 shadow-sm">
      {/* Universal Logo linking back to homepage */}
      <button onClick={onHomeClick} className="flex items-center hover:opacity-80 transition-opacity">
        <img 
          src={logo} 
          alt="Prism Property Management" 
          className="h-8 object-contain"
        />
      </button>

      {/* Dynamic Navigation Actions */}
      <div className="flex items-center gap-4">
        {currentView === 'booking' && (
          <button
            onClick={username ? onAdminDashboardClick : onLoginClick}
            className="!bg-slate-800 !text-white rounded-lg px-6 py-2.5 text-sm font-semibold transition-colors hover:!bg-slate-700 shadow-md"
          >
            {username ? 'Admin Dashboard' : 'Admin Login'}
          </button>
        )}
        
        {currentView === 'login' && (
          <button
            onClick={onHomeClick}
            className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
          >
            &larr; Back to Booking
          </button>
        )}

        {currentView === 'admin' && (
          <>
            <span className="text-sm font-medium text-slate-600">
              Welcome, {username}
            </span>
            <button
              onClick={onLogoutClick}
              className="rounded-lg !bg-slate-100 !text-slate-700 px-4 py-2 text-sm font-medium transition-colors hover:!bg-slate-200 border border-slate-200"
            >
              Log Out
            </button>
          </>
        )}
      </div>
    </nav>
  );
};

export default Header;