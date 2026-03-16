import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '../types';

const API_URL = import.meta.env.VITE_API_URL || '';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true); // true on mount while we check localStorage

  // ── Restore session from localStorage on page load ────────────────────────
  useEffect(() => {
    const storedToken = localStorage.getItem('prism_token');
    const storedUser = localStorage.getItem('prism_user');

    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(parsedUser);
      } catch {
        // Corrupted data — clear it
        localStorage.removeItem('prism_token');
        localStorage.removeItem('prism_user');
      }
    }

    setIsLoading(false);
  }, []);

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) return false;

      const data = await response.json();

      if (data.success && data.token) {
        const userData: User = {
          username: data.user.username,
          role: data.user.role,
        };

        // Save to state
        setToken(data.token);
        setUser(userData);

        // Persist in localStorage — survives page refresh and container restarts
        localStorage.setItem('prism_token', data.token);
        localStorage.setItem('prism_user', JSON.stringify(userData));

        return true;
      }

      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('prism_token');
    localStorage.removeItem('prism_user');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};