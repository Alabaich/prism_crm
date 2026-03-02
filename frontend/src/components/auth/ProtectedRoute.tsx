import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export const ProtectedRoute: React.FC = () => {
  const { user } = useAuth();

  // If there's no user, send them to the login page
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If there is a user, render the child routes (Outlet)
  return <Outlet />;
};
