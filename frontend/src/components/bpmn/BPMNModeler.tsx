import { useEffect, useRef, useState } from 'react';
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
    setGetDiagramSvg,
  } = useAppStore();
  const [error, setError] = useState<string | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize BPMN modeler
    modelerRef.current = new BpmnModeler({
      container: containerRef.current,
      keyboard: {
        bindTo: document,
      },
    });

    // Load initial diagram
    loadDiagram(currentBpmnXml || EMPTY_BPMN);

    // Listen for changes
    const eventBus = modelerRef.current.get('eventBus');
    eventBus.on('commandStack.changed', handleCommandStackChanged);

    // Register SVG export function
    setGetDiagramSvg(() => async () => {
      if (!modelerRef.current) return '';
      try {
        const { svg } = await modelerRef.current.saveSVG();
        return svg;
      } catch (err) {
        console.error('Failed to export SVG:', err);
        return '';
      }
    });

    return () => {
      modelerRef.current?.destroy();
      setGetDiagramSvg(null);
    };
  }, []);

  useEffect(() => {
    if (currentBpmnXml && modelerRef.current) {
      loadDiagram(currentBpmnXml);
    }
  }, [currentBpmnXml]);

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
      const result = await processApi.save({
        id: latestProcess?.id,
        name: latestProcess?.name || 'Untitled Process',
        bpmnXml: xml,
        description: latestProcess?.description,
      });

      // Update store with saved process info
      if (result.process && result.process.id !== latestProcess?.id) {
        useAppStore.setState({ currentProcess: result.process });
      }

      updateLastSaved();
      console.log('✅ Auto-saved to database:', result.process.id);
    } catch (err: any) {
      console.error('❌ Failed to auto-save:', err);
      setError(err.message || 'Failed to save');
    } finally {
      setIsAutoSaving(false);
    }
  };

  const loadDiagram = async (xml: string | undefined | null) => {
    if (!modelerRef.current) return;

    // Use EMPTY_BPMN if xml is undefined, null, or empty
    const xmlToLoad = xml && xml.trim() ? xml : EMPTY_BPMN;

    try {
      setError(null);
      await modelerRef.current.importXML(xmlToLoad);

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

      // Only update store if loading from external source and it's valid XML
      if (xml && xml.trim() && xml !== currentBpmnXml) {
        setCurrentBpmnXml(xml);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load BPMN diagram');
      console.error('Error loading BPMN:', err);
      // Try loading empty diagram as fallback
      if (xmlToLoad !== EMPTY_BPMN) {
        console.log('Loading empty diagram as fallback');
        await loadDiagram(EMPTY_BPMN);
      }
    }
  };

  const handleSave = async () => {
    if (!modelerRef.current) return;

    // Read latest state from store
    const latestProcess = useAppStore.getState().currentProcess;

    try {
      const { xml } = await modelerRef.current.saveXML({ format: true });
      setCurrentBpmnXml(xml);

      // Save to database
      const { processApi } = await import('../../services/api');
      const result = await processApi.save({
        id: latestProcess?.id,
        name: latestProcess?.name || 'Untitled Process',
        bpmnXml: xml,
        description: latestProcess?.description,
      });

      // Update store with saved process info
      if (result.process && result.process.id !== latestProcess?.id) {
        useAppStore.setState({ currentProcess: result.process });
      }

      updateLastSaved();
      console.log('✅ Saved to database:', result.process.id);
    } catch (err: any) {
      console.error('❌ Failed to save:', err);
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
    <div className="relative w-full h-full flex flex-col bg-gray-50">
      {/* Toolbar */}
      <div className="h-12 border-b border-gray-200 bg-white flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary-600 transition-colors text-sm"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
          {isAutoSaving ? (
            <span className="text-xs text-blue-600 font-medium">• Auto-saving...</span>
          ) : editor.isDirty ? (
            <span className="text-xs text-amber-600 font-medium">• Unsaved changes</span>
          ) : null}
          <div className="w-px h-6 bg-gray-300 mx-2" />
          <button
            onClick={handleUndo}
            disabled={!canUndo}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Undo"
          >
            <Undo className="w-4 h-4" />
          </button>
          <button
            onClick={handleRedo}
            disabled={!canRedo}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Redo"
          >
            <Redo className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomOut}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-600 min-w-[60px] text-center">
            {Math.round(editor.zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleFitViewport}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Fit to Viewport"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-gray-300 mx-2" />
          <button
            onClick={handleExportSVG}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Export SVG"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* BPMN Canvas */}
      <div className="flex-1 relative">
        {error && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-100 text-red-800 px-4 py-2 rounded-lg shadow-lg z-50">
            {error}
          </div>
        )}
        <div ref={containerRef} className="w-full h-full bpmn-container" />
      </div>

      {/* Status Bar */}
      <div className="h-8 border-t border-gray-200 bg-white flex items-center justify-between px-4 text-xs text-gray-600">
        <div>
          {editor.lastSaved
            ? `Last saved: ${new Date(editor.lastSaved).toLocaleTimeString()}`
            : 'Not saved'}
        </div>
        <div className="flex items-center gap-4">
          <span>Editing mode</span>
          <span>Ready</span>
        </div>
      </div>
    </div>
  );
}
