import axios from 'axios';
import { ChatMessageRequest, ChatMessageResponse, Process, CreateProcessRequest, UpdateProcessRequest } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 120000, // 2 minutes for Claude API responses (streaming handles longer responses)
});

// Chat API
export const chatApi = {
  sendMessage: async (request: ChatMessageRequest): Promise<ChatMessageResponse> => {
    const response = await apiClient.post<ChatMessageResponse>('/api/chat/message', request);
    return response.data;
  },

  sendMessageStream: async function* (request: ChatMessageRequest) {
    const response = await fetch(`${API_BASE_URL}/api/chat/message/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data.trim()) {
              try {
                const parsed = JSON.parse(data);
                yield parsed;
              } catch (e) {
                console.error('Failed to parse SSE data:', data);
              }
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
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
  }): Promise<{ processes: Process[]; total: number }> => {
    const response = await apiClient.get('/api/processes', { params });
    return response.data;
  },

  getById: async (id: string): Promise<{ process: Process }> => {
    const response = await apiClient.get(`/api/processes/${id}`);
    return response.data;
  },

  create: async (data: { name: string; bpmnXml: string; description?: string }): Promise<{ process: Process }> => {
    const response = await apiClient.post('/api/processes', data);
    return response.data;
  },

  update: async (id: string, data: { name: string; bpmnXml: string; description?: string }): Promise<{ process: Process }> => {
    const response = await apiClient.put(`/api/processes/${id}`, data);
    return response.data;
  },

  save: async (data: { id?: string; name: string; bpmnXml: string; description?: string }): Promise<{ process: Process }> => {
    if (data.id) {
      return processApi.update(data.id, data);
    } else {
      return processApi.create(data);
    }
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
