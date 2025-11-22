import { Folder, Clock, Star, Plus, ChevronRight } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { clsx } from 'clsx';

export function Sidebar() {
  const { ui, setActiveView, toggleSidebar } = useAppStore();
  const { sidebarCollapsed, activeView } = ui;

  if (sidebarCollapsed) {
    return (
      <div className="w-16 border-r border-gray-200 bg-gray-50 flex flex-col items-center py-4 gap-4">
        <button
          onClick={toggleSidebar}
          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
        <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
          <Folder className="w-5 h-5" />
        </button>
        <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
          <Clock className="w-5 h-5" />
        </button>
        <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
          <Star className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <aside className="w-64 border-r border-gray-200 bg-gray-50 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <button className="w-full bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition-colors flex items-center justify-center gap-2">
          <Plus className="w-5 h-5" />
          New Process
        </button>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-2">
          <button
            onClick={() => setActiveView('browse')}
            className={clsx(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
              activeView === 'browse'
                ? 'bg-primary text-white'
                : 'hover:bg-gray-200 text-gray-700'
            )}
          >
            <Folder className="w-5 h-5" />
            <span>Browse</span>
          </button>

          <button
            onClick={() => setActiveView('recent')}
            className={clsx(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
              activeView === 'recent'
                ? 'bg-primary text-white'
                : 'hover:bg-gray-200 text-gray-700'
            )}
          >
            <Clock className="w-5 h-5" />
            <span>Recent</span>
          </button>

          <button
            onClick={() => setActiveView('favorites')}
            className={clsx(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
              activeView === 'favorites'
                ? 'bg-primary text-white'
                : 'hover:bg-gray-200 text-gray-700'
            )}
          >
            <Star className="w-5 h-5" />
            <span>Favorites</span>
          </button>
        </div>

        <div className="mt-8">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">
            Categories
          </h3>
          <div className="space-y-1">
            <div className="px-3 py-2 text-gray-600 text-sm">
              No categories yet
            </div>
          </div>
        </div>
      </nav>
    </aside>
  );
}
