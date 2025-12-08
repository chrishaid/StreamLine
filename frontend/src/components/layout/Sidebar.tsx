import { useState, useEffect } from 'react';
import { Folder, Clock, Star, Plus, ChevronRight, ChevronLeft, FileText, StarOff, Tag } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { clsx } from 'clsx';
import { ProcessList } from '../process/ProcessList';
import { processApi } from '../../services/api';
import { useNavigate, useLocation } from 'react-router-dom';
import type { Process } from '../../types';

const EMPTY_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1"/>
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_1" bpmnElement="StartEvent_1">
        <dc:Bounds x="179" y="159" width="36" height="36"/>
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { ui, setActiveView, toggleSidebar, setCurrentProcess, setCurrentBpmnXml, addProcess, setEditorMode, processes, currentProcess } = useAppStore();
  const { sidebarCollapsed, activeView } = ui;
  const [allProcesses, setAllProcesses] = useState<Process[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const isOnTagsPage = location.pathname === '/tags';

  // Load processes for recent/favorites
  useEffect(() => {
    loadProcesses();
  }, []);

  // Refresh when store processes change
  useEffect(() => {
    if (processes.length > 0) {
      setAllProcesses(processes);
    }
  }, [processes]);

  const loadProcesses = async () => {
    setIsLoading(true);
    try {
      const { processes: fetchedProcesses } = await processApi.getAll({ limit: 100 });
      setAllProcesses(fetchedProcesses);
    } catch (error) {
      console.error('Failed to load processes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get recent processes (sorted by updatedAt, last 5)
  const recentProcesses = [...allProcesses]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  // Get favorite processes
  const favoriteProcesses = allProcesses.filter(p => p.isFavorite);

  const handleProcessClick = async (process: Process) => {
    try {
      const fullProcess = await processApi.getById(process.id);
      setCurrentProcess(fullProcess);
      const currentVersion = await processApi.getCurrentVersion(process.id);
      if (currentVersion?.bpmn_xml) {
        setCurrentBpmnXml(currentVersion.bpmn_xml);
      }
      navigate(`/editor/${process.id}`);
    } catch (error) {
      console.error('Failed to load process:', error);
    }
  };

  const toggleFavorite = async (e: React.MouseEvent, process: Process) => {
    e.stopPropagation();
    try {
      await processApi.update(process.id, { isFavorite: !process.isFavorite } as any);
      setAllProcesses(prev => prev.map(p =>
        p.id === process.id ? { ...p, isFavorite: !p.isFavorite } : p
      ));
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const handleNewProcess = async () => {
    try {
      const { process } = await processApi.create({
        name: 'Untitled Process',
        bpmnXml: EMPTY_BPMN,
        description: 'New process',
        primaryCategoryId: '',
      });

      setCurrentProcess(process);
      setCurrentBpmnXml(EMPTY_BPMN);
      addProcess(process);
      setEditorMode('edit');
      navigate('/editor');
    } catch (error) {
      console.error('Failed to create new process:', error);
    }
  };

  const navItems = [
    { id: 'browse', label: 'All Processes', icon: Folder },
    { id: 'recent', label: 'Recent', icon: Clock },
    { id: 'favorites', label: 'Favorites', icon: Star },
  ];

  if (sidebarCollapsed) {
    return (
      <div className="w-14 border-r border-slate-200 bg-white flex flex-col items-center py-3 gap-1">
        <button
          onClick={toggleSidebar}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors mb-2"
          title="Expand sidebar"
        >
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>

        <button
          onClick={handleNewProcess}
          className="p-2.5 bg-accent hover:bg-accent-700 rounded-lg transition-colors mb-4"
          title="New Process"
        >
          <Plus className="w-4 h-4 text-white" />
        </button>

        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id as any)}
            className={clsx(
              'p-2 rounded-lg transition-colors',
              activeView === item.id && !isOnTagsPage
                ? 'bg-slate-100 text-slate-800'
                : 'hover:bg-slate-50 text-slate-500'
            )}
            title={item.label}
          >
            <item.icon className="w-4 h-4" />
          </button>
        ))}

        <button
          onClick={() => navigate('/tags')}
          className={clsx(
            'p-2 rounded-lg transition-colors mt-2',
            isOnTagsPage
              ? 'bg-slate-100 text-slate-800'
              : 'hover:bg-slate-50 text-slate-500'
          )}
          title="Manage Tags"
        >
          <Tag className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <aside className="w-60 border-r border-slate-200 bg-white flex flex-col">
      {/* Header with collapse button */}
      <div className="h-14 px-3 flex items-center justify-between border-b border-slate-100">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Navigation</span>
        <button
          onClick={toggleSidebar}
          className="p-1.5 hover:bg-slate-100 rounded-md transition-colors"
          title="Collapse sidebar"
        >
          <ChevronLeft className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* New Process Button */}
      <div className="p-4">
        <button
          onClick={handleNewProcess}
          className="w-full bg-accent hover:bg-accent-700 text-white px-4 py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Process
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 overflow-y-auto">
        <div className="space-y-0.5 mb-4">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id as any)}
              className={clsx(
                'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm',
                activeView === item.id && !isOnTagsPage
                  ? 'bg-slate-100 text-slate-800 font-medium'
                  : 'hover:bg-slate-50 text-slate-600'
              )}
            >
              <item.icon className={clsx(
                'w-4 h-4',
                activeView === item.id && !isOnTagsPage ? 'text-accent' : 'text-slate-400'
              )} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Manage Tags Link */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/tags')}
            className={clsx(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm',
              isOnTagsPage
                ? 'bg-slate-100 text-slate-800 font-medium'
                : 'hover:bg-slate-50 text-slate-600'
            )}
          >
            <Tag className={clsx(
              'w-4 h-4',
              isOnTagsPage ? 'text-accent' : 'text-slate-400'
            )} />
            <span>Manage Tags</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="border-t border-slate-100 pt-4">
          {activeView === 'browse' && (
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-3">
                Processes
              </h3>
              <ProcessList />
            </div>
          )}

          {activeView === 'recent' && (
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-3">
                Recent
              </h3>
              {isLoading ? (
                <div className="px-3 py-4 text-center">
                  <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-slate-200 border-t-accent"></div>
                </div>
              ) : recentProcesses.length === 0 ? (
                <div className="px-3 py-6 text-center">
                  <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No recent processes</p>
                  <p className="text-xs text-slate-400 mt-1">Open a process to see it here</p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {recentProcesses.map((process) => (
                    <div
                      key={process.id}
                      onClick={() => handleProcessClick(process)}
                      className={clsx(
                        'group w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all cursor-pointer text-left',
                        currentProcess?.id === process.id
                          ? 'bg-accent/10 ring-1 ring-accent/20'
                          : 'hover:bg-slate-50'
                      )}
                    >
                      <FileText className={clsx(
                        'w-4 h-4 flex-shrink-0',
                        currentProcess?.id === process.id ? 'text-accent' : 'text-slate-400'
                      )} />
                      <div className="flex-1 min-w-0">
                        <div className={clsx(
                          'text-sm truncate',
                          currentProcess?.id === process.id ? 'font-medium text-slate-800' : 'text-slate-700'
                        )}>
                          {process.name}
                        </div>
                        <div className="text-xs text-slate-400">
                          {new Date(process.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                      <button
                        onClick={(e) => toggleFavorite(e, process)}
                        className={clsx(
                          'p-1 rounded-md transition-colors opacity-0 group-hover:opacity-100',
                          process.isFavorite ? 'text-amber-500' : 'text-slate-400 hover:text-amber-500'
                        )}
                        title={process.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        <Star className="w-3.5 h-3.5" fill={process.isFavorite ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeView === 'favorites' && (
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-3">
                Favorites
              </h3>
              {isLoading ? (
                <div className="px-3 py-4 text-center">
                  <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-slate-200 border-t-accent"></div>
                </div>
              ) : favoriteProcesses.length === 0 ? (
                <div className="px-3 py-6 text-center">
                  <StarOff className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No favorites yet</p>
                  <p className="text-xs text-slate-400 mt-1">Click the star on a process to add it</p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {favoriteProcesses.map((process) => (
                    <div
                      key={process.id}
                      onClick={() => handleProcessClick(process)}
                      className={clsx(
                        'group w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all cursor-pointer text-left',
                        currentProcess?.id === process.id
                          ? 'bg-accent/10 ring-1 ring-accent/20'
                          : 'hover:bg-slate-50'
                      )}
                    >
                      <FileText className={clsx(
                        'w-4 h-4 flex-shrink-0',
                        currentProcess?.id === process.id ? 'text-accent' : 'text-slate-400'
                      )} />
                      <div className="flex-1 min-w-0">
                        <div className={clsx(
                          'text-sm truncate',
                          currentProcess?.id === process.id ? 'font-medium text-slate-800' : 'text-slate-700'
                        )}>
                          {process.name}
                        </div>
                      </div>
                      <button
                        onClick={(e) => toggleFavorite(e, process)}
                        className="p-1 rounded-md text-amber-500 hover:text-amber-600 transition-colors"
                        title="Remove from favorites"
                      >
                        <Star className="w-3.5 h-3.5" fill="currentColor" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </nav>
    </aside>
  );
}
