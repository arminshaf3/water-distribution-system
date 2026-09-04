import React from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Shield, Key } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">User Profile</h1>
          <p className="text-slate-400 text-sm">Account details and security permissions</p>
        </div>
      </div>

      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row items-center gap-6 border-b border-slate-800 pb-8 mb-8">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-extrabold text-4xl shadow-xl shadow-cyan-500/20">
            {user.fullName ? user.fullName.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase()}
          </div>
          <div className="text-center sm:text-left space-y-2">
            <h2 className="text-2xl font-bold text-slate-100">{user.fullName || user.username}</h2>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              {user.roles.map((role) => (
                <span key={role} className="px-3 py-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-full text-xs font-bold uppercase">
                  {role.replace('ROLE_', '')}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-950/40 p-5 rounded-xl border border-slate-800/60 space-y-1">
            <span className="text-xs text-slate-500 font-semibold uppercase flex items-center gap-1.5">
              <User className="w-4 h-4 text-cyan-400" /> Username
            </span>
            <p className="text-lg font-mono text-slate-200 font-bold">{user.username}</p>
          </div>

          <div className="bg-slate-950/40 p-5 rounded-xl border border-slate-800/60 space-y-1">
            <span className="text-xs text-slate-500 font-semibold uppercase flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-blue-400" /> Email Address
            </span>
            <p className="text-lg font-mono text-slate-200 font-bold">{user.email || 'N/A'}</p>
          </div>

          <div className="bg-slate-950/40 p-5 rounded-xl border border-slate-800/60 space-y-1">
            <span className="text-xs text-slate-500 font-semibold uppercase flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-400" /> Access Privilege Level
            </span>
            <p className="text-lg text-emerald-400 font-bold">Full Administrative Control</p>
          </div>

          <div className="bg-slate-950/40 p-5 rounded-xl border border-slate-800/60 space-y-1">
            <span className="text-xs text-slate-500 font-semibold uppercase flex items-center gap-1.5">
              <Key className="w-4 h-4 text-purple-400" /> Account Security Status
            </span>
            <p className="text-lg text-slate-200 font-bold">Active & Authenticated (JWT)</p>
          </div>
        </div>
      </div>
    </div>
  );
};
