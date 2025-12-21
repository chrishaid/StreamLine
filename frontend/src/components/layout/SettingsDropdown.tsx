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
        className="p-2.5 hover:bg-mist dark:hover:bg-slate-700 rounded-xl transition-colors"
        aria-label="Settings"
      >
        <Settings className="w-5 h-5 text-slate-500 dark:text-slate-400" />
      </button>

      {showMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />
          {/* Menu */}
          <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-soft-lg border border-mist-300 dark:border-slate-700 py-2 z-20 animate-fade-in">
            {/* Header */}
            <div className="px-5 py-3 border-b border-mist dark:border-slate-700">
              <p className="font-medium text-forest dark:text-slate-200 text-sm">Settings</p>
            </div>

            {/* User Settings Section */}
            <div className="py-3">
              {/* Theme Toggle */}
              <div className="px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {theme === 'light' ? (
                    <Sun className="w-5 h-5 text-gold" />
                  ) : (
                    <Moon className="w-5 h-5 text-indigo-400" />
                  )}
                  <span className="text-sm text-forest dark:text-slate-300">Theme</span>
                </div>
                <button
                  onClick={toggleTheme}
                  className={`relative w-12 h-7 rounded-full transition-colors ${
                    theme === 'dark' ? 'bg-indigo-500' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Chat Position */}
              <div className="px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-stone" />
                  <span className="text-sm text-forest dark:text-slate-300">Chat Position</span>
                </div>
                <select
                  value={userPreferences.chatPosition}
                  onChange={(e) => handleChatPositionChange(e.target.value as 'right' | 'left' | 'bottom')}
                  className="text-sm border border-mist-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-forest dark:text-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-sage/20"
                >
                  {CHAT_POSITION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Auto-save Interval */}
              <div className="px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-stone" />
                  <span className="text-sm text-forest dark:text-slate-300">Auto-save</span>
                </div>
                <select
                  value={userPreferences.autoSaveInterval}
                  onChange={(e) => handleAutoSaveChange(Number(e.target.value))}
                  className="text-sm border border-mist-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-forest dark:text-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-sage/20"
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
                <div className="border-t border-mist dark:border-slate-700 my-1" />
                <div className="p-2">
                  <button
                    onClick={handleOrgSettingsClick}
                    className="w-full px-4 py-3.5 text-left hover:bg-mist/50 dark:hover:bg-slate-700/50 transition-colors flex items-center gap-3 rounded-lg"
                  >
                    <Building2 className="w-5 h-5 text-stone" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-forest dark:text-slate-300">Organization Settings</span>
                      <p className="text-xs text-stone dark:text-slate-400 truncate mt-0.5">
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
