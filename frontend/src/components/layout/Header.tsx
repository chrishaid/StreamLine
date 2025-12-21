import { useState, useEffect, useRef } from 'react';
import { LogOut, ChevronDown, Tag, FileText } from 'lucide-react';
import { SettingsDropdown } from './SettingsDropdown';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { supabase } from '../../lib/supabase';
import { OrganizationSwitcher } from './OrganizationSwitcher';
import { processApi } from '../../services/api';
import { RangeLogo } from '../brand/RangeLogo';
import type { Process } from '../../types';

export function Header() {
  const navigate = useNavigate();
  const { user, logout, currentOrganization } = useAppStore();
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Process[]>([]);
  const [allProcesses, setAllProcesses] = useState<Process[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Load processes for search
  useEffect(() => {
    loadProcesses();
  }, [currentOrganization]);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadProcesses = async () => {
    try {
      const organizationId = currentOrganization?.id || null;
      const response = await processApi.getAll({ limit: 200, organizationId });
      setAllProcesses(response.processes);
    } catch (error) {
      console.error('Failed to load processes for search:', error);
    }
  };

  // Filter processes based on search query (case insensitive, searches name and tags)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = allProcesses.filter(process => {
      // Search in name
      if (process.name.toLowerCase().includes(query)) return true;
      // Search in tags
      if (process.tags?.some(tag => tag.toLowerCase().includes(query))) return true;
      // Search in description
      if (process.description?.toLowerCase().includes(query)) return true;
      return false;
    });

    setSearchResults(filtered.slice(0, 8)); // Limit to 8 results
  }, [searchQuery, allProcesses]);

  const handleSearchSelect = (process: Process) => {
    setSearchQuery('');
    setShowSearchResults(false);
    navigate(`/editor/${process.id}`);
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? <mark key={i} className="bg-sage/20 text-sage-700 rounded px-0.5">{part}</mark> : part
    );
  };

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
    <header className="h-14 border-b border-mist-300 bg-white flex items-center justify-between px-6">
      {/* Logo */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <RangeLogo size={32} variant="default" />
          <span className="text-xl font-serif italic text-forest tracking-tight">Range</span>
        </button>

        {/* Organization Switcher */}
        <div className="border-l border-mist-300 pl-4">
          <OrganizationSwitcher />
        </div>
      </div>

      {/* Search */}
      <div className="flex-1 max-w-md mx-8 relative" ref={searchRef}>
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchResults(true);
            }}
            onFocus={() => setShowSearchResults(true)}
            placeholder="Search processes or tags..."
            className="w-full px-4 py-2.5 bg-mist/50 border border-mist-300 rounded-lg text-sm text-forest placeholder-stone focus:outline-none focus:bg-white focus:border-sage focus:ring-1 focus:ring-sage/20 transition-all"
          />
        </div>

        {/* Search Results Dropdown */}
        {showSearchResults && searchQuery.trim() && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-mist-300 max-h-80 overflow-y-auto z-50">
            {searchResults.length > 0 ? (
              <div className="py-1">
                {searchResults.map((process) => (
                  <button
                    key={process.id}
                    onClick={() => handleSearchSelect(process)}
                    className="w-full px-4 py-2.5 text-left hover:bg-mist/50 transition-colors flex items-start gap-3"
                  >
                    <FileText className="w-4 h-4 text-stone mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-forest truncate">
                        {highlightMatch(process.name, searchQuery)}
                      </p>
                      {process.tags && process.tags.length > 0 && (
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          <Tag className="w-3 h-3 text-stone" />
                          {process.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="text-xs px-1.5 py-0.5 bg-mist text-slate-600 rounded"
                            >
                              {highlightMatch(tag, searchQuery)}
                            </span>
                          ))}
                          {process.tags.length > 3 && (
                            <span className="text-xs text-stone">+{process.tags.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-slate-500">No processes found for "{searchQuery}"</p>
                <p className="text-xs text-stone mt-1">Try searching by name or tag</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2">
        <SettingsDropdown />

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1.5 hover:bg-mist rounded-lg transition-colors"
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-7 h-7 rounded-full ring-2 ring-mist"
              />
            ) : (
              <div className="w-7 h-7 bg-forest rounded-full flex items-center justify-center text-white text-xs font-medium">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            <ChevronDown className="w-3.5 h-3.5 text-stone" />
          </button>

          {showUserMenu && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowUserMenu(false)}
              />
              {/* Menu */}
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-soft-lg border border-mist-300 py-1.5 z-20 animate-fade-in">
                <div className="px-4 py-3 border-b border-mist">
                  <p className="font-medium text-forest text-sm">{user?.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{user?.email}</p>
                  <span className="inline-block mt-2 text-2xs px-2 py-0.5 bg-mist text-slate-600 rounded-full font-medium uppercase tracking-wide">
                    {user?.role}
                  </span>
                </div>
                <div className="py-1">
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left hover:bg-mist/50 transition-colors flex items-center gap-2.5 text-slate-600 text-sm"
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
