import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';

// Import Pages
import BookingPage from './pages/public/BookingPage';
import LoginPage from './pages/public/LoginPage';
import AdminPage from './pages/admin/AdminPage';
import AnalyticsDashboard from './pages/admin/AnalyticsDashboard';

// Import Layout & Security Wrappers
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AdminLayout } from './components/admin/AdminLayout';
import AdminBookingsPage from './pages/admin/AdminBookingsPage';
import AdminCalendarPage from './pages/admin/AdminCalendarPage';

const AppContent: React.FC = () => {


  return (
    <Routes>
      {/* === PUBLIC ROUTES === */}
      <Route path="/" element={<BookingPage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* === PROTECTED ADMIN ROUTES === */}
      {/* Anything wrapped inside <ProtectedRoute> requires an active session */}
      <Route element={<ProtectedRoute />}>
        {/* AdminLayout provides the sidebar/header wrapper for admin pages */}
        <Route path="/admin" element={<AdminLayout />}>

          <Route path="booking" element={<AdminBookingsPage />} />

          <Route path="calendar" element={<AdminCalendarPage />} />
          
          {/* Index route: Automatically loads on '/admin' */}
          <Route index element={<AdminPage />} />
          
          {/* Automatically loads on '/admin/analytics' */}
          <Route path="analytics" element={<AnalyticsDashboard />} />
          
        </Route>
      </Route>

      {/* Fallback route - catches unknown URLs and safely redirects home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
