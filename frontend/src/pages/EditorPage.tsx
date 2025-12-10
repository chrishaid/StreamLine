import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { BPMNViewer } from '../components/bpmn/BPMNViewer';
import { BPMNModeler } from '../components/bpmn/BPMNModeler';
import { ChatPanel } from '../components/chat/ChatPanel';
import { useAppStore } from '../store/useAppStore';
import { processApi, organizationApi } from '../services/api';
import { Edit, Eye, Save, ChevronDown, ChevronUp, ArrowLeft, CheckCircle, Star, Copy, Users, X, Building2, User, Files } from 'lucide-react';
import type { Process, OrganizationWithMembership } from '../types';

export function EditorPage() {
  const { processId: id } = useParams<{ processId: string }>();
  const navigate = useNavigate();
  const { editor, setEditorMode, currentBpmnXml, setCurrentBpmnXml, currentProcess, setCurrentProcess, addProcess, updateProcess, currentOrganization } = useAppStore();
  const [showChat] = useState(true);
  // Auto-show metadata panel for new processes (no id means new)
  const [showMetadata, setShowMetadata] = useState(!id);
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
  const processDataAutoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  // Copy and Access states
  const [showCopyToModal, setShowCopyToModal] = useState(false);
  const [showAccessPanel, setShowAccessPanel] = useState(false);
  const [organizations, setOrganizations] = useState<OrganizationWithMembership[]>([]);
  const [isCopying, setIsCopying] = useState(false);
  const [orgMembers, setOrgMembers] = useState<any[]>([]);

  const isEditMode = editor.mode === 'edit';

  // Sync isFavorite when currentProcess changes
  useEffect(() => {
    if (currentProcess) {
      setIsFavorite(currentProcess.isFavorite);
    }
  }, [currentProcess]);

  const handleToggleFavorite = async () => {
    if (!currentProcess) return;
    try {
      await processApi.update(currentProcess.id, { isFavorite: !isFavorite });
      setIsFavorite(!isFavorite);
      // Update the store
      updateProcess(currentProcess.id, { ...currentProcess, isFavorite: !isFavorite });
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  // Debug: Log when currentBpmnXml changes
  useEffect(() => {
    console.log('[EditorPage] currentBpmnXml changed:', currentBpmnXml ? `${currentBpmnXml.substring(0, 100)}...` : 'null');
  }, [currentBpmnXml]);

  // Load existing process if ID provided
  useEffect(() => {
    if (id) {
      loadProcess(id);
    }
  }, [id]);

  // Auto-save when BPMN changes (only in edit mode for existing processes)
  useEffect(() => {
    if (currentBpmnXml && currentProcess && isEditMode) {
      // Clear existing timer
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      setHasUnsavedChanges(true);

      // Set new timer for auto-save (5 seconds after last change)
      autoSaveTimerRef.current = setTimeout(() => {
        handleAutoSave();
      }, 5000);
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [currentBpmnXml, isEditMode]);

  // Auto-save when process details change (only in edit mode for existing processes)
  useEffect(() => {
    if (!currentProcess || !isEditMode) return;

    // Clear existing timer
    if (processDataAutoSaveRef.current) {
      clearTimeout(processDataAutoSaveRef.current);
    }

    setHasUnsavedChanges(true);

    // Set new timer for auto-save (3 seconds after last change)
    processDataAutoSaveRef.current = setTimeout(() => {
      handleAutoSaveProcessData();
    }, 3000);

    return () => {
      if (processDataAutoSaveRef.current) {
        clearTimeout(processDataAutoSaveRef.current);
      }
    };
  }, [processData.name, processData.description, processData.status, processData.tags, isEditMode]);

  const loadProcess = async (processId: string) => {
    try {
      const process = await processApi.getById(processId);
      const version = await processApi.getCurrentVersion(processId);

      setCurrentProcess(process);
      setCurrentBpmnXml(version.bpmn_xml);
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
      console.log('[EditorPage] Auto-saving BPMN...');
      // Create new version with current BPMN
      await processApi.createVersion(currentProcess.id, {
        bpmnXml: currentBpmnXml,
        changeSummary: 'Auto-saved',
        changeType: 'patch',
      });
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      console.log('[EditorPage] BPMN auto-saved');
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  };

  const handleAutoSaveProcessData = async () => {
    if (!currentProcess || !processData.name?.trim()) return;

    try {
      console.log('[EditorPage] Auto-saving process details...');
      const updated = await processApi.update(currentProcess.id, {
        name: processData.name,
        description: processData.description,
        status: processData.status,
        tags: processData.tags,
      });

      // Update local and global state
      setCurrentProcess(updated);
      updateProcess(currentProcess.id, updated);
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      console.log('[EditorPage] Process details auto-saved:', updated.name);
    } catch (error) {
      console.error('Auto-save process details failed:', error);
    }
  };

  const handleSave = async () => {
    console.log('[EditorPage] handleSave called', {
      processName: processData.name,
      currentProcess: currentProcess?.id,
      id,
      hasBpmnXml: !!currentBpmnXml,
    });

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
        console.log('[EditorPage] Updating existing process:', processId);

        const updated = await processApi.update(processId, {
          name: processData.name,
          description: processData.description,
          status: processData.status,
          tags: processData.tags,
        });
        console.log('[EditorPage] Process updated:', updated);

        // Create new version if BPMN changed
        if (currentBpmnXml) {
          console.log('[EditorPage] Creating new version with BPMN XML');
          await processApi.createVersion(processId, {
            bpmnXml: currentBpmnXml,
            changeSummary: 'Updated via editor',
            changeType: 'minor',
          });
          console.log('[EditorPage] Version created');
        }

        setCurrentProcess(updated);
        updateProcess(processId, updated); // Update sidebar's process list
        setLastSaved(new Date());
        setHasUnsavedChanges(false);
        console.log('[EditorPage] Save complete!');
      } else {
        // Create new process
        console.log('[EditorPage] Creating new process');
        const { process } = await processApi.create({
          name: processData.name,
          description: processData.description,
          tags: processData.tags,
          primaryCategoryId: processData.primaryCategoryId || '',
          bpmnXml: currentBpmnXml || '',
          organizationId: currentOrganization?.id || null,
        });
        console.log('[EditorPage] Process created:', process);

        setCurrentProcess(process);
        addProcess(process); // Add to global store so sidebar updates
        setLastSaved(new Date());
        setHasUnsavedChanges(false);
        // Navigate to edit mode for this process
        navigate(`/editor/${process.id}`, { replace: true });
      }
    } catch (error: any) {
      console.error('[EditorPage] Failed to save process:', error);
      console.error('[EditorPage] Error details:', error?.message, error?.response?.data);
      alert(`Failed to save process: ${error?.message || 'Unknown error'}`);
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

  // Load organizations when copy modal opens
  useEffect(() => {
    if (showCopyToModal) {
      loadOrganizations();
    }
  }, [showCopyToModal]);

  // Load org members when access panel opens
  useEffect(() => {
    if (showAccessPanel && currentProcess?.organizationId) {
      loadOrgMembers();
    }
  }, [showAccessPanel, currentProcess?.organizationId]);

  const loadOrganizations = async () => {
    try {
      const orgs = await organizationApi.getMyOrganizations();
      setOrganizations(orgs);
    } catch (error) {
      console.error('Failed to load organizations:', error);
    }
  };

  const loadOrgMembers = async () => {
    if (!currentProcess?.organizationId) return;
    try {
      const members = await organizationApi.getMembers(currentProcess.organizationId);
      setOrgMembers(members);
    } catch (error) {
      console.error('Failed to load org members:', error);
    }
  };

  const handleCopyToOrg = async (targetOrgId: string | null) => {
    if (!currentProcess) return;
    setIsCopying(true);
    try {
      // Check if copying to the same workspace (duplicate in place)
      const isSameWorkspace = targetOrgId === currentProcess.organizationId ||
        (targetOrgId === null && currentProcess.organizationId === null);

      let newName: string;
      let successMessage: string;

      if (isSameWorkspace) {
        // Duplicate in same workspace
        newName = `${currentProcess.name} (Copy)`;
        successMessage = 'Process duplicated';
      } else {
        // Copy to different workspace
        const targetName = targetOrgId
          ? organizations.find(o => o.id === targetOrgId)?.name || 'Organization'
          : 'Personal';
        newName = `${currentProcess.name} (Copy to ${targetName})`;
        successMessage = `Process copied to ${targetName}`;
      }

      await processApi.duplicate(currentProcess.id, newName, targetOrgId);
      setShowCopyToModal(false);
      alert(successMessage);
    } catch (error) {
      console.error('Error copying process:', error);
      alert('Failed to copy process');
    } finally {
      setIsCopying(false);
    }
  };

  const handleDuplicate = async () => {
    if (!currentProcess) return;
    try {
      const newName = `${currentProcess.name} (Copy)`;
      const { process: newProcess } = await processApi.duplicate(
        currentProcess.id,
        newName,
        currentProcess.organizationId
      );
      alert('Process duplicated successfully');
      // Navigate to the new process
      navigate(`/editor/${newProcess.id}`);
    } catch (error) {
      console.error('Error duplicating process:', error);
      alert('Failed to duplicate process');
    }
  };

  return (
    <MainLayout showChat={showChat}>
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 text-slate-500 hover:text-slate-700 text-sm transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <div className="h-5 w-px bg-slate-200"></div>

            {/* Process Name */}
            <h1 className="text-base font-semibold text-slate-800 max-w-[200px] truncate">
              {processData.name || currentProcess?.name || 'Untitled Process'}
            </h1>

            {/* Favorite Toggle */}
            {currentProcess && (
              <>
                <button
                  onClick={handleToggleFavorite}
                  className={`p-1.5 rounded-md transition-colors ${
                    isFavorite ? 'text-amber-500 hover:text-amber-600' : 'text-slate-300 hover:text-amber-400'
                  }`}
                  title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Star className="w-4 h-4" fill={isFavorite ? 'currentColor' : 'none'} />
                </button>

                {/* Duplicate Button */}
                <button
                  onClick={handleDuplicate}
                  className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  title="Duplicate process"
                >
                  <Files className="w-4 h-4" />
                </button>

                {/* Copy To Button */}
                <button
                  onClick={() => setShowCopyToModal(true)}
                  className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  title="Copy to another workspace"
                >
                  <Copy className="w-4 h-4" />
                </button>

                {/* Access Button */}
                <button
                  onClick={() => setShowAccessPanel(true)}
                  className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  title="Who has access"
                >
                  <Users className="w-4 h-4" />
                </button>
              </>
            )}

            {(processData.status || currentProcess?.status) && (
              <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                (processData.status || currentProcess?.status) === 'active'
                  ? 'bg-green-100 text-green-700'
                  : (processData.status || currentProcess?.status) === 'archived'
                  ? 'bg-slate-100 text-slate-600'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {processData.status || currentProcess?.status}
              </span>
            )}

            <div className="h-5 w-px bg-slate-200"></div>

            <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg">
              <button
                onClick={() => setEditorMode('view')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors text-sm ${
                  editor.mode === 'view'
                    ? 'bg-white text-slate-800 shadow-sm font-medium'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                View
              </button>
              <button
                onClick={() => setEditorMode('edit')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors text-sm ${
                  editor.mode === 'edit'
                    ? 'bg-white text-slate-800 shadow-sm font-medium'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Edit className="w-3.5 h-3.5" />
                Edit
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {hasUnsavedChanges && isEditMode && (
              <div className="flex items-center gap-1.5 text-xs text-amber-600">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                Unsaved changes
              </div>
            )}
            {lastSaved && !hasUnsavedChanges && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <CheckCircle className="w-3.5 h-3.5 text-accent" />
                Saved {new Date(lastSaved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
            {isEditMode && (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-accent text-white hover:bg-accent-700 disabled:opacity-50 text-sm font-medium transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            )}
          </div>
        </div>

        {/* Metadata Panel - Collapsible */}
        <div className="border-b border-slate-200">
          <button
            onClick={() => setShowMetadata(!showMetadata)}
            className="w-full flex items-center justify-between px-6 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <span className="text-sm font-medium text-slate-700">Process Details</span>
            {showMetadata ? (
              <ChevronUp className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            )}
          </button>
        </div>
        {showMetadata && (
          <div className="border-b border-slate-200 bg-slate-50 p-5">
            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Process Name {isEditMode && '*'}
                </label>
                {isEditMode ? (
                  <input
                    type="text"
                    value={processData.name}
                    onChange={(e) => setProcessData({ ...processData, name: e.target.value })}
                    placeholder="Enter process name"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                  />
                ) : (
                  <div className="w-full px-3 py-2 text-sm bg-white border border-slate-100 rounded-lg text-slate-700">
                    {processData.name || 'Untitled Process'}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Status
                </label>
                {isEditMode ? (
                  <select
                    value={processData.status}
                    onChange={(e) =>
                      setProcessData({
                        ...processData,
                        status: e.target.value as 'draft' | 'active' | 'archived',
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                  </select>
                ) : (
                  <div className="w-full px-3 py-2 text-sm bg-white border border-slate-100 rounded-lg text-slate-700 capitalize">
                    {processData.status || 'draft'}
                  </div>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Description
                </label>
                {isEditMode ? (
                  <textarea
                    value={processData.description}
                    onChange={(e) =>
                      setProcessData({ ...processData, description: e.target.value })
                    }
                    placeholder="Enter process description"
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all resize-none"
                  />
                ) : (
                  <div className="w-full px-3 py-2 text-sm bg-white border border-slate-100 rounded-lg text-slate-700 min-h-[60px]">
                    {processData.description || <span className="text-slate-400 italic">No description</span>}
                  </div>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Tags {isEditMode && '(press Enter to add)'}
                </label>
                {isEditMode && (
                  <input
                    type="text"
                    onKeyDown={handleTagInput}
                    placeholder="Add tags..."
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all mb-2"
                  />
                )}
                {processData.tags && processData.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {processData.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2.5 py-1 bg-accent/10 text-accent rounded-full text-xs flex items-center gap-1.5"
                      >
                        {tag}
                        {isEditMode && (
                          <button
                            onClick={() => removeTag(tag)}
                            className="hover:text-accent-700 font-medium"
                          >
                            ×
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                ) : (
                  !isEditMode && (
                    <div className="text-sm text-slate-400 italic">No tags</div>
                  )
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

      {/* Copy To Modal */}
      {showCopyToModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowCopyToModal(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4" onClick={() => setShowCopyToModal(false)}>
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-800">Copy to...</h3>
                <button onClick={() => setShowCopyToModal(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <p className="text-sm text-slate-500 mb-4">Select where to copy "{currentProcess?.name}"</p>

              <div className="space-y-2">
                {/* Personal option */}
                <button
                  onClick={() => handleCopyToOrg(null)}
                  disabled={isCopying}
                  className={`w-full p-3 rounded-lg border text-left flex items-center gap-3 transition-colors ${
                    isCopying
                      ? 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed'
                      : 'border-slate-200 hover:border-accent hover:bg-accent/5'
                  }`}
                >
                  <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                    <User className="w-4 h-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-700">Personal Workspace</p>
                    <p className="text-xs text-slate-500">
                      {!currentProcess?.organizationId ? 'Duplicate here' : 'Your private processes'}
                    </p>
                  </div>
                  {!currentProcess?.organizationId && (
                    <span className="ml-auto text-xs text-accent font-medium">(Current)</span>
                  )}
                </button>

                {/* Organizations */}
                {organizations.map(org => (
                  <button
                    key={org.id}
                    onClick={() => handleCopyToOrg(org.id)}
                    disabled={isCopying}
                    className={`w-full p-3 rounded-lg border text-left flex items-center gap-3 transition-colors ${
                      isCopying
                        ? 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed'
                        : 'border-slate-200 hover:border-accent hover:bg-accent/5'
                    }`}
                  >
                    <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-700">{org.name}</p>
                      <p className="text-xs text-slate-500">
                        {currentProcess?.organizationId === org.id ? 'Duplicate here' : `${org.memberCount || 0} members`}
                      </p>
                    </div>
                    {currentProcess?.organizationId === org.id && (
                      <span className="ml-auto text-xs text-accent font-medium">(Current)</span>
                    )}
                  </button>
                ))}

                {organizations.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-4">
                    No organizations available. Create one first.
                  </p>
                )}
              </div>

              {isCopying && (
                <div className="mt-4 text-center text-sm text-slate-500">
                  Copying process...
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Access Panel Modal */}
      {showAccessPanel && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowAccessPanel(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4" onClick={() => setShowAccessPanel(false)}>
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-800">Who has access</h3>
                <button onClick={() => setShowAccessPanel(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {currentProcess?.organizationId ? (
                <>
                  <div className="flex items-center gap-2 mb-4 p-3 bg-accent/5 rounded-lg">
                    <Building2 className="w-4 h-4 text-accent" />
                    <span className="text-sm text-slate-700">
                      Shared with organization members
                    </span>
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {orgMembers.length > 0 ? (
                      orgMembers.map((member: any) => (
                        <div key={member.userId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
                          <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                            {member.user?.avatarUrl ? (
                              <img src={member.user.avatarUrl} alt="" className="w-8 h-8 rounded-full" />
                            ) : (
                              <User className="w-4 h-4 text-slate-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-700 truncate">{member.user?.name || member.user?.email || 'Unknown'}</p>
                            <p className="text-xs text-slate-500 capitalize">{member.role}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500 text-center py-4">Loading members...</p>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <User className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-sm text-slate-600 font-medium">Private to you</p>
                  <p className="text-xs text-slate-500 mt-1">
                    This process is in your personal workspace and is only visible to you.
                  </p>
                  <button
                    onClick={() => {
                      setShowAccessPanel(false);
                      setShowCopyToModal(true);
                    }}
                    className="mt-4 text-sm text-accent hover:underline"
                  >
                    Copy to an organization to share
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </MainLayout>
  );
}
