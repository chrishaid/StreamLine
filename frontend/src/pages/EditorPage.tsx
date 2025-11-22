import { useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { BPMNViewer } from '../components/bpmn/BPMNViewer';
import { BPMNModeler } from '../components/bpmn/BPMNModeler';
import { ChatPanel } from '../components/chat/ChatPanel';
import { useAppStore } from '../store/useAppStore';
import { Edit, Eye } from 'lucide-react';

export function EditorPage() {
  const { editor, setEditorMode } = useAppStore();
  const [showChat, setShowChat] = useState(true);

  return (
    <MainLayout showChat={showChat}>
      <div className="flex-1 flex flex-col">
        {/* Mode Toggle */}
        <div className="h-12 border-b border-gray-200 bg-white flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditorMode('view')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                editor.mode === 'view'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Eye className="w-4 h-4" />
              View
            </button>
            <button
              onClick={() => setEditorMode('edit')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                editor.mode === 'edit'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
          </div>
          <div className="text-sm text-gray-600">
            New Process
          </div>
        </div>

        {/* BPMN Editor/Viewer */}
        <div className="flex-1">
          {editor.mode === 'edit' ? <BPMNModeler /> : <BPMNViewer />}
        </div>
      </div>

      {showChat && <ChatPanel />}
    </MainLayout>
  );
}
