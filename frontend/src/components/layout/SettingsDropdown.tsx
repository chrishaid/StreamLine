import { useState } from 'react';
import { Settings, Sun, Moon, MessageSquare, Clock, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { useTheme } from '../../context/ThemeContext';
import { userPreferencesApi } from '../../services/api';

const AUTO_SAVE_OPTIONS = [
  { value: 30, label: '30 seconds' },
  { value: 60, label: '1 minute' },
  { value: 120, label: '2 minutes' },
  { value: 300, label: '5 minutes' },
  { value: 0, label: 'Off' },
];

const CHAT_POSITION_OPTIONS = [
  { value: 'right' as const, label: 'Right' },
  { value: 'left' as const, label: 'Left' },
  { value: 'bottom' as const, label: 'Bottom' },
];

export function SettingsDropdown() {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { userPreferences, updateUserPreference, currentOrganization, isAuthenticated } = useAppStore();

  // Check if user has admin/owner role in current organization
  const canManageOrg = currentOrganization?.currentUserRole === 'owner' ||
                       currentOrganization?.currentUserRole === 'admin';

  const handleChatPositionChange = async (position: 'right' | 'left' | 'bottom') => {
    updateUserPreference('chatPosition', position);
    if (isAuthenticated) {
      try {
        await userPreferencesApi.updatePreferences({ chatPosition: position });
      } catch (error) {
        console.error('Failed to save chat position:', error);
      }
    }
  };

  const handleAutoSaveChange = async (interval: number) => {
    updateUserPreference('autoSaveInterval', interval);
    if (isAuthenticated) {
      try {
        await userPreferencesApi.updatePreferences({ autoSaveInterval: interval });
      } catch (error) {
        console.error('Failed to save auto-save interval:', error);
      }
    }
  };

  const handleOrgSettingsClick = () => {
    setShowMenu(false);
    if (currentOrganization) {
      navigate(`/organizations/${currentOrganization.slug}?tab=settings`);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
        aria-label="Settings"
      >
        <Settings className="w-4 h-4 text-slate-500 dark:text-slate-400" />
      </button>

      {showMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />
          {/* Menu */}
          <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-800 rounded-xl shadow-soft-lg border border-slate-200 dark:border-slate-700 py-1.5 z-20 animate-fade-in">
            {/* Header */}
            <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700">
              <p className="font-medium text-slate-800 dark:text-slate-200 text-sm">Settings</p>
            </div>

            {/* User Settings Section */}
            <div className="py-2">
              {/* Theme Toggle */}
              <div className="px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {theme === 'light' ? (
                    <Sun className="w-4 h-4 text-amber-500" />
                  ) : (
                    <Moon className="w-4 h-4 text-indigo-400" />
                  )}
                  <span className="text-sm text-slate-700 dark:text-slate-300">Theme</span>
                </div>
                <button
                  onClick={toggleTheme}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    theme === 'dark' ? 'bg-indigo-500' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Chat Position */}
              <div className="px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <MessageSquare className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">Chat Position</span>
                </div>
                <select
                  value={userPreferences.chatPosition}
                  onChange={(e) => handleChatPositionChange(e.target.value as 'right' | 'left' | 'bottom')}
                  className="text-xs border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  {CHAT_POSITION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Auto-save Interval */}
              <div className="px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">Auto-save</span>
                </div>
                <select
                  value={userPreferences.autoSaveInterval}
                  onChange={(e) => handleAutoSaveChange(Number(e.target.value))}
                  className="text-xs border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  {AUTO_SAVE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Organization Settings Section */}
            {currentOrganization && canManageOrg && (
              <>
                <div className="border-t border-slate-100 dark:border-slate-700 my-1" />
                <div className="py-1">
                  <button
                    onClick={handleOrgSettingsClick}
                    className="w-full px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex items-center gap-2.5"
                  >
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-slate-700 dark:text-slate-300">Organization Settings</span>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {currentOrganization.name}
                      </p>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
