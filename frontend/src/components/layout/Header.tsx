import { useState } from 'react';
import { Search, Settings, LogOut, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { authApi, clearToken } from '../../services/authApi';

export function Header() {
  const navigate = useNavigate();
  const { user, logout } = useAppStore();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearToken();
      logout();
      navigate('/login');
    }
  };

  return (
    <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-6">
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-4 hover:opacity-80 transition-opacity"
      >
        <h1 className="text-2xl font-bold text-primary">StreamLine</h1>
        <span className="text-sm text-gray-500">BPMN Process Hub</span>
      </button>

      <div className="flex-1 max-w-2xl mx-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search processes..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <Settings className="w-5 h-5 text-gray-600" />
        </button>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-semibold">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            <ChevronDown className="w-4 h-4 text-gray-600" />
          </button>

          {showUserMenu && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowUserMenu(false)}
              />
              {/* Menu */}
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                <div className="px-4 py-3 border-b border-gray-200">
                  <p className="font-semibold text-gray-900">{user?.name}</p>
                  <p className="text-sm text-gray-600">{user?.email}</p>
                  <span className="inline-block mt-1 text-xs px-2 py-1 bg-primary-100 text-primary-700 rounded">
                    {user?.role}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors flex items-center gap-2 text-red-600"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
