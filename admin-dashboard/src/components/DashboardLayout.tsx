import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { Outlet, NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Radio,
  Droplets,
  Users,
  Menu,
  AlertCircle
} from 'lucide-react';

export const DashboardLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-950 text-slate-100 relative">
      {/* Sticky Sidebar for Desktop and Mobile Drawer */}
      <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden">
        <Navbar onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)} />
        {/* Main content with responsive mobile & desktop scroll */}
        <main className="flex-1 p-3 sm:p-5 md:p-6 pb-24 lg:pb-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Visible on mobile/tablet < lg) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-1 py-1.5 flex justify-around items-center shadow-2xl safe-area-inset-bottom">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
              isActive ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200 font-medium'
            }`
          }
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Overview</span>
        </NavLink>

        <NavLink
          to="/live-audit"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
              isActive ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200 font-medium'
            }`
          }
        >
          <Radio className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Audit</span>
        </NavLink>

        <NavLink
          to="/distributions"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
              isActive ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200 font-medium'
            }`
          }
        >
          <Droplets className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Deliveries</span>
        </NavLink>

        <NavLink
          to="/unpaid-bills"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
              isActive ? 'text-rose-400 font-bold' : 'text-slate-400 hover:text-slate-200 font-medium'
            }`
          }
        >
          <AlertCircle className="w-5 h-5 mb-0.5 text-rose-500" />
          <span className="text-[10px] tracking-tight text-rose-400">Unpaid</span>
        </NavLink>

        <NavLink
          to="/customers"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
              isActive ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200 font-medium'
            }`
          }
        >
          <Users className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Customers</span>
        </NavLink>

        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center py-1 px-2 text-slate-400 hover:text-slate-200 rounded-xl transition-all"
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Menu</span>
        </button>
      </nav>
    </div>
  );
};
