import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';

// Import Pages
import BookingPage from './pages/public/booking/BookingPage';
import LoginPage from './pages/public/LoginPage';
import AdminPage from './pages/admin/AdminPage';
import AnalyticsDashboard from './pages/admin/AnalyticsDashboard';

// Import Layout & Security Wrappers
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AdminLayout } from './components/admin/AdminLayout';
import AdminBookingsPage from './pages/admin/AdminBookingsPage';
import AdminCalendarPage from './pages/admin/AdminCalendarPage';
import AdminApplicationsPage from './pages/admin/application/AdminApplicationsPage';
import ApplicationPage from './pages/public/application/ApplicationPage';
import MeetingBookingPage from './pages/public/booking/MeetingBookingPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';

const AppContent: React.FC = () => {
  return (
    <Routes>
      {/* === PUBLIC ROUTES === */}
      {/* Root redirects to /booking */}
      <Route path="/" element={<Navigate to="/booking" replace />} />
      <Route path="/booking" element={<BookingPage bookingType="tour" />} />
      <Route path="/meeting" element={<BookingPage bookingType="meeting" />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/pub_apply/:token" element={<ApplicationPage />} />
      <Route path="/book/u/:token" element={<MeetingBookingPage />} />

      {/* === PROTECTED ADMIN ROUTES === */}
      <Route element={<ProtectedRoute />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="booking" element={<AdminBookingsPage />} />
          <Route path="calendar" element={<AdminCalendarPage />} />
          <Route index element={<AdminPage />} />
          <Route path="analytics" element={<AnalyticsDashboard />} />
          <Route path="applications" element={<AdminApplicationsPage />} />
          <Route path="settings/users" element={<AdminUsersPage />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/booking" replace />} />
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