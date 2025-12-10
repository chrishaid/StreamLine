import { useEffect, useRef, useState } from 'react';
import BpmnViewer from 'bpmn-js/lib/NavigatedViewer';
import { FileText } from 'lucide-react';
import { processApi } from '../../services/api';

interface BPMNThumbnailProps {
  processId: string;
  className?: string;
}

export function BPMNThumbnail({ processId, className = '' }: BPMNThumbnailProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [bpmnXml, setBpmnXml] = useState<string | null>(null);

  // Fetch BPMN XML
  useEffect(() => {
    let cancelled = false;

    const fetchBpmn = async () => {
      try {
        const version = await processApi.getCurrentVersion(processId);
        if (!cancelled && version?.bpmn_xml) {
          setBpmnXml(version.bpmn_xml);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[BPMNThumbnail] Error fetching BPMN:', err);
          setError(true);
          setIsLoading(false);
        }
      }
    };

    fetchBpmn();

    return () => {
      cancelled = true;
    };
  }, [processId]);

  // Initialize viewer and render diagram when XML is available
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !bpmnXml) return;

    const renderDiagram = async () => {
      try {
        // Create a minimal viewer without navigation controls
        viewerRef.current = new BpmnViewer({
          container,
        });

        await viewerRef.current.importXML(bpmnXml);

        // Fit diagram to viewport
        const canvas = viewerRef.current.get('canvas');
        canvas.zoom('fit-viewport');

        setIsLoading(false);
      } catch (err) {
        console.error('[BPMNThumbnail] Error rendering diagram:', err);
        setError(true);
        setIsLoading(false);
      }
    };

    renderDiagram();

    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, [bpmnXml]);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-slate-50 ${className}`}>
        <FileText className="w-8 h-8 text-slate-300" />
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
          <div className="w-5 h-5 border-2 border-slate-200 border-t-accent rounded-full animate-spin" />
        </div>
      )}
      <div
        ref={containerRef}
        className="w-full h-full bg-white"
        style={{ pointerEvents: 'none' }}
      />
    </div>
  );
}
