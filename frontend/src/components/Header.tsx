import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import logo from '../assets/logo.png';

interface HeaderProps {
  currentView: 'booking' | 'login' | 'admin';
}

const Header: React.FC<HeaderProps> = ({ currentView }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleHomeClick = () => navigate('/');
  const handleLoginClick = () => navigate('/login');
  const handleAdminDashboardClick = () => navigate('/admin');
  
  const handleLogoutClick = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="flex w-full items-center justify-between border-b border-slate-200 bg-white px-8 py-4 shadow-sm">
      {/* Universal Logo linking back to homepage */}
      <button onClick={handleHomeClick} className="flex items-center hover:opacity-80 transition-opacity">
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
            onClick={user ? handleAdminDashboardClick : handleLoginClick}
            className="!bg-slate-800 !text-white rounded-lg px-6 py-2.5 text-sm font-semibold transition-colors hover:!bg-slate-700 shadow-md"
          >
            {user ? 'Admin Dashboard' : 'Admin Login'}
          </button>
        )}
        
        {currentView === 'login' && (
          <button
            onClick={handleHomeClick}
            className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
          >
            &larr; Back to Booking
          </button>
        )}

        {currentView === 'admin' && (
          <>
            <span className="text-sm font-medium text-slate-600">
              Welcome, {user?.username}
            </span>
            <button
              onClick={handleLogoutClick}
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
