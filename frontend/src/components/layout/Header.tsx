import { useState } from 'react';
import { Settings, LogOut, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { supabase } from '../../lib/supabase';
import { OrganizationSwitcher } from './OrganizationSwitcher';

export function Header() {
  const navigate = useNavigate();
  const { user, logout } = useAppStore();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      logout();
      navigate('/login');
    }
  };

  return (
    <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-6">
      {/* Logo */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <h1 className="text-xl font-semibold text-slate-800 tracking-tight">StreamLine</h1>
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">BPMN</span>
        </button>

        {/* Organization Switcher */}
        <div className="border-l border-slate-200 pl-4">
          <OrganizationSwitcher />
        </div>
      </div>

      {/* Search */}
      <div className="flex-1 max-w-md mx-8">
        <input
          type="text"
          placeholder="Search processes..."
          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all"
        />
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2">
        <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <Settings className="w-4 h-4 text-slate-500" />
        </button>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-7 h-7 rounded-full ring-2 ring-slate-100"
              />
            ) : (
              <div className="w-7 h-7 bg-slate-700 rounded-full flex items-center justify-center text-white text-xs font-medium">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showUserMenu && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowUserMenu(false)}
              />
              {/* Menu */}
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-soft-lg border border-slate-200 py-1.5 z-20 animate-fade-in">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="font-medium text-slate-800 text-sm">{user?.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{user?.email}</p>
                  <span className="inline-block mt-2 text-2xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-medium uppercase tracking-wide">
                    {user?.role}
                  </span>
                </div>
                <div className="py-1">
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left hover:bg-slate-50 transition-colors flex items-center gap-2.5 text-slate-600 text-sm"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
