import { Search, User, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Header() {
  const navigate = useNavigate();

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
        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <User className="w-5 h-5 text-gray-600" />
        </button>
      </div>
    </header>
  );
}
