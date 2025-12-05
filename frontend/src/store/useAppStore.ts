import { create } from 'zustand';
import { Process, Category, ChatMessage, UIState, BPMNEditorState } from '../types';
import { AuthUser } from '../services/authApi';

interface AppState {
  // Authentication State
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  setUser: (user: AuthUser | null) => void;
  setAuthLoading: (loading: boolean) => void;
  logout: () => void;

  // UI State
  ui: UIState;
  setActiveView: (view: UIState['activeView']) => void;
  toggleSidebar: () => void;
  toggleChatPanel: () => void;
  setSelectedProcess: (process: Process | null) => void;
  setSelectedCategory: (category: Category | null) => void;

  // Process Management
  processes: Process[];
  setProcesses: (processes: Process[]) => void;
  addProcess: (process: Process) => void;
  updateProcess: (id: string, updates: Partial<Process>) => void;
  deleteProcess: (id: string) => void;
  currentProcess: Process | null;
  setCurrentProcess: (process: Process | null) => void;

  // Category Management
  categories: Category[];
  setCategories: (categories: Category[]) => void;
  addCategory: (category: Category) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;

  // BPMN Editor State
  editor: BPMNEditorState;
  setEditorMode: (mode: 'view' | 'edit') => void;
  setSelectedElement: (elementId: string | null) => void;
  setZoom: (zoom: number) => void;
  markDirty: () => void;
  markClean: () => void;
  updateLastSaved: () => void;

  // BPMN XML
  currentBpmnXml: string | null;
  setCurrentBpmnXml: (xml: string) => void;

  // Chat State
  chatMessages: ChatMessage[];
  addChatMessage: (message: ChatMessage) => void;
  clearChat: () => void;
  currentSessionId: string | null;
  setCurrentSessionId: (sessionId: string | null) => void;

  // Loading States
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  loadingMessage: string | null;
  setLoadingMessage: (message: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Authentication State
  user: null,
  isAuthenticated: false,
  isAuthLoading: true,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setAuthLoading: (loading) => set({ isAuthLoading: loading }),
  logout: () => set({ user: null, isAuthenticated: false }),

  // Initial UI State
  ui: {
    sidebarCollapsed: false,
    chatPanelCollapsed: false,
    activeView: 'browse',
    selectedProcess: null,
    selectedCategory: null,
  },
  setActiveView: (view) =>
    set((state) => ({ ui: { ...state.ui, activeView: view } })),
  toggleSidebar: () =>
    set((state) => ({
      ui: { ...state.ui, sidebarCollapsed: !state.ui.sidebarCollapsed },
    })),
  toggleChatPanel: () =>
    set((state) => ({
      ui: { ...state.ui, chatPanelCollapsed: !state.ui.chatPanelCollapsed },
    })),
  setSelectedProcess: (process) =>
    set((state) => ({ ui: { ...state.ui, selectedProcess: process } })),
  setSelectedCategory: (category) =>
    set((state) => ({ ui: { ...state.ui, selectedCategory: category } })),

  // Process Management
  processes: [],
  setProcesses: (processes) => set({ processes }),
  addProcess: (process) =>
    set((state) => ({ processes: [...state.processes, process] })),
  updateProcess: (id, updates) =>
    set((state) => ({
      processes: state.processes.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    })),
  deleteProcess: (id) =>
    set((state) => ({
      processes: state.processes.filter((p) => p.id !== id),
    })),
  currentProcess: null,
  setCurrentProcess: (process) => set({ currentProcess: process }),

  // Category Management
  categories: [],
  setCategories: (categories) => set({ categories }),
  addCategory: (category) =>
    set((state) => ({ categories: [...state.categories, category] })),
  updateCategory: (id, updates) =>
    set((state) => ({
      categories: state.categories.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    })),
  deleteCategory: (id) =>
    set((state) => ({
      categories: state.categories.filter((c) => c.id !== id),
    })),

  // BPMN Editor State
  editor: {
    mode: 'view',
    selectedElement: null,
    zoom: 1,
    isDirty: false,
    lastSaved: null,
  },
  setEditorMode: (mode) =>
    set((state) => ({ editor: { ...state.editor, mode } })),
  setSelectedElement: (elementId) =>
    set((state) => ({ editor: { ...state.editor, selectedElement: elementId } })),
  setZoom: (zoom) =>
    set((state) => ({ editor: { ...state.editor, zoom } })),
  markDirty: () =>
    set((state) => ({ editor: { ...state.editor, isDirty: true } })),
  markClean: () =>
    set((state) => ({ editor: { ...state.editor, isDirty: false } })),
  updateLastSaved: () =>
    set((state) => ({
      editor: { ...state.editor, lastSaved: new Date(), isDirty: false },
    })),

  // BPMN XML
  currentBpmnXml: null,
  setCurrentBpmnXml: (xml) => set({ currentBpmnXml: xml }),

  // Chat State
  chatMessages: [],
  addChatMessage: (message) =>
    set((state) => ({ chatMessages: [...state.chatMessages, message] })),
  clearChat: () => set({ chatMessages: [] }),
  currentSessionId: null,
  setCurrentSessionId: (sessionId) => set({ currentSessionId: sessionId }),

  // Loading States
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
  loadingMessage: null,
  setLoadingMessage: (message) => set({ loadingMessage: message }),
}));
