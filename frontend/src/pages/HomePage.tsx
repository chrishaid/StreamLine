import { useState, useEffect } from 'react';
import { Plus, Upload, Clock, Star, TrendingUp, Grid, List, X, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { useAppStore } from '../store/useAppStore';
import { ProcessCard } from '../components/process/ProcessCard';
import { processApi } from '../services/api';
import { getAllTagsWithColors } from '../utils/tagColors';
import type { Process } from '../types';

export function HomePage() {
  const navigate = useNavigate();
  const { setCurrentBpmnXml, setCurrentProcess, clearChat, addProcess, currentOrganization } = useAppStore();

  const [processes, setProcesses] = useState<Process[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showAllTags, setShowAllTags] = useState(false);

  // Refetch processes when organization changes
  useEffect(() => {
    fetchProcesses();
  }, [currentOrganization?.id]);

  const fetchProcesses = async () => {
    setIsLoading(true);
    try {
      // Filter by current organization (null = personal workspace)
      const response = await processApi.getAll({
        organizationId: currentOrganization?.id || null,
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

          // Create a process immediately with the file name
          const fileName = file.name.replace(/\.(bpmn|xml|bpmn20\.xml)$/i, '');
          console.log('[HomePage] Creating process for uploaded file:', fileName);

          const { process } = await processApi.create({
            name: fileName || 'Uploaded Process',
            description: `Uploaded from ${file.name}`,
            tags: ['uploaded'],
            primaryCategoryId: '',
            bpmnXml: text,
            organizationId: currentOrganization?.id || null,
          });

          console.log('[HomePage] Process created:', process.id);
          setCurrentBpmnXml(text);
          setCurrentProcess(process);
          addProcess(process); // Add to store so sidebar updates
          setProcesses((prev) => [process, ...prev]); // Add to local state for immediate UI update
          clearChat();

          // Navigate to the editor with the new process ID
          navigate(`/editor/${process.id}`);
        } catch (error: any) {
          console.error('Failed to upload file:', error);
          alert(`Failed to upload BPMN file: ${error?.message || 'Unknown error'}`);
        }
      }
    };
    input.click();
  };

  // Handle tag click from ProcessCard
  const handleTagClick = (tag: string) => {
    setSelectedTag(tag === selectedTag ? null : tag);
  };

  // Get all unique tags with their colors
  const allTags = getAllTagsWithColors(processes);
  const displayedTags = showAllTags ? allTags : allTags.slice(0, 8);

  // Filter processes based on search, status, and tag
  const filteredProcesses = processes.filter((process) => {
    const matchesSearch =
      searchQuery === '' ||
      process.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      process.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      process.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || process.status === statusFilter;

    const matchesTag = selectedTag === null || process.tags.includes(selectedTag);

    return matchesSearch && matchesStatus && matchesTag;
  });

  const stats = {
    total: processes.length,
    active: processes.filter((p) => p.status === 'active').length,
    favorites: processes.filter((p) => p.isFavorite).length,
  };

  return (
    <MainLayout>
      <div className="flex-1 overflow-y-auto p-10">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-slate-800 mb-2">Process Library</h1>
            <p className="text-sm text-slate-500">
              Manage and explore your business process diagrams
            </p>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
            <button
              onClick={handleCreateNewProcess}
              className="bg-gradient-to-r from-sage to-sage-600 rounded-2xl p-6 hover:from-sage-600 hover:to-sage-700 transition-all group text-left shadow-soft hover:shadow-soft-lg transform hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors">
                  <Plus className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-base">Create New Process</h3>
                  <p className="text-sm text-white/80 mt-1">Start with AI or blank canvas</p>
                </div>
              </div>
            </button>

            <button
              onClick={handleUploadFile}
              className="bg-white rounded-2xl border-2 border-mist-300 p-6 hover:border-sage hover:bg-sage/5 transition-all group text-left shadow-soft hover:shadow-soft-lg transform hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-mist rounded-xl flex items-center justify-center group-hover:bg-sage/10 transition-colors">
                  <Upload className="w-7 h-7 text-slate-600 group-hover:text-sage" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 text-base">Upload BPMN File</h3>
                  <p className="text-sm text-slate-500 mt-1">Import existing diagram</p>
                </div>
              </div>
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            <div className="bg-white rounded-2xl border border-mist-300 p-5 shadow-soft">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Total Processes</p>
                  <p className="text-2xl font-semibold text-slate-800">{stats.total}</p>
                </div>
                <div className="w-11 h-11 bg-mist rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-slate-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-mist-300 p-5 shadow-soft">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Active</p>
                  <p className="text-2xl font-semibold text-slate-800">{stats.active}</p>
                </div>
                <div className="w-11 h-11 bg-sage/10 rounded-xl flex items-center justify-center">
                  <Star className="w-5 h-5 text-sage" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-mist-300 p-5 shadow-soft">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Favorites</p>
                  <p className="text-2xl font-semibold text-slate-800">{stats.favorites}</p>
                </div>
                <div className="w-11 h-11 bg-gold/10 rounded-xl flex items-center justify-center">
                  <Star className="w-5 h-5 text-gold" />
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-2xl border border-mist-300 p-5 mb-6 shadow-soft">
            <div className="flex items-center gap-4 flex-wrap">
              {/* Search */}
              <div className="flex-1 min-w-[200px]">
                <input
                  type="text"
                  placeholder="Search processes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-5 py-3 text-sm border border-mist-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage/20 focus:border-sage transition-all"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3 text-sm border border-mist-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage/20 focus:border-sage transition-all"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>

              {/* View Mode Toggle */}
              <div className="flex gap-1 border border-mist-300 rounded-xl p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2.5 rounded-lg transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-mist text-slate-700'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2.5 rounded-lg transition-colors ${
                    viewMode === 'list'
                      ? 'bg-mist text-slate-700'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Tag Filter Section */}
          {allTags.length > 0 && (
            <div className="bg-white rounded-2xl border border-mist-300 p-5 mb-6 shadow-soft">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mr-2">
                  <Tag className="w-4 h-4" />
                  <span>Tags:</span>
                </div>
                {selectedTag && (
                  <button
                    onClick={() => setSelectedTag(null)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 text-xs rounded-full hover:bg-slate-200 transition-colors"
                  >
                    <X className="w-3 h-3" />
                    Clear filter
                  </button>
                )}
                {displayedTags.map(({ tag, color, count }) => (
                  <button
                    key={tag}
                    onClick={() => handleTagClick(tag)}
                    className={`px-3 py-1.5 text-xs rounded-full transition-all ${
                      selectedTag === tag
                        ? `${color.bg} ${color.text} ring-2 ring-offset-1 ${color.border}`
                        : `${color.bg} ${color.text} hover:ring-1 hover:ring-offset-1 ${color.border}`
                    }`}
                  >
                    {tag}
                    <span className="ml-1.5 opacity-60">({count})</span>
                  </button>
                ))}
                {allTags.length > 8 && (
                  <button
                    onClick={() => setShowAllTags(!showAllTags)}
                    className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    {showAllTags ? 'Show less' : `+${allTags.length - 8} more`}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Process Grid */}
          {isLoading ? (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-mist-300 border-t-sage"></div>
              <p className="mt-4 text-sm text-slate-500">Loading processes...</p>
            </div>
          ) : filteredProcesses.length === 0 ? (
            <div className="bg-white rounded-2xl border border-mist-300 p-12 text-center shadow-soft">
              <Clock className="w-12 h-12 mx-auto mb-4 text-mist-400" />
              <p className="text-sm text-slate-600 mb-2">
                {searchQuery || statusFilter !== 'all' || selectedTag
                  ? 'No processes match your filters'
                  : 'No processes yet'}
              </p>
              <p className="text-xs text-slate-400">
                {searchQuery || statusFilter !== 'all' || selectedTag
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
                <ProcessCard
                  key={process.id}
                  process={process}
                  onUpdate={fetchProcesses}
                  onTagClick={handleTagClick}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
