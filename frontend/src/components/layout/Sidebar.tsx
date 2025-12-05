import { Folder, Clock, Star, Plus, ChevronRight } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { clsx } from 'clsx';
import { ProcessList } from '../process/ProcessList';
import { processApi } from '../../services/api';
import { useNavigate } from 'react-router-dom';

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
  const { ui, setActiveView, toggleSidebar, setCurrentProcess, setCurrentBpmnXml, addProcess, setEditorMode } = useAppStore();
  const { sidebarCollapsed, activeView } = ui;

  const handleNewProcess = async () => {
    try {
      // Create new process in database
      const { process } = await processApi.create({
        name: 'Untitled Process',
        bpmnXml: EMPTY_BPMN,
        description: 'New process',
      });

      // Set as current process
      setCurrentProcess(process);
      setCurrentBpmnXml(EMPTY_BPMN);

      // Add to process list
      addProcess(process);

      // Set to edit mode
      setEditorMode('edit');

      // Navigate to editor
      navigate('/editor');
    } catch (error) {
      console.error('Failed to create new process:', error);
    }
  };

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
        <button
          onClick={handleNewProcess}
          className="w-full bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New Process
        </button>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-2 mb-6">
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
            <span>All Processes</span>
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

        {activeView === 'browse' && (
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-3">
              Processes
            </h3>
            <ProcessList />
          </div>
        )}

        {activeView === 'recent' && (
          <div className="px-3 py-8 text-center text-gray-500 text-sm">
            Recent processes will appear here
          </div>
        )}

        {activeView === 'favorites' && (
          <div className="px-3 py-8 text-center text-gray-500 text-sm">
            Favorite processes will appear here
          </div>
        )}
      </nav>
    </aside>
  );
}
