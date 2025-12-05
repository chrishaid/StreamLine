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
      <div className="flex-1 flex flex-col m-4 rounded-xl overflow-hidden shadow-2xl">
        {/* Mode Toggle */}
        <div className="h-14 bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-between px-6 shadow-lg">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setEditorMode('view')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium ${
                editor.mode === 'view'
                  ? 'bg-white text-indigo-600 shadow-md'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              <Eye className="w-4 h-4" />
              View
            </button>
            <button
              onClick={() => setEditorMode('edit')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium ${
                editor.mode === 'edit'
                  ? 'bg-white text-purple-600 shadow-md'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
          </div>
          <div className="text-sm text-white font-medium">
            New Process
          </div>
        </div>

        {/* BPMN Editor/Viewer */}
        <div className="flex-1 bg-white">
          {editor.mode === 'edit' ? <BPMNModeler /> : <BPMNViewer />}
        </div>
      </div>

      {showChat && <ChatPanel />}
    </MainLayout>
  );
}
