import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { BPMNViewer } from '../components/bpmn/BPMNViewer';
import { BPMNModeler } from '../components/bpmn/BPMNModeler';
import { ChatPanel } from '../components/chat/ChatPanel';
import { useAppStore } from '../store/useAppStore';
import { processApi } from '../services/api';
import { Edit, Eye, Save, Settings, ArrowLeft, CheckCircle } from 'lucide-react';
import type { Process } from '../types';

export function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { editor, setEditorMode, currentBpmnXml, setCurrentBpmnXml, currentProcess, setCurrentProcess } = useAppStore();
  const [showChat] = useState(true);
  const [showMetadata, setShowMetadata] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [processData, setProcessData] = useState<Partial<Process>>({
    name: '',
    description: '',
    status: 'draft',
    tags: [],
    primaryCategoryId: '',
  });
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load existing process if ID provided
  useEffect(() => {
    if (id) {
      loadProcess(id);
    }
  }, [id]);

  // Auto-save when BPMN changes
  useEffect(() => {
    if (currentBpmnXml && (currentProcess || processData.name)) {
      // Clear existing timer
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      // Set new timer for auto-save (5 seconds after last change)
      autoSaveTimerRef.current = setTimeout(() => {
        if (currentProcess || id) {
          handleAutoSave();
        }
      }, 5000);
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [currentBpmnXml]);

  const loadProcess = async (processId: string) => {
    try {
      const process = await processApi.getById(processId);
      const version = await processApi.getCurrentVersion(processId);

      setCurrentProcess(process);
      setCurrentBpmnXml(version.bpmnXml);
      setProcessData({
        name: process.name,
        description: process.description,
        status: process.status,
        tags: process.tags,
        primaryCategoryId: process.primaryCategoryId,
      });
      setLastSaved(new Date(process.updatedAt));
    } catch (error) {
      console.error('Failed to load process:', error);
      alert('Failed to load process');
      navigate('/');
    }
  };

  const handleAutoSave = async () => {
    if (!currentBpmnXml || !currentProcess) return;

    try {
      await processApi.update(currentProcess.id, {
        // Only update BPMN via version endpoint if needed
      });

      // Create new version if BPMN changed significantly
      // For now, we'll just update the process metadata
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  };

  const handleSave = async () => {
    if (!processData.name?.trim()) {
      alert('Please enter a process name');
      setShowMetadata(true);
      return;
    }

    setIsSaving(true);
    try {
      if (currentProcess || id) {
        // Update existing process
        const processId = currentProcess?.id || id!;
        const updated = await processApi.update(processId, {
          name: processData.name,
          description: processData.description,
          status: processData.status,
          tags: processData.tags,
        });

        // Create new version if BPMN changed
        if (currentBpmnXml) {
          await processApi.createVersion(processId, {
            bpmnXml: currentBpmnXml,
            changeSummary: 'Updated via editor',
            changeType: 'minor',
          });
        }

        setCurrentProcess(updated);
        setLastSaved(new Date());
        alert('Process saved successfully!');
      } else {
        // Create new process
        const { process } = await processApi.create({
          name: processData.name,
          description: processData.description,
          tags: processData.tags,
          primaryCategoryId: processData.primaryCategoryId || '',
          bpmnXml: currentBpmnXml || '',
        });

        setCurrentProcess(process);
        setLastSaved(new Date());
        alert('Process created successfully!');
        // Navigate to edit mode for this process
        navigate(`/editor/${process.id}`, { replace: true });
      }
    } catch (error) {
      console.error('Failed to save process:', error);
      alert('Failed to save process');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTagInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
      const newTag = e.currentTarget.value.trim();
      if (!processData.tags?.includes(newTag)) {
        setProcessData({
          ...processData,
          tags: [...(processData.tags || []), newTag],
        });
      }
      e.currentTarget.value = '';
    }
  };

  const removeTag = (tagToRemove: string) => {
    setProcessData({
      ...processData,
      tags: processData.tags?.filter((tag) => tag !== tagToRemove) || [],
    });
  };

  return (
    <MainLayout showChat={showChat}>
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="h-12 border-b border-gray-200 bg-white flex items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <div className="h-6 w-px bg-gray-300"></div>

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

          <div className="flex items-center gap-4">
            {lastSaved && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Saved {new Date(lastSaved).toLocaleTimeString()}
              </div>
            )}
            <button
              onClick={() => setShowMetadata(!showMetadata)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-primary text-white hover:bg-primary-600 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {/* Metadata Panel */}
        {showMetadata && (
          <div className="border-b border-gray-200 bg-gray-50 p-4">
            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Process Name *
                </label>
                <input
                  type="text"
                  value={processData.name}
                  onChange={(e) => setProcessData({ ...processData, name: e.target.value })}
                  placeholder="Enter process name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={processData.status}
                  onChange={(e) =>
                    setProcessData({
                      ...processData,
                      status: e.target.value as 'draft' | 'active' | 'archived',
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={processData.description}
                  onChange={(e) =>
                    setProcessData({ ...processData, description: e.target.value })
                  }
                  placeholder="Enter process description"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags (press Enter to add)
                </label>
                <input
                  type="text"
                  onKeyDown={handleTagInput}
                  placeholder="Add tags..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {processData.tags && processData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {processData.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-2"
                      >
                        {tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="hover:text-blue-900"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* BPMN Editor/Viewer */}
        <div className="flex-1">
          {editor.mode === 'edit' ? <BPMNModeler /> : <BPMNViewer />}
        </div>
      </div>

      {showChat && <ChatPanel />}
    </MainLayout>
  );
}
