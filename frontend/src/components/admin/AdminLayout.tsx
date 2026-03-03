import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
// import Header from './Header'; // Assuming you still have your header component

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navLinks = [
    { path: '/admin', label: 'Overview' },
    { path: '/admin/booking', label: 'Tours & Bookings' },
    { path: '/admin/analytics', label: 'Analytics' },
    { path: '/admin/calendar', label: 'Calendar' },
  ];

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col">
      {/* You can replace this simple header with your existing <Header /> component 
        and pass the necessary props. 
      */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <h1 className="font-bold text-xl text-slate-800">Prism CRM</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-slate-600">Welcome, {user?.username}</span>
          <button onClick={logout} className="text-sm font-bold text-red-600 hover:text-red-700">Logout</button>
        </div>
      </header>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Admin Sidebar */}
        <aside className="w-64 bg-white text-slate-800 flex flex-col">
          <nav className="flex-1 flex flex-col gap-1 p-4">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link 
                  key={link.path} 
                  to={link.path} 
                  className={`px-4 py-3 rounded-xl text-sm font-medium transition-colors ${isActive ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-800 hover:text-white'}`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content Area - This automatically renders AdminPage or AnalyticsDashboard */}
        <main className="flex-1 overflow-y-auto">
          <Outlet /> 
        </main>
      </div>
    </div>
  );
};
