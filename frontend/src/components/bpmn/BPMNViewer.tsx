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
  const { currentBpmnXml, setCurrentBpmnXml, setZoom, editor } = useAppStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize BPMN viewer
    viewerRef.current = new BpmnViewer({
      container: containerRef.current,
      keyboard: {
        bindTo: document,
      },
    });

    // Load initial diagram
    loadDiagram(currentBpmnXml || EMPTY_BPMN);

    return () => {
      viewerRef.current?.destroy();
    };
  }, []);

  useEffect(() => {
    if (viewerRef.current) {
      // Load current XML or empty diagram if null
      loadDiagram(currentBpmnXml || EMPTY_BPMN);
    }
  }, [currentBpmnXml]);

  const loadDiagram = async (xml: string | null | undefined) => {
    if (!viewerRef.current) return;

    // Use EMPTY_BPMN if xml is null, undefined, or empty
    const xmlToLoad = xml && xml.trim() ? xml : EMPTY_BPMN;

    try {
      setError(null);
      await viewerRef.current.importXML(xmlToLoad);

      // Fit diagram to viewport
      const canvas = viewerRef.current.get('canvas');
      canvas.zoom('fit-viewport');

      // Only update store if loading from external source (not from store itself) and it's valid XML
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
    <div className="relative w-full h-full flex flex-col bg-gray-50">
      {/* Toolbar */}
      <div className="h-12 border-b border-gray-200 bg-white flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">
            {editor.mode === 'view' ? 'Viewing' : 'Editing'}
          </span>
          {editor.isDirty && (
            <span className="text-xs text-amber-600 font-medium">• Unsaved changes</span>
          )}
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
          <span>Elements: 0</span>
          <span>Ready</span>
        </div>
      </div>
    </div>
  );
}
