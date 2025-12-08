import { useEffect, useRef, useState, useCallback } from 'react';
import BpmnModeler from 'bpmn-js/lib/Modeler';
import { useAppStore } from '../../store/useAppStore';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  Save,
  Undo,
  Redo,
} from 'lucide-react';

const EMPTY_BPMN = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
                  id="Definitions_1"
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

export function BPMNModeler() {
  const containerRef = useRef<HTMLDivElement>(null);
  const modelerRef = useRef<any>(null);
  const {
    currentBpmnXml,
    setCurrentBpmnXml,
    setZoom,
    editor,
    markDirty,
    updateLastSaved,
  } = useAppStore();
  const [error, setError] = useState<string | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastLoadedXmlRef = useRef<string | null>(null);
  const isLoadingRef = useRef(false);

  // Initialize modeler once
  useEffect(() => {
    if (!containerRef.current) return;

    console.log('[BPMNModeler] Initializing...');
    modelerRef.current = new BpmnModeler({
      container: containerRef.current,
    });

    // Listen for changes
    const eventBus = modelerRef.current.get('eventBus');
    eventBus.on('commandStack.changed', handleCommandStackChanged);

    setIsReady(true);

    return () => {
      console.log('[BPMNModeler] Destroying...');
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      modelerRef.current?.destroy();
      modelerRef.current = null;
      setIsReady(false);
    };
  }, []);

  // Load diagram when ready or when XML changes
  useEffect(() => {
    if (!isReady || !modelerRef.current || isLoadingRef.current) return;

    const xmlToLoad = currentBpmnXml || EMPTY_BPMN;

    // Skip if same XML already loaded
    if (lastLoadedXmlRef.current === xmlToLoad) {
      return;
    }

    console.log('[BPMNModeler] Loading diagram...', xmlToLoad.substring(0, 50));
    loadDiagram(xmlToLoad);
  }, [isReady, currentBpmnXml]);

  const handleCommandStackChanged = () => {
    const commandStack = modelerRef.current?.get('commandStack');
    if (commandStack) {
      setCanUndo(commandStack.canUndo());
      setCanRedo(commandStack.canRedo());
      markDirty();

      // Trigger auto-save after 5 seconds of inactivity
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      autoSaveTimeoutRef.current = setTimeout(() => {
        handleAutoSave();
      }, 5000);
    }
  };

  const handleAutoSave = async () => {
    // Read latest state from store to avoid stale closure values
    const currentEditor = useAppStore.getState().editor;
    const latestProcess = useAppStore.getState().currentProcess;

    if (!modelerRef.current || !currentEditor.isDirty) return;

    setIsAutoSaving(true);
    try {
      const { xml } = await modelerRef.current.saveXML({ format: true });
      setCurrentBpmnXml(xml);

      // Save to database
      const { processApi } = await import('../../services/api');

      // Auto-save is disabled if there's no process loaded
      // The EditorPage handles saving new and existing processes
      if (latestProcess?.id) {
        // Only update existing processes via versioning
        await processApi.createVersion(latestProcess.id, {
          bpmnXml: xml,
          changeSummary: 'Auto-saved changes',
          changeType: 'patch',
        });

        updateLastSaved();
        console.log('✅ Auto-saved to database:', latestProcess.id);
      }
    } catch (err: any) {
      console.error('❌ Failed to auto-save:', err);
      setError(err.message || 'Failed to save');
    } finally {
      setIsAutoSaving(false);
    }
  };

  const loadDiagram = async (xml: string) => {
    if (!modelerRef.current || isLoadingRef.current) return;

    isLoadingRef.current = true;
    const xmlToLoad = xml && xml.trim() ? xml : EMPTY_BPMN;

    try {
      setError(null);
      await modelerRef.current.importXML(xmlToLoad);
      lastLoadedXmlRef.current = xmlToLoad;
      console.log('[BPMNModeler] Diagram loaded successfully');

      // Fit diagram to viewport
      const canvas = modelerRef.current.get('canvas');
      canvas.zoom('fit-viewport');

      // Reset undo/redo state after loading
      const commandStack = modelerRef.current.get('commandStack');
      if (commandStack) {
        commandStack.clear();
        setCanUndo(false);
        setCanRedo(false);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load BPMN diagram');
      console.error('[BPMNModeler] Error loading BPMN:', err);

      // Try loading empty diagram as fallback
      if (xmlToLoad !== EMPTY_BPMN) {
        console.log('[BPMNModeler] Loading empty diagram as fallback');
        lastLoadedXmlRef.current = EMPTY_BPMN;
        try {
          await modelerRef.current.importXML(EMPTY_BPMN);
          const canvas = modelerRef.current.get('canvas');
          canvas.zoom('fit-viewport');
        } catch (e) {
          console.error('[BPMNModeler] Failed to load fallback:', e);
        }
      }
    } finally {
      isLoadingRef.current = false;
    }
  };

  const handleSave = async () => {
    if (!modelerRef.current) return;

    try {
      const { xml } = await modelerRef.current.saveXML({ format: true });
      setCurrentBpmnXml(xml);

      // Note: The actual save is handled by EditorPage
      // This just updates the BPMN XML in the store
      // The EditorPage Save button will persist to the database
      updateLastSaved();
      console.log('✅ BPMN XML updated in store');
    } catch (err: any) {
      console.error('❌ Failed to save XML:', err);
      setError(err.message || 'Failed to save diagram');
    }
  };

  const handleUndo = () => {
    const commandStack = modelerRef.current?.get('commandStack');
    if (commandStack?.canUndo()) {
      commandStack.undo();
    }
  };

  const handleRedo = () => {
    const commandStack = modelerRef.current?.get('commandStack');
    if (commandStack?.canRedo()) {
      commandStack.redo();
    }
  };

  const handleZoomIn = () => {
    const canvas = modelerRef.current?.get('canvas');
    if (canvas) {
      const currentZoom = canvas.zoom();
      const newZoom = Math.min(currentZoom + 0.1, 4);
      canvas.zoom(newZoom);
      setZoom(newZoom);
    }
  };

  const handleZoomOut = () => {
    const canvas = modelerRef.current?.get('canvas');
    if (canvas) {
      const currentZoom = canvas.zoom();
      const newZoom = Math.max(currentZoom - 0.1, 0.2);
      canvas.zoom(newZoom);
      setZoom(newZoom);
    }
  };

  const handleFitViewport = () => {
    const canvas = modelerRef.current?.get('canvas');
    if (canvas) {
      canvas.zoom('fit-viewport');
      setZoom(1);
    }
  };

  const handleExportSVG = async () => {
    try {
      const { svg } = await modelerRef.current.saveSVG();
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'diagram.svg';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export SVG:', err);
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-50">
      {/* Toolbar */}
      <div className="h-11 border-b border-slate-200 bg-white flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white rounded-md hover:bg-accent-700 transition-colors text-sm font-medium"
          >
            <Save className="w-3.5 h-3.5" />
            Save
          </button>
          {isAutoSaving ? (
            <span className="text-xs text-accent font-medium">Saving...</span>
          ) : editor.isDirty ? (
            <span className="text-xs text-amber-600 font-medium">Unsaved</span>
          ) : null}
          <div className="w-px h-5 bg-slate-200 mx-1.5" />
          <button
            onClick={handleUndo}
            disabled={!canUndo}
            className="p-2 hover:bg-slate-100 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-slate-600"
            title="Undo"
          >
            <Undo className="w-4 h-4" />
          </button>
          <button
            onClick={handleRedo}
            disabled={!canRedo}
            className="p-2 hover:bg-slate-100 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-slate-600"
            title="Redo"
          >
            <Redo className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleZoomOut}
            className="p-2 hover:bg-slate-100 rounded-md transition-colors text-slate-600"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-slate-500 min-w-[50px] text-center font-medium">
            {Math.round(editor.zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-2 hover:bg-slate-100 rounded-md transition-colors text-slate-600"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleFitViewport}
            className="p-2 hover:bg-slate-100 rounded-md transition-colors text-slate-600"
            title="Fit to Viewport"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-slate-200 mx-1.5" />
          <button
            onClick={handleExportSVG}
            className="p-2 hover:bg-slate-100 rounded-md transition-colors text-slate-600"
            title="Export SVG"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* BPMN Canvas */}
      <div className="flex-1 relative">
        {error && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-50 text-red-700 px-4 py-2 rounded-lg shadow-soft text-sm z-50">
            {error}
          </div>
        )}
        <div ref={containerRef} className="w-full h-full bpmn-container" />
      </div>

      {/* Status Bar */}
      <div className="h-7 border-t border-slate-100 bg-white flex items-center justify-between px-4 text-2xs text-slate-500">
        <div>
          {editor.lastSaved
            ? `Saved ${new Date(editor.lastSaved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            : 'Not saved'}
        </div>
        <div className="flex items-center gap-3">
          <span>Edit mode</span>
          <span>Ready</span>
        </div>
      </div>
    </div>
  );
}
