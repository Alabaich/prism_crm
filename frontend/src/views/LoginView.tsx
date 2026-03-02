import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const success = await login(username, password);
    
    if (!success) {
      setError('Invalid credentials. Try admin / admin');
    }
    setIsLoading(false);
  };

  return (
    <div className="flex flex-1 w-full items-center justify-center py-12 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-xl border border-slate-100">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-slate-800">Prism Admin</h1>
          <p className="text-slate-500">Sign in to manage properties</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Username</label>
            <input
              type="text"
              className="w-full rounded-lg border border-slate-300 p-2.5 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={username}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
              placeholder="admin"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              className="w-full rounded-lg border border-slate-300 p-2.5 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full !bg-blue-600 !text-white rounded-lg p-2.5 font-medium transition-colors hover:!bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:!bg-blue-400 shadow-md"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginView;