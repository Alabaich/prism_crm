import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export const ProtectedRoute: React.FC = () => {
  const { user, isLoading } = useAuth();

  // Wait for localStorage restore to finish before deciding to redirect.
  // Without this, the page flashes to /login on every refresh even when logged in.
  if (isLoading) {
    return null; // or a spinner if you want
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};