import { useState, useEffect } from 'react';
import { Plus, Upload, Clock, Star, TrendingUp, Search, Grid, List } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { useAppStore } from '../store/useAppStore';
import { ProcessCard } from '../components/process/ProcessCard';
import { processApi } from '../services/api';
import type { Process } from '../types';

export function HomePage() {
  const navigate = useNavigate();
  const { setCurrentBpmnXml, setCurrentProcess, clearChat } = useAppStore();

  const [processes, setProcesses] = useState<Process[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    fetchProcesses();
  }, []);

  const fetchProcesses = async () => {
    setIsLoading(true);
    try {
      const response = await processApi.getAll({
        limit: 100,
      });
      setProcesses(response.processes);
    } catch (error) {
      console.error('Failed to fetch processes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNewProcess = () => {
    // Clear any existing process data
    setCurrentBpmnXml(null);
    setCurrentProcess(null);
    clearChat();

    // Navigate to editor
    navigate('/editor');
  };

  const handleUploadFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.bpmn,.bpmn20.xml,.xml';
    input.onchange = async (e: any) => {
      const file = e.target?.files?.[0];
      if (file) {
        try {
          const text = await file.text();
          setCurrentBpmnXml(text);
          setCurrentProcess(null);
          clearChat();
          navigate('/editor');
        } catch (error) {
          console.error('Failed to load file:', error);
          alert('Failed to load BPMN file. Please check the file format.');
        }
      }
    };
    input.click();
  };

  // Filter processes based on search and status
  const filteredProcesses = processes.filter((process) => {
    const matchesSearch =
      searchQuery === '' ||
      process.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      process.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      process.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || process.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: processes.length,
    active: processes.filter((p) => p.status === 'active').length,
    favorites: processes.filter((p) => p.isFavorite).length,
  };

  return (
    <MainLayout>
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Process Library</h1>
            <p className="text-lg text-gray-600">
              Manage and explore your business process diagrams
            </p>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <button
              onClick={handleCreateNewProcess}
              className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-6 hover:border-primary transition-colors group text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center group-hover:bg-primary-200">
                  <Plus className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Create New Process</h3>
                  <p className="text-sm text-gray-600">Start with AI or blank canvas</p>
                </div>
              </div>
            </button>

            <button
              onClick={handleUploadFile}
              className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-6 hover:border-primary transition-colors group text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center group-hover:bg-primary-200">
                  <Upload className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Upload BPMN File</h3>
                  <p className="text-sm text-gray-600">Import existing diagram</p>
                </div>
              </div>
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Processes</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
                </div>
                <Star className="w-8 h-8 text-yellow-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Favorites</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.favorites}</p>
                </div>
                <Star className="w-8 h-8 text-primary" />
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
            <div className="flex items-center gap-4 flex-wrap">
              {/* Search */}
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search processes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>

              {/* View Mode Toggle */}
              <div className="flex gap-1 border border-gray-300 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded ${
                    viewMode === 'grid'
                      ? 'bg-primary text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Grid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded ${
                    viewMode === 'list'
                      ? 'bg-primary text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Process Grid */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="mt-4 text-gray-600">Loading processes...</p>
            </div>
          ) : filteredProcesses.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <Clock className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-600 mb-2">
                {searchQuery || statusFilter !== 'all'
                  ? 'No processes match your filters'
                  : 'No processes yet'}
              </p>
              <p className="text-sm text-gray-500">
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Create your first process to get started'}
              </p>
            </div>
          ) : (
            <div
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                  : 'flex flex-col gap-4'
              }
            >
              {filteredProcesses.map((process) => (
                <ProcessCard key={process.id} process={process} onUpdate={fetchProcesses} />
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
