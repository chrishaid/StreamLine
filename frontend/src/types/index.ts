// Shared types
// Force module reload

export interface Process {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'archived';
  ownerId: string;
  departmentId: string;
  primaryCategoryId: string;
  secondaryCategoryIds: string[];
  tags: string[];
  currentVersionId: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  viewCount: number;
  editCount: number;
  isFavorite: boolean;
  relatedProcessIds: string[];
  metadata: Record<string, any>;
}

export interface ProcessVersion {
  id: string;
  processId: string;
  versionNumber: string;
  majorVersion: number;
  minorVersion: number;
  bpmnXml: string;
  bpmnFileUrl: string;
  changeSummary: string;
  changeType: 'major' | 'minor' | 'patch';
  tags: string[];
  parentVersionId: string | null;
  branchName: string;
  createdAt: Date;
  createdBy: string;
  metadata: {
    elementCount: number;
    poolCount: number;
    laneCount: number;
    taskCount: number;
  };
}

export interface Category {
  id: string;
  name: string;
  description: string;
  parentId: string | null;
  path: string;
  level: number;
  order: number;
  icon: string;
  color: string;
  ownerId: string;
  processCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  processId: string | null;
  role: 'user' | 'assistant';
  content: string;
  metadata?: {
    modelUsed?: string;
    tokensUsed?: number;
    latencyMs?: number;
    attachments?: {
      type: 'bpmn-xml' | 'diff' | 'suggestion';
      data: any;
    }[];
  };
  createdAt: Date;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  role: 'viewer' | 'editor' | 'admin';
  departmentId: string;
  preferences: {
    defaultView: string;
    autoSaveInterval: number;
    theme: 'light' | 'dark';
    chatPosition: 'right' | 'left' | 'bottom';
  };
  createdAt: Date;
  lastLoginAt: Date;
}

export interface ChatSession {
  id: string;
  processId: string | null;
  userId: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProcessRequest {
  name: string;
  description?: string;
  primaryCategoryId: string;
  tags?: string[];
}

export interface UpdateProcessRequest {
  name?: string;
  description?: string;
  status?: 'draft' | 'active' | 'archived';
  primaryCategoryId?: string;
  secondaryCategoryIds?: string[];
  tags?: string[];
}

export interface ChatMessageRequest {
  sessionId?: string;
  processId?: string;
  message: string;
  includeContext?: boolean;
  bpmnXml?: string;
  diagramImage?: string; // Base64 encoded SVG
}

export interface ChatMessageResponse {
  message: ChatMessage;
  sessionId: string;
  suggestions?: string[];
}

export interface BPMNEditorState {
  mode: 'view' | 'edit';
  selectedElement: string | null;
  zoom: number;
  isDirty: boolean;
  lastSaved: Date | null;
}

export interface UIState {
  sidebarCollapsed: boolean;
  chatPanelCollapsed: boolean;
  activeView: 'browse' | 'recent' | 'favorites' | 'search';
  selectedProcess: Process | null;
  selectedCategory: Category | null;
}

export interface APIError {
  code: string;
  message: string;
  details?: any;
}

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
