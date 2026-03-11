import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Export types for TypeScript
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string;
          avatar_url: string | null;
          role: string;
          department_id: string | null;
          preferences: Record<string, any> | null;
          created_at: string;
          last_login_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      processes: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          status: string;
          owner_id: string;
          department_id: string | null;
          primary_category_id: string;
          secondary_category_ids: string[] | null;
          tags: string[] | null;
          current_version_id: string | null;
          created_at: string;
          updated_at: string;
          created_by: string;
          updated_by: string;
          view_count: number;
          edit_count: number;
          is_favorite: boolean;
          related_process_ids: string[] | null;
          metadata: Record<string, any> | null;
        };
        Insert: Omit<Database['public']['Tables']['processes']['Row'], 'created_at' | 'updated_at' | 'view_count' | 'edit_count' | 'is_favorite'>;
        Update: Partial<Database['public']['Tables']['processes']['Insert']>;
      };
      categories: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          parent_id: string | null;
          path: string;
          level: number;
          order: number;
          icon: string | null;
          color: string | null;
          owner_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['categories']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['categories']['Insert']>;
      };
      process_versions: {
        Row: {
          id: string;
          process_id: string;
          version_number: string;
          major_version: number;
          minor_version: number;
          bpmn_xml: string;
          bpmn_file_url: string | null;
          change_summary: string | null;
          change_type: string;
          tags: string[] | null;
          parent_version_id: string | null;
          branch_name: string;
          created_at: string;
          created_by: string;
          metadata: Record<string, any> | null;
        };
        Insert: Omit<Database['public']['Tables']['process_versions']['Row'], 'created_at'>;
        Update: Partial<Database['public']['Tables']['process_versions']['Insert']>;
      };
      chat_sessions: {
        Row: {
          id: string;
          process_id: string | null;
          user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['chat_sessions']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['chat_sessions']['Insert']>;
      };
      chat_messages: {
        Row: {
          id: string;
          session_id: string;
          process_id: string | null;
          user_id: string;
          role: string;
          content: string;
          metadata: Record<string, any> | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['chat_messages']['Row'], 'created_at'>;
        Update: Partial<Database['public']['Tables']['chat_messages']['Insert']>;
      };
    };
  };
};
