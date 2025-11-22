// Re-export shared types
export * from '../../../shared/types';

// Frontend-specific types

export interface BPMNModelerInstance {
  importXML: (xml: string) => Promise<{ warnings: any[] }>;
  saveXML: () => Promise<{ xml: string }>;
  saveSVG: () => Promise<{ svg: string }>;
  get: (name: string) => any;
  on: (event: string, callback: (e: any) => void) => void;
  off: (event: string, callback: (e: any) => void) => void;
  destroy: () => void;
}

export interface RouteParams {
  processId?: string;
  versionId?: string;
  categoryId?: string;
}
