import axios from 'axios';
import { ChatMessageRequest, ChatMessageResponse, Process, CreateProcessRequest, UpdateProcessRequest } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds for Claude API responses
});

// Chat API
export const chatApi = {
  sendMessage: async (request: ChatMessageRequest): Promise<ChatMessageResponse> => {
    const response = await apiClient.post<ChatMessageResponse>('/api/chat/message', request);
    return response.data;
  },

  getSuggestions: async (bpmnXml: string): Promise<string[]> => {
    const response = await apiClient.post<{ suggestions: string[] }>('/api/chat/suggestions', {
      bpmnXml,
    });
    return response.data.suggestions;
  },
};

// Process API
export const processApi = {
  getAll: async (params?: {
    status?: string;
    categoryId?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ processes: Process[]; total: number; limit: number; offset: number }> => {
    const response = await apiClient.get('/api/processes', { params });
    return response.data;
  },

  getById: async (id: string): Promise<Process> => {
    const response = await apiClient.get<Process>(`/api/processes/${id}`);
    return response.data;
  },

  create: async (data: CreateProcessRequest): Promise<Process> => {
    const response = await apiClient.post<Process>('/api/processes', data);
    return response.data;
  },

  update: async (id: string, data: UpdateProcessRequest): Promise<Process> => {
    const response = await apiClient.put<Process>(`/api/processes/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/processes/${id}`);
  },
};

// Health check
export const healthCheck = async (): Promise<{ status: string; timestamp: string }> => {
  const response = await apiClient.get('/health');
  return response.data;
};

export default apiClient;
