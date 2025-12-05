import { useEffect, useState } from 'react';
import { FileText, Trash2, Edit2, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { processApi } from '../../services/api';
import { Process } from '../../types';

export function ProcessList() {
  const navigate = useNavigate();
  const { processes, setProcesses, deleteProcess: deleteFromStore, currentProcess, setCurrentProcess, setCurrentBpmnXml } = useAppStore();
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Load processes on mount
  useEffect(() => {
    loadProcesses();
  }, []);

  const loadProcesses = async () => {
    setIsLoading(true);
    try {
      const { processes: fetchedProcesses } = await processApi.getAll();
      setProcesses(fetchedProcesses);
    } catch (error) {
      console.error('Failed to load processes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadProcess = async (process: Process) => {
    try {
      // Fetch full process data
      const fullProcess = await processApi.getById(process.id);
      setCurrentProcess(fullProcess);

      // Load BPMN XML from the current version
      const currentVersion = await processApi.getCurrentVersion(process.id);
      if (currentVersion?.bpmnXml) {
        setCurrentBpmnXml(currentVersion.bpmnXml);
      }

      // Navigate to editor page
      navigate('/editor');
    } catch (error) {
      console.error('Failed to load process:', error);
    }
  };

  const handleStartEdit = (process: Process) => {
    setEditingId(process.id);
    setEditName(process.name);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleSaveEdit = async (processId: string) => {
    if (!editName.trim()) return;

    try {
      const processToUpdate = processes.find(p => p.id === processId);
      if (!processToUpdate) return;

      await processApi.update(processId, {
        name: editName.trim(),
        description: processToUpdate.description || undefined,
      });

      // Reload processes to get updated data
      await loadProcesses();
      setEditingId(null);
      setEditName('');

      // If this is the current process, update it
      if (currentProcess?.id === processId) {
        const updatedProcess = await processApi.getById(processId);
        setCurrentProcess(updatedProcess);
      }
    } catch (error) {
      console.error('Failed to rename process:', error);
    }
  };

  const handleDeleteClick = (processId: string) => {
    setDeleteConfirm(processId);
  };

  const handleConfirmDelete = async (processId: string) => {
    try {
      await processApi.delete(processId);
      deleteFromStore(processId);
      setDeleteConfirm(null);

      // If deleted process was current, clear editor
      if (currentProcess?.id === processId) {
        setCurrentProcess(null);
        setCurrentBpmnXml(null);
      }
    } catch (error) {
      console.error('Failed to delete process:', error);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirm(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (processes.length === 0) {
    return (
      <div className="px-3 py-8 text-center text-gray-500 text-sm">
        <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No processes yet</p>
        <p className="text-xs mt-1">Create your first process to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {processes.map((process) => (
        <div
          key={process.id}
          className={`group relative rounded-lg transition-colors ${
            currentProcess?.id === process.id
              ? 'bg-primary/10 border border-primary/20'
              : 'hover:bg-gray-100'
          }`}
        >
          {editingId === process.id ? (
            // Edit mode
            <div className="px-3 py-2">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveEdit(process.id);
                  if (e.key === 'Escape') handleCancelEdit();
                }}
                className="w-full px-2 py-1 text-sm border border-primary rounded focus:outline-none focus:ring-2 focus:ring-primary/50"
                autoFocus
                onBlur={() => handleSaveEdit(process.id)}
              />
            </div>
          ) : deleteConfirm === process.id ? (
            // Delete confirmation
            <div className="px-3 py-2 bg-red-50">
              <p className="text-xs text-red-800 mb-2">Delete this process?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleConfirmDelete(process.id)}
                  className="flex-1 px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Delete
                </button>
                <button
                  onClick={handleCancelDelete}
                  className="flex-1 px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            // Normal mode
            <button
              onClick={() => handleLoadProcess(process)}
              className="w-full px-3 py-2 flex items-start gap-3 text-left"
            >
              <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {process.name}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Updated {new Date(process.updatedAt).toLocaleDateString()}
                </div>
              </div>
              <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartEdit(process);
                  }}
                  className="p-1 hover:bg-gray-200 rounded"
                  title="Rename"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClick(process.id);
                  }}
                  className="p-1 hover:bg-red-100 text-red-600 rounded"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
