import axios from 'axios';
import type {
  ChatMessageRequest,
  ChatMessageResponse,
  Process,
  CreateProcessRequest,
  UpdateProcessRequest,
  Organization,
  OrganizationMember,
  OrganizationTag,
  OrganizationInvitation,
  OrganizationWithMembership,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
  InviteMemberRequest,
  UpdateMemberRequest,
  CreateOrganizationTagRequest,
  UpdateOrganizationTagRequest,
} from '../types';
import { supabase } from '../lib/supabase';

// For Vercel deployment, chat API uses local serverless functions
// VITE_API_URL is only needed for local development with the Express backend
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// Axios client (kept for potential future use, but chat now uses fetch for streaming)
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
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

// Helper to get auth token for fetch requests
async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  return headers;
}

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
    organizationId: row.organization_id || null,
  };
}

// Chat API - Uses fetch for SSE streaming support
export const chatApi = {
  sendMessage: async (request: ChatMessageRequest): Promise<ChatMessageResponse> => {
    const headers = await getAuthHeaders();

    const response = await fetch('/api/chat/message', {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP ${response.status}`);
    }

    // Handle SSE streaming response
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let fullContent = '';
    let sessionId = request.sessionId || '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value, { stream: true });
      const lines = text.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'content') {
              fullContent = data.fullContent;
              sessionId = data.sessionId;
            } else if (data.type === 'done') {
              sessionId = data.sessionId;
            } else if (data.type === 'error') {
              throw new Error(data.error);
            }
          } catch (e) {
            // Skip non-JSON lines (like 'event: connected')
          }
        }
      }
    }

    return {
      message: {
        id: crypto.randomUUID(),
        sessionId,
        processId: request.processId || null,
        role: 'assistant',
        content: fullContent,
        createdAt: new Date(),
      },
      sessionId,
    };
  },

  // Streaming version for real-time updates
  sendMessageStream: async function* (request: ChatMessageRequest): AsyncGenerator<{
    type: 'content' | 'done' | 'error';
    content?: string;
    fullContent?: string;
    sessionId?: string;
    error?: string;
  }> {
    const headers = await getAuthHeaders();

    const response = await fetch('/api/chat/message', {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      yield { type: 'error', error: errorData.error?.message || `HTTP ${response.status}` };
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      yield { type: 'error', error: 'No response body' };
      return;
    }

    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value, { stream: true });
      const lines = text.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            yield data;
          } catch (e) {
            // Skip non-JSON lines
          }
        }
      }
    }
  },

  getSuggestions: async (bpmnXml: string): Promise<string[]> => {
    const headers = await getAuthHeaders();

    const response = await fetch('/api/chat/suggestions', {
      method: 'POST',
      headers,
      body: JSON.stringify({ bpmnXml }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.suggestions;
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
    organizationId?: string | null; // null = personal processes, undefined = all accessible
    limit?: number;
    offset?: number;
  }): Promise<{ processes: Process[]; total: number; limit: number; offset: number }> => {
    console.log('[API] processApi.getAll called with organizationId:', params?.organizationId, 'type:', typeof params?.organizationId);
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
    // Organization filtering
    if (params?.organizationId !== undefined) {
      if (params.organizationId === null) {
        // Show only personal processes (no organization)
        console.log('[API] Filtering for personal processes (organization_id IS NULL)');
        query = query.is('organization_id', null);
      } else {
        // Show only processes for specific organization
        console.log('[API] Filtering for organization:', params.organizationId);
        query = query.eq('organization_id', params.organizationId);
      }
    } else {
      console.log('[API] No organization filter (showing all accessible)');
    }
    // If organizationId is undefined, show all accessible processes (RLS handles this)

    const limit = params?.limit || 50;
    const offset = params?.offset || 0;

    query = query.order('updated_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    console.log('[API] Query returned', data?.length, 'processes. First few org_ids:', data?.slice(0, 5).map((p: any) => ({ name: p.name, org_id: p.organization_id })));

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

  create: async (data: CreateProcessRequest & { bpmnXml?: string; organizationId?: string | null }): Promise<{ process: Process; version: any }> => {
    console.log('[API] processApi.create called with:', { name: data.name, hasBpmn: !!data.bpmnXml, organizationId: data.organizationId });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    console.log('[API] Authenticated as:', user.email);

    // First ensure user exists in public.users table
    const { data: existingUser, error: userCheckError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!existingUser && !userCheckError) {
      // User doesn't exist, try to create
      const { error: createUserError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email!,
          name: user.user_metadata?.full_name || user.email!,
          avatar_url: user.user_metadata?.avatar_url || null,
          role: 'editor',
          last_login_at: new Date().toISOString(),
        });
      if (createUserError) {
        console.warn('Could not create user profile:', createUserError);
      }
    }

    // Build process data - only include primary_category_id if it's a valid UUID
    const processInsertData: any = {
      name: data.name,
      description: data.description || '',
      status: 'draft',
      owner_id: user.id,
      created_by: user.id,
      updated_by: user.id,
      tags: data.tags || [],
    };

    // Set organization_id if provided (null means personal, undefined means don't set)
    if (data.organizationId !== undefined) {
      processInsertData.organization_id = data.organizationId;
    }

    // Only add primary_category_id if it's provided and not empty
    if (data.primaryCategoryId && data.primaryCategoryId.trim() !== '') {
      processInsertData.primary_category_id = data.primaryCategoryId;
    }

    // Create process first (without current_version_id)
    console.log('[API] Inserting process:', processInsertData);
    const { data: process, error: processError } = await supabase
      .from('processes')
      .insert(processInsertData)
      .select()
      .single();

    if (processError) {
      console.error('[API] Process creation error:', processError);
      throw processError;
    }
    console.log('[API] Process created:', process.id);

    // Create process version with process_id
    const { data: version, error: versionError } = await supabase
      .from('process_versions')
      .insert({
        process_id: process.id,
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

    if (versionError) {
      console.error('Version creation error:', versionError);
      // Try to clean up the process if version creation fails
      await supabase.from('processes').delete().eq('id', process.id);
      throw versionError;
    }

    // Update process with current_version_id
    const { data: updatedProcess, error: updateError } = await supabase
      .from('processes')
      .update({ current_version_id: version.id })
      .eq('id', process.id)
      .select()
      .single();

    if (updateError) {
      console.error('Process update error:', updateError);
      throw updateError;
    }

    return {
      process: mapDbRowToProcess(updatedProcess),
      version,
    };
  },

  update: async (id: string, data: UpdateProcessRequest): Promise<Process> => {
    console.log('[API] processApi.update called:', { id, data });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    console.log('[API] Authenticated user for update:', user.email);

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
    if (data.isFavorite !== undefined) updateData.is_favorite = data.isFavorite;

    console.log('[API] Sending update to Supabase:', { id, updateData });

    const { data: process, error } = await supabase
      .from('processes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[API] Supabase update error:', error);
      throw error;
    }
    if (!process) {
      console.error('[API] No process returned from update');
      throw new Error('Process not found');
    }

    console.log('[API] Update successful, returned process:', process);
    return mapDbRowToProcess(process);
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('processes').delete().eq('id', id);

    if (error) throw error;
  },

  duplicate: async (id: string, name: string, targetOrganizationId?: string | null): Promise<{ process: Process; version: any }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get original process and version
    const original = await processApi.getById(id);
    const originalVersion = await processApi.getCurrentVersion(id);

    // Build process data - only include primary_category_id if it's valid
    const processInsertData: any = {
      name,
      description: original.description,
      status: 'draft',
      owner_id: user.id,
      created_by: user.id,
      updated_by: user.id,
      tags: original.tags,
      organization_id: targetOrganizationId === undefined ? original.organizationId : targetOrganizationId,
    };

    if (original.primaryCategoryId && original.primaryCategoryId.trim() !== '') {
      processInsertData.primary_category_id = original.primaryCategoryId;
    }

    // Create new process first
    const { data: process, error: processError } = await supabase
      .from('processes')
      .insert(processInsertData)
      .select()
      .single();

    if (processError) {
      console.error('Duplicate process creation error:', processError);
      throw processError;
    }

    // Create new version with process_id
    const { data: version, error: versionError } = await supabase
      .from('process_versions')
      .insert({
        process_id: process.id,
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

    if (versionError) {
      console.error('Duplicate version creation error:', versionError);
      await supabase.from('processes').delete().eq('id', process.id);
      throw versionError;
    }

    // Update process with current_version_id
    const { data: updatedProcess, error: updateError } = await supabase
      .from('processes')
      .update({ current_version_id: version.id })
      .eq('id', process.id)
      .select()
      .single();

    if (updateError) {
      console.error('Duplicate process update error:', updateError);
      throw updateError;
    }

    return {
      process: mapDbRowToProcess(updatedProcess),
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

// Helper to map database row to Organization type
function mapDbRowToOrganization(row: any): Organization {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    logoUrl: row.logo_url,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    settings: row.settings || {},
  };
}

function mapDbRowToOrganizationMember(row: any): OrganizationMember {
  return {
    id: row.id,
    organizationId: row.organization_id,
    userId: row.user_id,
    role: row.role,
    invitedBy: row.invited_by,
    invitedAt: new Date(row.invited_at),
    joinedAt: row.joined_at ? new Date(row.joined_at) : undefined,
    status: row.status,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    user: row.users ? {
      id: row.users.id,
      name: row.users.name,
      email: row.users.email,
      avatarUrl: row.users.avatar_url,
    } : undefined,
  };
}

function mapDbRowToOrganizationTag(row: any): OrganizationTag {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    parentTagId: row.parent_tag_id,
    description: row.description,
    color: row.color,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function mapDbRowToOrganizationInvitation(row: any): OrganizationInvitation {
  return {
    id: row.id,
    organizationId: row.organization_id,
    email: row.email,
    role: row.role,
    invitedBy: row.invited_by,
    token: row.token,
    expiresAt: new Date(row.expires_at),
    acceptedAt: row.accepted_at ? new Date(row.accepted_at) : undefined,
    createdAt: new Date(row.created_at),
  };
}

// Organization API
export const organizationApi = {
  // Get all organizations the current user belongs to
  getMyOrganizations: async (): Promise<OrganizationWithMembership[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('organization_members')
      .select(`
        role,
        organizations (
          id,
          name,
          slug,
          description,
          logo_url,
          created_by,
          created_at,
          updated_at,
          settings
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (error) throw error;

    return (data || []).map((row: any) => ({
      ...mapDbRowToOrganization(row.organizations),
      currentUserRole: row.role,
    }));
  },

  // Get a single organization by ID
  getById: async (id: string): Promise<OrganizationWithMembership> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Organization not found');

    // Get current user's role
    const { data: memberData } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    // Get counts
    const { count: memberCount } = await supabase
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', id)
      .eq('status', 'active');

    const { count: processCount } = await supabase
      .from('processes')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', id);

    return {
      ...mapDbRowToOrganization(data),
      currentUserRole: memberData?.role,
      memberCount: memberCount || 0,
      processCount: processCount || 0,
    };
  },

  // Get organization by slug
  getBySlug: async (slug: string): Promise<OrganizationWithMembership> => {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Organization not found');

    return organizationApi.getById(data.id);
  },

  // Create a new organization
  create: async (request: CreateOrganizationRequest): Promise<Organization> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Use the helper function to create org and add owner
    const { data, error } = await supabase.rpc('create_organization', {
      org_name: request.name,
      org_slug: request.slug,
      org_description: request.description || null,
    });

    if (error) throw error;

    // Fetch the created organization
    return organizationApi.getById(data);
  },

  // Update an organization
  update: async (id: string, request: UpdateOrganizationRequest): Promise<Organization> => {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (request.name !== undefined) updateData.name = request.name;
    if (request.description !== undefined) updateData.description = request.description;
    if (request.logoUrl !== undefined) updateData.logo_url = request.logoUrl;
    if (request.settings !== undefined) updateData.settings = request.settings;

    const { data, error } = await supabase
      .from('organizations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Organization not found');

    return mapDbRowToOrganization(data);
  },

  // Delete an organization
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('organizations').delete().eq('id', id);
    if (error) throw error;
  },

  // Members
  getMembers: async (organizationId: string): Promise<OrganizationMember[]> => {
    const { data, error } = await supabase
      .from('organization_members')
      .select(`
        *,
        users (
          id,
          name,
          email,
          avatar_url
        )
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data || []).map(mapDbRowToOrganizationMember);
  },

  updateMember: async (
    organizationId: string,
    userId: string,
    request: UpdateMemberRequest
  ): Promise<OrganizationMember> => {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (request.role !== undefined) updateData.role = request.role;
    if (request.status !== undefined) updateData.status = request.status;

    const { data, error } = await supabase
      .from('organization_members')
      .update(updateData)
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .select(`
        *,
        users (
          id,
          name,
          email,
          avatar_url
        )
      `)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Member not found');

    return mapDbRowToOrganizationMember(data);
  },

  removeMember: async (organizationId: string, userId: string): Promise<void> => {
    const { error } = await supabase
      .from('organization_members')
      .delete()
      .eq('organization_id', organizationId)
      .eq('user_id', userId);

    if (error) throw error;
  },

  // Invitations
  getInvitations: async (organizationId: string): Promise<OrganizationInvitation[]> => {
    const { data, error } = await supabase
      .from('organization_invitations')
      .select('*')
      .eq('organization_id', organizationId)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(mapDbRowToOrganizationInvitation);
  },

  createInvitation: async (
    organizationId: string,
    request: InviteMemberRequest
  ): Promise<OrganizationInvitation> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('organization_invitations')
      .insert({
        organization_id: organizationId,
        email: request.email,
        role: request.role,
        invited_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    return mapDbRowToOrganizationInvitation(data);
  },

  deleteInvitation: async (invitationId: string): Promise<void> => {
    const { error } = await supabase
      .from('organization_invitations')
      .delete()
      .eq('id', invitationId);

    if (error) throw error;
  },

  acceptInvitation: async (token: string): Promise<string> => {
    const { data, error } = await supabase.rpc('accept_organization_invitation', {
      invitation_token: token,
    });

    if (error) throw error;

    return data;
  },

  // Tags
  getTags: async (organizationId: string): Promise<OrganizationTag[]> => {
    const { data, error } = await supabase
      .from('organization_tags')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name', { ascending: true });

    if (error) throw error;

    return (data || []).map(mapDbRowToOrganizationTag);
  },

  createTag: async (
    organizationId: string,
    request: CreateOrganizationTagRequest
  ): Promise<OrganizationTag> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('organization_tags')
      .insert({
        organization_id: organizationId,
        name: request.name,
        parent_tag_id: request.parentTagId || null,
        description: request.description || null,
        color: request.color || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    return mapDbRowToOrganizationTag(data);
  },

  updateTag: async (
    tagId: string,
    request: UpdateOrganizationTagRequest
  ): Promise<OrganizationTag> => {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (request.name !== undefined) updateData.name = request.name;
    if (request.parentTagId !== undefined) updateData.parent_tag_id = request.parentTagId;
    if (request.description !== undefined) updateData.description = request.description;
    if (request.color !== undefined) updateData.color = request.color;

    const { data, error } = await supabase
      .from('organization_tags')
      .update(updateData)
      .eq('id', tagId)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Tag not found');

    return mapDbRowToOrganizationTag(data);
  },

  deleteTag: async (tagId: string): Promise<void> => {
    const { error } = await supabase.from('organization_tags').delete().eq('id', tagId);
    if (error) throw error;
  },

  // Set current organization for user
  setCurrentOrganization: async (organizationId: string | null): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('users')
      .update({ current_organization_id: organizationId })
      .eq('id', user.id);

    if (error) throw error;
  },

  // Get current user's active organization
  getCurrentOrganization: async (): Promise<OrganizationWithMembership | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('current_organization_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.current_organization_id) {
      return null;
    }

    try {
      return await organizationApi.getById(userData.current_organization_id);
    } catch {
      return null;
    }
  },

  // Send invitation email (uses Vercel serverless function)
  sendInvitationEmail: async (params: {
    email: string;
    organizationName: string;
    inviterName: string;
    role: string;
    inviteToken: string;
  }): Promise<{ success: boolean; messageId?: string }> => {
    const response = await fetch('/api/send-invite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...params,
        frontendUrl: window.location.origin,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || 'Failed to send invitation email');
    }

    return response.json();
  },
};

// User Preferences API
export interface UserPreferencesData {
  theme: 'light' | 'dark';
  chatPosition: 'right' | 'left' | 'bottom';
  autoSaveInterval: number;
  defaultView: string;
}

const DEFAULT_PREFERENCES: UserPreferencesData = {
  theme: 'light',
  chatPosition: 'right',
  autoSaveInterval: 60,
  defaultView: 'browse',
};

export const userPreferencesApi = {
  getPreferences: async (): Promise<UserPreferencesData> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('users')
      .select('preferences')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Failed to fetch preferences:', error);
      return DEFAULT_PREFERENCES;
    }

    return { ...DEFAULT_PREFERENCES, ...(data?.preferences || {}) };
  },

  updatePreferences: async (preferences: Partial<UserPreferencesData>): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get current preferences first
    const { data: current } = await supabase
      .from('users')
      .select('preferences')
      .eq('id', user.id)
      .single();

    const merged = { ...(current?.preferences || {}), ...preferences };

    const { error } = await supabase
      .from('users')
      .update({ preferences: merged })
      .eq('id', user.id);

    if (error) {
      console.error('Failed to update preferences:', error);
      throw new Error('Failed to save preferences');
    }
  },
};

// Health check
export const healthCheck = async (): Promise<{ status: string; timestamp: string }> => {
  const response = await apiClient.get('/health');
  return response.data;
};

export default apiClient;
