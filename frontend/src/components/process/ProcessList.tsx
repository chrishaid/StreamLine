import { useEffect, useState } from 'react';
import { FileText, Trash2, Edit2, Loader2, MoreHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { processApi } from '../../services/api';
import { Process } from '../../types';
import { clsx } from 'clsx';

export function ProcessList() {
  const navigate = useNavigate();
  const { processes, setProcesses, deleteProcess: deleteFromStore, currentProcess, setCurrentProcess, setCurrentBpmnXml } = useAppStore();
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

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

  const handleStartEdit = (e: React.MouseEvent, process: Process) => {
    e.stopPropagation();
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

      await loadProcesses();
      setEditingId(null);
      setEditName('');

      if (currentProcess?.id === processId) {
        const updatedProcess = await processApi.getById(processId);
        setCurrentProcess(updatedProcess);
      }
    } catch (error) {
      console.error('Failed to rename process:', error);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, processId: string) => {
    e.stopPropagation();
    setDeleteConfirm(processId);
  };

  const handleConfirmDelete = async (processId: string) => {
    try {
      await processApi.delete(processId);
      deleteFromStore(processId);
      setDeleteConfirm(null);

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
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (processes.length === 0) {
    return (
      <div className="px-3 py-8 text-center">
        <FileText className="w-10 h-10 mx-auto mb-3 text-slate-300" />
        <p className="text-sm text-slate-500">No processes yet</p>
        <p className="text-xs text-slate-400 mt-1">Create your first one</p>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {processes.map((process) => (
        <div
          key={process.id}
          className={clsx(
            'group relative rounded-lg transition-all',
            currentProcess?.id === process.id
              ? 'bg-accent/10 ring-1 ring-accent/20'
              : 'hover:bg-slate-50'
          )}
        >
          {editingId === process.id ? (
            <div className="px-3 py-2">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveEdit(process.id);
                  if (e.key === 'Escape') handleCancelEdit();
                }}
                className="w-full px-2 py-1 text-sm bg-white border border-accent rounded-md focus:outline-none focus:ring-2 focus:ring-accent/30"
                autoFocus
                onBlur={() => handleSaveEdit(process.id)}
              />
            </div>
          ) : deleteConfirm === process.id ? (
            <div className="px-3 py-2.5 bg-red-50 rounded-lg">
              <p className="text-xs text-slate-600 mb-2">Delete this process?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleConfirmDelete(process.id)}
                  className="flex-1 px-2 py-1 text-xs bg-red-600 text-white rounded-md hover:bg-red-700 font-medium transition-colors"
                >
                  Delete
                </button>
                <button
                  onClick={handleCancelDelete}
                  className="flex-1 px-2 py-1 text-xs bg-white text-slate-600 rounded-md border border-slate-200 hover:bg-slate-50 font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => handleLoadProcess(process)}
              className="w-full px-3 py-2 flex items-start gap-2.5 text-left cursor-pointer"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleLoadProcess(process);
                }
              }}
            >
              <FileText className={clsx(
                'w-4 h-4 mt-0.5 flex-shrink-0',
                currentProcess?.id === process.id ? 'text-accent' : 'text-slate-400'
              )} />
              <div className="flex-1 min-w-0">
                <div className={clsx(
                  'text-sm truncate',
                  currentProcess?.id === process.id
                    ? 'font-medium text-slate-800'
                    : 'text-slate-700'
                )}>
                  {process.name}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {new Date(process.updatedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
              </div>
              <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                <button
                  onClick={(e) => handleStartEdit(e, process)}
                  className="p-1 hover:bg-slate-200 rounded-md transition-colors"
                  title="Rename"
                >
                  <Edit2 className="w-3 h-3 text-slate-500" />
                </button>
                <button
                  onClick={(e) => handleDeleteClick(e, process.id)}
                  className="p-1 hover:bg-red-100 rounded-md transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-3 h-3 text-slate-500 hover:text-red-600" />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
