import { Search, User, Settings, Plus, FileText } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { processApi } from '../../services/api';

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

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentProcess, setCurrentProcess, setCurrentBpmnXml, addProcess, setEditorMode } = useAppStore();

  const isEditorPage = location.pathname === '/editor';

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

      // If not on editor page, navigate there
      if (!isEditorPage) {
        navigate('/editor');
      }
    } catch (error) {
      console.error('Failed to create new process:', error);
    }
  };

  return (
    <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-6">
      <div className="flex items-center gap-6">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-4 hover:opacity-80 transition-opacity"
        >
          <h1 className="text-2xl font-bold text-primary">StreamLine</h1>
          <span className="text-sm text-gray-500">BPMN Process Hub</span>
        </button>

        {isEditorPage && (
          <div className="flex items-center gap-3 pl-6 border-l border-gray-200">
            {currentProcess ? (
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">
                  {currentProcess.name}
                </span>
              </div>
            ) : (
              <span className="text-sm text-gray-500 italic">Untitled Process</span>
            )}
            <button
              onClick={handleNewProcess}
              className="ml-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-1.5"
              title="New Process"
            >
              <Plus className="w-4 h-4" />
              New
            </button>
          </div>
        )}
      </div>

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
