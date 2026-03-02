import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Header from './components/Header';
import BookingView from './views/BookingView';
import LoginView from './views/LoginView';
import AdminView from './views/AdminView';

type ViewRoute = 'booking' | 'login' | 'admin';

const AppContent: React.FC = () => {
  const { user, logout } = useAuth();
  const [view, setView] = useState<ViewRoute>('booking');

  // Automatically route to admin dashboard upon successful login
  useEffect(() => {
    if (user && view === 'login') {
      setView('admin');
    }
  }, [user, view]);

  // Route back to login if session expires or user logs out
  useEffect(() => {
    if (!user && view === 'admin') {
      setView('login');
    }
  }, [user, view]);

  const handleLogout = () => {
    logout();
    setView('booking');
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col">
      <Header 
        currentView={view}
        onHomeClick={() => setView('booking')}
        onLoginClick={() => setView('login')}
        onAdminDashboardClick={() => setView('admin')}
        onLogoutClick={handleLogout}
        username={user?.username}
      />
      <div className="flex-1 w-full flex flex-col">
        {view === 'admin' && user ? (
          <AdminView />
        ) : view === 'login' ? (
          <LoginView />
        ) : (
          <BookingView />
        )}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
