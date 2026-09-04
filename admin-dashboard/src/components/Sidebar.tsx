import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  MapPin,
  CircleDollarSign,
  Droplets,
  CreditCard,
  BarChart3,
  LogOut,
  Smartphone,
  Radio,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const { logout } = useAuth();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Live Audit (Today)', path: '/live-audit', icon: Radio },
    { name: 'Customers', path: '/customers', icon: Users },
    { name: 'Collectors', path: '/collectors', icon: UserCheck },
    { name: 'Villages & Areas', path: '/villages', icon: MapPin },
    { name: 'Water Pricing', path: '/water-price', icon: CircleDollarSign },
    { name: 'Distributions', path: '/distributions', icon: Droplets },
    { name: 'Payments', path: '/payments', icon: CreditCard },
    { name: 'Reports', path: '/reports', icon: BarChart3 },
    { name: 'Collector App View', path: '/collector-app', icon: Smartphone },
  ];

  const handleNavClick = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-gradient-to-b from-blue-800 via-blue-900 to-indigo-950 text-white flex flex-col h-screen shadow-2xl border-r border-blue-900/80 transition-transform duration-300 ease-in-out lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0 lg:z-30 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 sm:p-5 border-b border-blue-700/50 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-white text-blue-800 rounded-xl shadow-lg">
              <Droplets className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-extrabold text-base text-white tracking-wide">AquaDistribute</h1>
              <p className="text-[11px] text-blue-200 font-medium">Water Management Portal</p>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-blue-800/80 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3 sm:p-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onClick={handleNavClick}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-white text-blue-900 shadow-md shadow-blue-900/20 font-bold'
                    : 'text-blue-100 hover:text-white hover:bg-blue-800/60'
                }`
              }
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span className="truncate">{item.name}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer / Logout */}
        <div className="p-4 border-t border-blue-800/60">
          <button
            onClick={logout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold text-rose-200 hover:bg-rose-600/20 hover:text-rose-100 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
