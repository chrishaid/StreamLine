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
  const { ui, setActiveView, toggleSidebar, setCurrentProcess, setCurrentBpmnXml, addProcess, setEditorMode, processes, currentProcess, currentOrganization } = useAppStore();
  const { sidebarCollapsed, activeView } = ui;
  const [allProcesses, setAllProcesses] = useState<Process[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const isOnTagsPage = location.pathname === '/tags';

  // Load processes for recent/favorites - refetch when organization changes
  useEffect(() => {
    loadProcesses();
  }, [currentOrganization?.id]);

  // Refresh when store processes change - filter by current organization
  useEffect(() => {
    if (processes.length > 0) {
      const filteredProcesses = processes.filter(p => {
        if (currentOrganization?.id) {
          return p.organizationId === currentOrganization.id;
        }
        return !p.organizationId; // Personal workspace = no org
      });
      setAllProcesses(filteredProcesses);
    }
  }, [processes, currentOrganization?.id]);

  const loadProcesses = async () => {
    setIsLoading(true);
    try {
      const { processes: fetchedProcesses } = await processApi.getAll({
        organizationId: currentOrganization?.id || null,
        limit: 100,
      });
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
        organizationId: currentOrganization?.id || null,
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
      <div className="w-16 border-r border-mist-300 bg-white flex flex-col items-center py-5 gap-2">
        <button
          onClick={toggleSidebar}
          className="p-2.5 hover:bg-mist rounded-lg transition-colors mb-3"
          title="Expand sidebar"
        >
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>

        <button
          onClick={handleNewProcess}
          className="p-3 bg-sage hover:bg-sage-600 rounded-xl transition-colors mb-5 shadow-soft"
          title="New Process"
        >
          <Plus className="w-5 h-5 text-white" />
        </button>

        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id as any)}
            className={clsx(
              'p-2.5 rounded-lg transition-colors',
              activeView === item.id && !isOnTagsPage
                ? 'bg-mist text-forest'
                : 'hover:bg-mist/50 text-slate-500'
            )}
            title={item.label}
          >
            <item.icon className="w-5 h-5" />
          </button>
        ))}

        <button
          onClick={() => navigate('/tags')}
          className={clsx(
            'p-2.5 rounded-lg transition-colors mt-3',
            isOnTagsPage
              ? 'bg-mist text-forest'
              : 'hover:bg-mist/50 text-slate-500'
          )}
          title="Manage Tags"
        >
          <Tag className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <aside className="w-72 border-r border-mist-300 bg-white flex flex-col">
      {/* Header with collapse button */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-mist">
        <span className="text-xs font-semibold text-stone uppercase tracking-wider">Navigation</span>
        <button
          onClick={toggleSidebar}
          className="p-2 hover:bg-mist rounded-lg transition-colors"
          title="Collapse sidebar"
        >
          <ChevronLeft className="w-4 h-4 text-stone" />
        </button>
      </div>

      {/* New Process Button */}
      <div className="p-5">
        <button
          onClick={handleNewProcess}
          className="w-full bg-sage hover:bg-sage-600 text-white px-5 py-3.5 rounded-xl transition-colors flex items-center justify-center gap-3 text-sm font-medium shadow-soft"
        >
          <Plus className="w-5 h-5" />
          New Process
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-5 overflow-y-auto">
        <div className="space-y-1 mb-5">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id as any)}
              className={clsx(
                'w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all text-sm',
                activeView === item.id && !isOnTagsPage
                  ? 'bg-mist text-forest font-medium shadow-inner-soft'
                  : 'hover:bg-mist/50 text-slate-600'
              )}
            >
              <item.icon className={clsx(
                'w-5 h-5',
                activeView === item.id && !isOnTagsPage ? 'text-sage' : 'text-stone'
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
              'w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all text-sm',
              isOnTagsPage
                ? 'bg-mist text-forest font-medium shadow-inner-soft'
                : 'hover:bg-mist/50 text-slate-600'
            )}
          >
            <Tag className={clsx(
              'w-5 h-5',
              isOnTagsPage ? 'text-sage' : 'text-stone'
            )} />
            <span>Manage Tags</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="border-t border-mist pt-5">
          {activeView === 'browse' && (
            <div>
              <h3 className="text-xs font-semibold text-stone uppercase tracking-wider mb-4 px-4">
                Processes
              </h3>
              <ProcessList />
            </div>
          )}

          {activeView === 'recent' && (
            <div>
              <h3 className="text-xs font-semibold text-stone uppercase tracking-wider mb-4 px-4">
                Recent
              </h3>
              {isLoading ? (
                <div className="px-4 py-6 text-center">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-mist-300 border-t-sage"></div>
                </div>
              ) : recentProcesses.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Clock className="w-10 h-10 text-mist-400 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">No recent processes</p>
                  <p className="text-xs text-stone mt-2">Open a process to see it here</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {recentProcesses.map((process) => (
                    <div
                      key={process.id}
                      onClick={() => handleProcessClick(process)}
                      className={clsx(
                        'group w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer text-left',
                        currentProcess?.id === process.id
                          ? 'bg-sage/10 ring-1 ring-sage/20 shadow-inner-soft'
                          : 'hover:bg-mist/50'
                      )}
                    >
                      <FileText className={clsx(
                        'w-5 h-5 flex-shrink-0',
                        currentProcess?.id === process.id ? 'text-sage' : 'text-stone'
                      )} />
                      <div className="flex-1 min-w-0">
                        <div className={clsx(
                          'text-sm truncate',
                          currentProcess?.id === process.id ? 'font-medium text-forest' : 'text-slate-700'
                        )}>
                          {process.name}
                        </div>
                        <div className="text-xs text-stone mt-1">
                          {new Date(process.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                      <button
                        onClick={(e) => toggleFavorite(e, process)}
                        className={clsx(
                          'p-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100',
                          process.isFavorite ? 'text-gold' : 'text-stone hover:text-gold'
                        )}
                        title={process.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        <Star className="w-4 h-4" fill={process.isFavorite ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeView === 'favorites' && (
            <div>
              <h3 className="text-xs font-semibold text-stone uppercase tracking-wider mb-4 px-4">
                Favorites
              </h3>
              {isLoading ? (
                <div className="px-4 py-6 text-center">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-mist-300 border-t-sage"></div>
                </div>
              ) : favoriteProcesses.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <StarOff className="w-10 h-10 text-mist-400 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">No favorites yet</p>
                  <p className="text-xs text-stone mt-2">Click the star on a process to add it</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {favoriteProcesses.map((process) => (
                    <div
                      key={process.id}
                      onClick={() => handleProcessClick(process)}
                      className={clsx(
                        'group w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all cursor-pointer text-left',
                        currentProcess?.id === process.id
                          ? 'bg-sage/10 ring-1 ring-sage/20 shadow-inner-soft'
                          : 'hover:bg-mist/50'
                      )}
                    >
                      <FileText className={clsx(
                        'w-5 h-5 flex-shrink-0',
                        currentProcess?.id === process.id ? 'text-sage' : 'text-stone'
                      )} />
                      <div className="flex-1 min-w-0">
                        <div className={clsx(
                          'text-sm truncate',
                          currentProcess?.id === process.id ? 'font-medium text-forest' : 'text-slate-700'
                        )}>
                          {process.name}
                        </div>
                      </div>
                      <button
                        onClick={(e) => toggleFavorite(e, process)}
                        className="p-1.5 rounded-lg text-gold hover:text-gold-600 transition-colors"
                        title="Remove from favorites"
                      >
                        <Star className="w-4 h-4" fill="currentColor" />
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
