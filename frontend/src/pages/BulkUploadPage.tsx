import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, FolderOpen, FileText, CheckCircle2, XCircle, AlertTriangle, Loader2, ChevronRight, ChevronDown, Tag } from 'lucide-react';
import { MainLayout } from '../components/layout/MainLayout';
import { useAppStore } from '../store/useAppStore';
import { processApi } from '../services/api';

// Types
interface ParsedBpmnFile {
  id: string;
  file: File;
  relativePath: string;
  derivedTags: string[];
  proposedName: string;
  hasConflict: boolean;
  isValid: boolean;
  validationError?: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

interface UploadProgress {
  total: number;
  completed: number;
  failed: number;
  currentFile: string | null;
}

interface UploadResult {
  fileName: string;
  processId?: string;
  success: boolean;
  error?: string;
  tags: string[];
}

type Phase = 'select' | 'preview' | 'uploading' | 'complete';

// Utility functions
function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function deriveTagsFromPath(relativePath: string): string[] {
  const parts = relativePath.split('/').filter(Boolean);
  parts.pop(); // Remove filename
  if (parts.length > 1) parts.shift(); // Skip root folder
  return parts.length ? [parts.join('/')] : [];
}

async function validateBpmnFile(file: File): Promise<{ isValid: boolean; error?: string }> {
  try {
    const content = await file.text();

    // Basic XML validation
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'application/xml');

    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      return { isValid: false, error: 'Invalid XML format' };
    }

    // Check for BPMN namespace
    const hasBpmnNamespace = content.includes('http://www.omg.org/spec/BPMN');
    if (!hasBpmnNamespace) {
      return { isValid: false, error: 'Not a valid BPMN file' };
    }

    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Failed to read file' };
  }
}

function isBpmnFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  return lower.endsWith('.bpmn') || lower.endsWith('.bpmn20.xml') || (lower.endsWith('.xml') && !lower.includes('package'));
}

export function BulkUploadPage() {
  const navigate = useNavigate();
  const { currentOrganization, addProcess } = useAppStore();
  const abortControllerRef = useRef<AbortController | null>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>('select');
  const [files, setFiles] = useState<ParsedBpmnFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    total: 0,
    completed: 0,
    failed: 0,
    currentFile: null,
  });
  const [results, setResults] = useState<UploadResult[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Permission check
  const canBulkUpload =
    currentOrganization?.currentUserRole === 'owner' ||
    currentOrganization?.currentUserRole === 'admin';

  useEffect(() => {
    if (!currentOrganization) {
      navigate('/');
    } else if (!canBulkUpload) {
      navigate(`/organizations/${currentOrganization.slug}`);
    }
  }, [currentOrganization, canBulkUpload, navigate]);

  // File tree traversal for drag-drop
  const traverseFileTree = useCallback(async (
    entry: FileSystemEntry,
    path: string,
    filesArray: ParsedBpmnFile[]
  ): Promise<void> => {
    if (entry.isFile) {
      const fileEntry = entry as FileSystemFileEntry;
      const file = await new Promise<File>((resolve, reject) => {
        fileEntry.file(resolve, reject);
      });

      if (isBpmnFile(file.name)) {
        const relativePath = `${path}/${entry.name}`;
        filesArray.push({
          id: generateId(),
          file,
          relativePath,
          derivedTags: deriveTagsFromPath(relativePath),
          proposedName: file.name.replace(/\.(bpmn|xml|bpmn20\.xml)$/i, ''),
          hasConflict: false,
          isValid: true,
          status: 'pending',
        });
      }
    } else if (entry.isDirectory) {
      const dirEntry = entry as FileSystemDirectoryEntry;
      const reader = dirEntry.createReader();

      const entries = await new Promise<FileSystemEntry[]>((resolve, reject) => {
        const allEntries: FileSystemEntry[] = [];
        const readEntries = () => {
          reader.readEntries((entries) => {
            if (entries.length === 0) {
              resolve(allEntries);
            } else {
              allEntries.push(...entries);
              readEntries();
            }
          }, reject);
        };
        readEntries();
      });

      for (const childEntry of entries) {
        await traverseFileTree(childEntry, `${path}/${entry.name}`, filesArray);
      }
    }
  }, []);

  // Handle drag-drop
  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const items = e.dataTransfer.items;
    const filesArray: ParsedBpmnFile[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const entry = item.webkitGetAsEntry?.();
      if (entry) {
        await traverseFileTree(entry, '', filesArray);
      }
    }

    if (filesArray.length > 0) {
      await processFiles(filesArray);
    }
  }, [traverseFileTree]);

  // Handle folder input
  const handleFolderSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;

    const filesArray: ParsedBpmnFile[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      // webkitRelativePath gives us the relative path including folder structure
      const relativePath = (file as any).webkitRelativePath || file.name;

      if (isBpmnFile(file.name)) {
        filesArray.push({
          id: generateId(),
          file,
          relativePath: '/' + relativePath,
          derivedTags: deriveTagsFromPath('/' + relativePath),
          proposedName: file.name.replace(/\.(bpmn|xml|bpmn20\.xml)$/i, ''),
          hasConflict: false,
          isValid: true,
          status: 'pending',
        });
      }
    }

    if (filesArray.length > 0) {
      await processFiles(filesArray);
    }

    // Reset input
    e.target.value = '';
  }, []);

  // Process files: validate and check conflicts
  const processFiles = async (filesArray: ParsedBpmnFile[]) => {
    setIsValidating(true);

    // Validate BPMN files
    for (const file of filesArray) {
      const validation = await validateBpmnFile(file.file);
      file.isValid = validation.isValid;
      file.validationError = validation.error;
    }

    // Check for conflicts with existing processes
    if (currentOrganization) {
      try {
        const { processes } = await processApi.getAll({
          organizationId: currentOrganization.id,
          limit: 1000,
        });
        const existingNames = new Set(processes.map(p => p.name.toLowerCase()));
        const batchNames = new Map<string, number>();

        for (const file of filesArray) {
          const baseName = file.proposedName.toLowerCase();

          if (existingNames.has(baseName) || batchNames.has(baseName)) {
            file.hasConflict = true;
            const count = (batchNames.get(baseName) || 0) + 1;
            batchNames.set(baseName, count);
            file.proposedName = `${file.proposedName} (${count + 1})`;
          } else {
            batchNames.set(baseName, 0);
          }
        }
      } catch (error) {
        console.error('Failed to check conflicts:', error);
      }
    }

    setFiles(filesArray);
    setIsValidating(false);
    setPhase('preview');

    // Expand all folders by default
    const folders = new Set<string>();
    filesArray.forEach(f => {
      const parts = f.relativePath.split('/').filter(Boolean);
      parts.pop(); // Remove filename
      let path = '';
      parts.forEach(part => {
        path = path ? `${path}/${part}` : part;
        folders.add(path);
      });
    });
    setExpandedFolders(folders);
  };

  // Start upload
  const startUpload = async () => {
    const validFiles = files.filter(f => f.isValid);
    if (validFiles.length === 0) return;

    setPhase('uploading');
    abortControllerRef.current = new AbortController();

    const progress: UploadProgress = {
      total: validFiles.length,
      completed: 0,
      failed: 0,
      currentFile: null,
    };
    setUploadProgress(progress);

    const uploadResults: UploadResult[] = [];

    for (const file of validFiles) {
      if (abortControllerRef.current.signal.aborted) break;

      // Update progress
      progress.currentFile = file.file.name;
      setUploadProgress({ ...progress });

      // Update file status
      setFiles(prev => prev.map(f =>
        f.id === file.id ? { ...f, status: 'uploading' } : f
      ));

      try {
        const bpmnXml = await file.file.text();

        const { process } = await processApi.create({
          name: file.proposedName,
          description: `Imported from ${file.relativePath}`,
          tags: [...file.derivedTags, 'bulk-import'],
          primaryCategoryId: '',
          bpmnXml,
          organizationId: currentOrganization?.id || null,
        });

        addProcess(process);

        uploadResults.push({
          fileName: file.file.name,
          processId: process.id,
          success: true,
          tags: file.derivedTags,
        });

        setFiles(prev => prev.map(f =>
          f.id === file.id ? { ...f, status: 'success' } : f
        ));

        progress.completed++;
      } catch (error: any) {
        uploadResults.push({
          fileName: file.file.name,
          success: false,
          error: error.message || 'Upload failed',
          tags: file.derivedTags,
        });

        setFiles(prev => prev.map(f =>
          f.id === file.id ? { ...f, status: 'error', error: error.message } : f
        ));

        progress.failed++;
      }

      setUploadProgress({ ...progress });

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    progress.currentFile = null;
    setUploadProgress(progress);
    setResults(uploadResults);
    setPhase('complete');
  };

  // Cancel upload
  const cancelUpload = () => {
    abortControllerRef.current?.abort();
  };

  // Reset to start
  const reset = () => {
    setPhase('select');
    setFiles([]);
    setResults([]);
    setUploadProgress({ total: 0, completed: 0, failed: 0, currentFile: null });
  };

  // Toggle folder expansion
  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  // Build folder tree structure
  const buildFolderTree = () => {
    const tree: { [key: string]: ParsedBpmnFile[] } = {};

    files.forEach(file => {
      const parts = file.relativePath.split('/').filter(Boolean);
      parts.pop(); // Remove filename
      const folderPath = parts.join('/') || 'Root';

      if (!tree[folderPath]) {
        tree[folderPath] = [];
      }
      tree[folderPath].push(file);
    });

    return tree;
  };

  const validCount = files.filter(f => f.isValid).length;
  const invalidCount = files.filter(f => !f.isValid).length;
  const conflictCount = files.filter(f => f.hasConflict).length;

  if (!currentOrganization || !canBulkUpload) {
    return null;
  }

  return (
    <MainLayout hideFooter>
      <div className="h-full flex flex-col bg-gradient-to-br from-violet-50/30 via-slate-50 to-slate-100/80">
        {/* Header */}
        <div className="flex-shrink-0 px-8 py-6 border-b border-violet-100 bg-white/80">
          <button
            onClick={() => navigate(`/organizations/${currentOrganization.slug}`)}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-violet-600 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {currentOrganization.name}
          </button>
          <h1 className="text-2xl font-semibold text-slate-800">Bulk Import BPMN Files</h1>
          <p className="text-slate-500 mt-1">
            Upload a folder of BPMN files to import them with hierarchical tags based on folder structure.
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto">

            {/* Phase: Select */}
            {phase === 'select' && (
              <div className="space-y-6">
                {/* Drop Zone */}
                <div
                  className={`border-2 border-dashed rounded-2xl p-16 text-center transition-all ${
                    isDragging
                      ? 'border-violet-500 bg-violet-50'
                      : 'border-slate-200 hover:border-violet-300 hover:bg-violet-50/30'
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                  onDrop={handleDrop}
                >
                  <FolderOpen className={`w-16 h-16 mx-auto mb-6 ${isDragging ? 'text-violet-500' : 'text-slate-300'}`} />
                  <h3 className="text-lg font-medium text-slate-700 mb-2">
                    Drag and drop a folder here
                  </h3>
                  <p className="text-slate-500 mb-6">
                    or use the button below to select a folder
                  </p>

                  <input
                    ref={folderInputRef}
                    type="file"
                    // @ts-ignore - webkitdirectory is not in types but works in browsers
                    webkitdirectory=""
                    directory=""
                    multiple
                    onChange={handleFolderSelect}
                    className="hidden"
                  />

                  <button
                    onClick={() => folderInputRef.current?.click()}
                    className="px-6 py-3 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 transition-colors inline-flex items-center gap-2"
                  >
                    <Upload className="w-5 h-5" />
                    Select Folder
                  </button>
                </div>

                {/* Instructions */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h3 className="font-medium text-slate-800 mb-4">How it works</h3>
                  <ul className="space-y-3 text-sm text-slate-600">
                    <li className="flex items-start gap-3">
                      <span className="w-6 h-6 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium">1</span>
                      <span>Select a folder containing your BPMN files (.bpmn, .xml)</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-6 h-6 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium">2</span>
                      <span>Subfolders become hierarchical tags (e.g., Finance/Budgeting)</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-6 h-6 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium">3</span>
                      <span>Review the files and tags, then start the import</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-6 h-6 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium">4</span>
                      <span>Files with duplicate names will be renamed automatically</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* Phase: Preview */}
            {phase === 'preview' && (
              <div className="space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-semibold text-slate-800">{validCount}</p>
                        <p className="text-sm text-slate-500">Valid files</p>
                      </div>
                    </div>
                  </div>

                  {invalidCount > 0 && (
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                          <XCircle className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-semibold text-slate-800">{invalidCount}</p>
                          <p className="text-sm text-slate-500">Invalid files</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {conflictCount > 0 && (
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                          <AlertTriangle className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-semibold text-slate-800">{conflictCount}</p>
                          <p className="text-sm text-slate-500">Will be renamed</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* File Tree */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                    <h3 className="font-medium text-slate-800">Files to Import</h3>
                  </div>

                  <div className="max-h-96 overflow-y-auto">
                    {Object.entries(buildFolderTree()).map(([folderPath, folderFiles]) => (
                      <div key={folderPath} className="border-b border-slate-100 last:border-b-0">
                        <button
                          onClick={() => toggleFolder(folderPath)}
                          className="w-full px-6 py-3 flex items-center gap-2 hover:bg-slate-50 text-left"
                        >
                          {expandedFolders.has(folderPath) ? (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          )}
                          <FolderOpen className="w-4 h-4 text-violet-500" />
                          <span className="text-sm font-medium text-slate-700">{folderPath}</span>
                          <span className="text-xs text-slate-400 ml-2">({folderFiles.length} files)</span>
                        </button>

                        {expandedFolders.has(folderPath) && (
                          <div className="pl-12 pr-6 pb-3 space-y-2">
                            {folderFiles.map(file => (
                              <div
                                key={file.id}
                                className={`flex items-center gap-3 p-3 rounded-lg ${
                                  !file.isValid ? 'bg-red-50' :
                                  file.hasConflict ? 'bg-amber-50' :
                                  'bg-slate-50'
                                }`}
                              >
                                <FileText className={`w-4 h-4 ${
                                  !file.isValid ? 'text-red-500' :
                                  file.hasConflict ? 'text-amber-500' :
                                  'text-slate-400'
                                }`} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-slate-700 truncate">
                                    {file.proposedName}
                                  </p>
                                  {file.derivedTags.length > 0 && (
                                    <div className="flex items-center gap-1 mt-1">
                                      <Tag className="w-3 h-3 text-slate-400" />
                                      <span className="text-xs text-slate-500">
                                        {file.derivedTags.join(', ')}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                {!file.isValid && (
                                  <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
                                    {file.validationError}
                                  </span>
                                )}
                                {file.isValid && file.hasConflict && (
                                  <span className="text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded">
                                    Renamed
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={reset}
                    className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={startUpload}
                    disabled={validCount === 0}
                    className="px-6 py-3 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                  >
                    <Upload className="w-5 h-5" />
                    Import {validCount} Files
                  </button>
                </div>
              </div>
            )}

            {/* Phase: Uploading */}
            {phase === 'uploading' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                  <Loader2 className="w-12 h-12 text-violet-600 mx-auto mb-4 animate-spin" />
                  <h3 className="text-lg font-medium text-slate-800 mb-2">
                    Importing files...
                  </h3>
                  <p className="text-slate-500 mb-6">
                    {uploadProgress.currentFile ? (
                      <>Uploading: {uploadProgress.currentFile}</>
                    ) : (
                      <>Preparing upload...</>
                    )}
                  </p>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 rounded-full h-3 mb-4">
                    <div
                      className="bg-violet-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${((uploadProgress.completed + uploadProgress.failed) / uploadProgress.total) * 100}%` }}
                    />
                  </div>

                  <p className="text-sm text-slate-500 mb-6">
                    {uploadProgress.completed + uploadProgress.failed} of {uploadProgress.total} files processed
                    {uploadProgress.failed > 0 && (
                      <span className="text-red-500"> ({uploadProgress.failed} failed)</span>
                    )}
                  </p>

                  <button
                    onClick={cancelUpload}
                    className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
                  >
                    Cancel Import
                  </button>
                </div>
              </div>
            )}

            {/* Phase: Complete */}
            {phase === 'complete' && (
              <div className="space-y-6">
                {/* Summary */}
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                  {uploadProgress.failed === 0 ? (
                    <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                  ) : uploadProgress.completed > 0 ? (
                    <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                  ) : (
                    <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                  )}

                  <h3 className="text-xl font-medium text-slate-800 mb-2">
                    {uploadProgress.failed === 0 ? 'Import Complete!' :
                     uploadProgress.completed > 0 ? 'Import Completed with Errors' :
                     'Import Failed'}
                  </h3>

                  <p className="text-slate-500 mb-6">
                    {uploadProgress.completed} files imported successfully
                    {uploadProgress.failed > 0 && `, ${uploadProgress.failed} failed`}
                  </p>

                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={reset}
                      className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
                    >
                      Import More
                    </button>
                    <button
                      onClick={() => navigate('/')}
                      className="px-6 py-3 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 transition-colors"
                    >
                      View Imported Processes
                    </button>
                  </div>
                </div>

                {/* Results List */}
                {results.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                      <h3 className="font-medium text-slate-800">Import Results</h3>
                    </div>
                    <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                      {results.map((result, index) => (
                        <div
                          key={index}
                          className="px-6 py-3 flex items-center gap-3"
                        >
                          {result.success ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-700 truncate">{result.fileName}</p>
                            {result.error && (
                              <p className="text-xs text-red-500 mt-0.5">{result.error}</p>
                            )}
                          </div>
                          {result.tags.length > 0 && (
                            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">
                              {result.tags.join(' / ')}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Loading overlay */}
            {isValidating && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl p-6 flex items-center gap-4">
                  <Loader2 className="w-6 h-6 text-violet-600 animate-spin" />
                  <span className="text-slate-700">Validating files...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
