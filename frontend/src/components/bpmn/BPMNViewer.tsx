import { useEffect, useRef, useState } from 'react';
import BpmnViewer from 'bpmn-js/lib/NavigatedViewer';
import { useAppStore } from '../../store/useAppStore';
import { ZoomIn, ZoomOut, Maximize2, Download } from 'lucide-react';

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

export function BPMNViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const { currentBpmnXml, setZoom, editor } = useAppStore();
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const lastLoadedXmlRef = useRef<string | null>(null);

  // Initialize viewer once
  useEffect(() => {
    if (!containerRef.current) return;

    console.log('[BPMNViewer] Initializing...');
    viewerRef.current = new BpmnViewer({
      container: containerRef.current,
    });

    setIsReady(true);

    return () => {
      console.log('[BPMNViewer] Destroying...');
      viewerRef.current?.destroy();
      viewerRef.current = null;
      setIsReady(false);
    };
  }, []);

  // Load diagram when ready or when XML changes
  useEffect(() => {
    if (!isReady || !viewerRef.current) return;

    const xmlToLoad = currentBpmnXml || EMPTY_BPMN;

    // Skip if same XML already loaded
    if (lastLoadedXmlRef.current === xmlToLoad) {
      return;
    }

    console.log('[BPMNViewer] Loading diagram...', xmlToLoad.substring(0, 50));
    loadDiagram(xmlToLoad);
  }, [isReady, currentBpmnXml]);

  const loadDiagram = async (xml: string) => {
    if (!viewerRef.current) return;

    const xmlToLoad = xml && xml.trim() ? xml : EMPTY_BPMN;

    try {
      setError(null);
      await viewerRef.current.importXML(xmlToLoad);
      lastLoadedXmlRef.current = xmlToLoad;
      console.log('[BPMNViewer] Diagram loaded successfully');

      // Fit diagram to viewport
      const canvas = viewerRef.current.get('canvas');
      canvas.zoom('fit-viewport');
    } catch (err: any) {
      setError(err.message || 'Failed to load BPMN diagram');
      console.error('[BPMNViewer] Error loading BPMN:', err);

      // Try loading empty diagram as fallback
      if (xmlToLoad !== EMPTY_BPMN) {
        console.log('[BPMNViewer] Loading empty diagram as fallback');
        lastLoadedXmlRef.current = EMPTY_BPMN;
        try {
          await viewerRef.current.importXML(EMPTY_BPMN);
          const canvas = viewerRef.current.get('canvas');
          canvas.zoom('fit-viewport');
        } catch (e) {
          console.error('[BPMNViewer] Failed to load fallback:', e);
        }
      }
    }
  };

  const handleZoomIn = () => {
    const canvas = viewerRef.current?.get('canvas');
    if (canvas) {
      const currentZoom = canvas.zoom();
      const newZoom = Math.min(currentZoom + 0.1, 4);
      canvas.zoom(newZoom);
      setZoom(newZoom);
    }
  };

  const handleZoomOut = () => {
    const canvas = viewerRef.current?.get('canvas');
    if (canvas) {
      const currentZoom = canvas.zoom();
      const newZoom = Math.max(currentZoom - 0.1, 0.2);
      canvas.zoom(newZoom);
      setZoom(newZoom);
    }
  };

  const handleFitViewport = () => {
    const canvas = viewerRef.current?.get('canvas');
    if (canvas) {
      canvas.zoom('fit-viewport');
      setZoom(1);
    }
  };

  const handleExportSVG = async () => {
    try {
      const { svg } = await viewerRef.current.saveSVG();
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
          <span className="text-sm text-slate-500">
            {editor.mode === 'view' ? 'Viewing' : 'Editing'}
          </span>
          {editor.isDirty && (
            <span className="text-xs text-amber-600 font-medium">Unsaved</span>
          )}
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
          <span>Ready</span>
        </div>
      </div>
    </div>
  );
}
