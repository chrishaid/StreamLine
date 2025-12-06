import axios from 'axios';
import type { ChatMessageRequest, ChatMessageResponse, Process, CreateProcessRequest, UpdateProcessRequest } from '../types';
import { supabase } from '../lib/supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Axios client for Claude API calls (still needs backend)
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds for Claude API responses
});

// Add Supabase auth token to backend requests
apiClient.interceptors.request.use(
  async (config) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Helper to map database row to Process type
function mapDbRowToProcess(row: any): Process {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    status: row.status,
    ownerId: row.owner_id,
    departmentId: row.department_id || '',
    primaryCategoryId: row.primary_category_id,
    secondaryCategoryIds: row.secondary_category_ids || [],
    tags: row.tags || [],
    currentVersionId: row.current_version_id || '',
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    viewCount: row.view_count || 0,
    editCount: row.edit_count || 0,
    isFavorite: row.is_favorite || false,
    relatedProcessIds: row.related_process_ids || [],
    metadata: row.metadata || {},
  };
}

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

// Process API - Using Supabase
export const processApi = {
  getAll: async (params?: {
    status?: string;
    categoryId?: string;
    search?: string;
    ownerId?: string;
    tags?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ processes: Process[]; total: number; limit: number; offset: number }> => {
    let query = supabase.from('processes').select('*', { count: 'exact' });

    if (params?.status) {
      query = query.eq('status', params.status);
    }
    if (params?.categoryId) {
      query = query.eq('primary_category_id', params.categoryId);
    }
    if (params?.ownerId) {
      query = query.eq('owner_id', params.ownerId);
    }
    if (params?.search) {
      query = query.or(`name.ilike.%${params.search}%,description.ilike.%${params.search}%`);
    }
    if (params?.tags) {
      query = query.contains('tags', [params.tags]);
    }

    const limit = params?.limit || 50;
    const offset = params?.offset || 0;

    query = query.order('updated_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      processes: (data || []).map(mapDbRowToProcess),
      total: count || 0,
      limit,
      offset,
    };
  },

  getById: async (id: string): Promise<Process> => {
    const { data, error } = await supabase.from('processes').select('*').eq('id', id).single();

    if (error) throw error;
    if (!data) throw new Error('Process not found');

    return mapDbRowToProcess(data);
  },

  create: async (data: CreateProcessRequest & { bpmnXml?: string }): Promise<{ process: Process; version: any }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Create process version first
    const { data: version, error: versionError } = await supabase
      .from('process_versions')
      .insert({
        version_number: '1.0',
        major_version: 1,
        minor_version: 0,
        bpmn_xml: data.bpmnXml || '<?xml version="1.0" encoding="UTF-8"?><bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"></bpmn:definitions>',
        change_type: 'major',
        created_by: user.id,
        branch_name: 'main',
      })
      .select()
      .single();

    if (versionError) throw versionError;

    // Create process
    const { data: process, error: processError } = await supabase
      .from('processes')
      .insert({
        name: data.name,
        description: data.description || '',
        status: 'draft',
        owner_id: user.id,
        created_by: user.id,
        updated_by: user.id,
        primary_category_id: data.primaryCategoryId,
        tags: data.tags || [],
        current_version_id: version.id,
      })
      .select()
      .single();

    if (processError) throw processError;

    // Update version with process_id
    await supabase.from('process_versions').update({ process_id: process.id }).eq('id', version.id);

    return {
      process: mapDbRowToProcess(process),
      version,
    };
  },

  update: async (id: string, data: UpdateProcessRequest): Promise<Process> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const updateData: any = {
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.primaryCategoryId !== undefined) updateData.primary_category_id = data.primaryCategoryId;
    if (data.secondaryCategoryIds !== undefined) updateData.secondary_category_ids = data.secondaryCategoryIds;
    if (data.tags !== undefined) updateData.tags = data.tags;

    const { data: process, error } = await supabase
      .from('processes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!process) throw new Error('Process not found');

    return mapDbRowToProcess(process);
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('processes').delete().eq('id', id);

    if (error) throw error;
  },

  duplicate: async (id: string, name: string): Promise<{ process: Process; version: any }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get original process
    const original = await processApi.getById(id);
    const originalVersion = await processApi.getCurrentVersion(id);

    // Create new version
    const { data: version, error: versionError } = await supabase
      .from('process_versions')
      .insert({
        version_number: '1.0',
        major_version: 1,
        minor_version: 0,
        bpmn_xml: originalVersion.bpmn_xml,
        change_type: 'major',
        created_by: user.id,
        branch_name: 'main',
        change_summary: `Duplicated from ${original.name}`,
      })
      .select()
      .single();

    if (versionError) throw versionError;

    // Create new process
    const { data: process, error: processError } = await supabase
      .from('processes')
      .insert({
        name,
        description: original.description,
        status: 'draft',
        owner_id: user.id,
        created_by: user.id,
        updated_by: user.id,
        primary_category_id: original.primaryCategoryId,
        tags: original.tags,
        current_version_id: version.id,
      })
      .select()
      .single();

    if (processError) throw processError;

    // Update version with process_id
    await supabase.from('process_versions').update({ process_id: process.id }).eq('id', version.id);

    return {
      process: mapDbRowToProcess(process),
      version,
    };
  },

  // Version management
  getVersions: async (id: string): Promise<any[]> => {
    const { data, error } = await supabase
      .from('process_versions')
      .select('*')
      .eq('process_id', id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  },

  getCurrentVersion: async (id: string): Promise<any> => {
    const process = await processApi.getById(id);

    if (!process.currentVersionId) {
      throw new Error('Process has no current version');
    }

    const { data, error } = await supabase
      .from('process_versions')
      .select('*')
      .eq('id', process.currentVersionId)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Version not found');

    return data;
  },

  createVersion: async (
    id: string,
    data: {
      bpmnXml: string;
      changeSummary: string;
      changeType: 'major' | 'minor' | 'patch';
    }
  ): Promise<any> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get current version to calculate new version number
    const currentVersion = await processApi.getCurrentVersion(id);
    let majorVersion = currentVersion.major_version;
    let minorVersion = currentVersion.minor_version;

    if (data.changeType === 'major') {
      majorVersion += 1;
      minorVersion = 0;
    } else if (data.changeType === 'minor') {
      minorVersion += 1;
    }

    const versionNumber = `${majorVersion}.${minorVersion}`;

    // Create new version
    const { data: version, error: versionError } = await supabase
      .from('process_versions')
      .insert({
        process_id: id,
        version_number: versionNumber,
        major_version: majorVersion,
        minor_version: minorVersion,
        bpmn_xml: data.bpmnXml,
        change_type: data.changeType,
        change_summary: data.changeSummary,
        created_by: user.id,
        branch_name: 'main',
        parent_version_id: currentVersion.id,
      })
      .select()
      .single();

    if (versionError) throw versionError;

    // Update process with new current version
    await supabase
      .from('processes')
      .update({ current_version_id: version.id, updated_by: user.id })
      .eq('id', id);

    return version;
  },
};

// Health check
export const healthCheck = async (): Promise<{ status: string; timestamp: string }> => {
  const response = await apiClient.get('/health');
  return response.data;
};

export default apiClient;
