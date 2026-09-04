import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, LogOut, Smartphone } from 'lucide-react';

export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const isAdmin = user?.roles?.includes('ROLE_ADMIN');

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-slate-100">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-2xl flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-100">Administrator Access Required</h2>
            <p className="text-sm text-slate-400 mt-2">
              You are currently logged in as field collector <strong className="text-cyan-400">{user?.fullName || user?.username}</strong>.
            </p>
            <p className="text-xs text-slate-500 mt-2">
              The Admin Web Portal is restricted to Administrators. Field collectors must perform daily water distributions via the Collector Mobile Application.
            </p>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-xs text-slate-400 text-left space-y-1.5">
            <p className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-cyan-400" /> Need Admin Web Access?
            </p>
            <p>Sign out and log in with the administrator credentials:</p>
            <p className="font-mono text-cyan-400">Username: admin</p>
            <p className="font-mono text-cyan-400">Password: admin123</p>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-lg transition"
          >
            <LogOut className="w-4 h-4" /> Sign Out & Switch Account
          </button>
        </div>
      </div>
    );
  }

  return <Outlet />;
};
