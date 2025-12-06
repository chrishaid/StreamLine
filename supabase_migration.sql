-- StreamLine Database Migration for Supabase
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
-- Note: Supabase Auth already creates auth.users table
-- We'll create a public.users table that extends it with app-specific data

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'editor', -- viewer, editor, admin
  department_id UUID,
  preferences JSONB DEFAULT '{"defaultView": "browse", "autoSaveInterval": 30, "theme": "light", "chatPosition": "right"}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- DEPARTMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- CATEGORIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  path TEXT UNIQUE NOT NULL,
  level INT NOT NULL DEFAULT 0,
  "order" INT NOT NULL DEFAULT 0,
  icon TEXT,
  color TEXT,
  owner_id UUID REFERENCES public.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- PROCESSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.processes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, active, archived
  owner_id UUID REFERENCES public.users(id) NOT NULL,
  department_id UUID REFERENCES public.departments(id),
  primary_category_id UUID REFERENCES public.categories(id) NOT NULL,
  secondary_category_ids JSONB, -- Array of category IDs
  tags JSONB, -- Array of tags
  current_version_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id) NOT NULL,
  updated_by UUID REFERENCES public.users(id) NOT NULL,
  view_count INT NOT NULL DEFAULT 0,
  edit_count INT NOT NULL DEFAULT 0,
  is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
  related_process_ids JSONB, -- Array of process IDs
  metadata JSONB -- Additional metadata
);

-- ============================================
-- PROCESS VERSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.process_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  process_id UUID REFERENCES public.processes(id) ON DELETE CASCADE NOT NULL,
  version_number TEXT NOT NULL,
  major_version INT NOT NULL,
  minor_version INT NOT NULL,
  bpmn_xml TEXT NOT NULL, -- Store BPMN XML
  bpmn_file_url TEXT,
  change_summary TEXT,
  change_type TEXT NOT NULL, -- major, minor, patch
  tags JSONB, -- Array of tags
  parent_version_id UUID REFERENCES public.process_versions(id),
  branch_name TEXT NOT NULL DEFAULT 'main',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id) NOT NULL,
  metadata JSONB -- elementCount, poolCount, etc.
);

-- ============================================
-- CHAT SESSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  process_id UUID REFERENCES public.processes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- CHAT MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE NOT NULL,
  process_id UUID REFERENCES public.processes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) NOT NULL,
  role TEXT NOT NULL, -- user, assistant
  content TEXT NOT NULL,
  metadata JSONB, -- modelUsed, tokensUsed, latencyMs, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- ADD FOREIGN KEY FOR current_version_id
-- ============================================
ALTER TABLE public.processes
ADD CONSTRAINT fk_current_version
FOREIGN KEY (current_version_id)
REFERENCES public.process_versions(id);

-- ============================================
-- CREATE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_processes_owner_id ON public.processes(owner_id);
CREATE INDEX IF NOT EXISTS idx_processes_primary_category_id ON public.processes(primary_category_id);
CREATE INDEX IF NOT EXISTS idx_processes_status ON public.processes(status);
CREATE INDEX IF NOT EXISTS idx_process_versions_process_id ON public.process_versions(process_id);
CREATE INDEX IF NOT EXISTS idx_process_versions_created_by ON public.process_versions(created_by);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_process_id ON public.chat_sessions(process_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON public.chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_process_id ON public.chat_messages(process_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON public.chat_messages(user_id);

-- ============================================
-- CREATE UPDATED_AT TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- APPLY UPDATED_AT TRIGGERS
-- ============================================
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_processes_updated_at BEFORE UPDATE ON public.processes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_sessions_updated_at BEFORE UPDATE ON public.chat_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view all users" ON public.users
  FOR SELECT USING (true);

CREATE POLICY "Users can update own record" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Departments policies (read-only for now)
CREATE POLICY "Everyone can view departments" ON public.departments
  FOR SELECT USING (true);

-- Categories policies
CREATE POLICY "Everyone can view categories" ON public.categories
  FOR SELECT USING (true);

CREATE POLICY "Category owners can update" ON public.categories
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Authenticated users can create categories" ON public.categories
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Processes policies
CREATE POLICY "Everyone can view active processes" ON public.processes
  FOR SELECT USING (status = 'active' OR owner_id = auth.uid());

CREATE POLICY "Process owners can update" ON public.processes
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Authenticated users can create processes" ON public.processes
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Process owners can delete" ON public.processes
  FOR DELETE USING (auth.uid() = owner_id);

-- Process versions policies
CREATE POLICY "Everyone can view versions of accessible processes" ON public.process_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.processes p
      WHERE p.id = process_id AND (p.status = 'active' OR p.owner_id = auth.uid())
    )
  );

CREATE POLICY "Authenticated users can create versions" ON public.process_versions
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Chat sessions policies
CREATE POLICY "Users can view own chat sessions" ON public.chat_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own chat sessions" ON public.chat_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chat sessions" ON public.chat_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own chat sessions" ON public.chat_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Chat messages policies
CREATE POLICY "Users can view messages in own sessions" ON public.chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chat_sessions cs
      WHERE cs.id = session_id AND cs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in own sessions" ON public.chat_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_sessions cs
      WHERE cs.id = session_id AND cs.user_id = auth.uid()
    )
  );

-- ============================================
-- CREATE FUNCTION TO SYNC AUTH USER TO PUBLIC USER
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar_url, role, created_at, last_login_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    'editor',
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create public.users record when auth.users record is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- SEED DATA
-- ============================================

-- Insert default category (will need a user first, so comment this out initially)
-- You can run this after your first user is created
/*
INSERT INTO public.categories (name, description, path, level, "order", icon, color, owner_id)
VALUES
  ('Operations', 'Operational processes', '/operations', 0, 1, 'cog', '#3B82F6', 'USER_ID_HERE'),
  ('Finance', 'Financial processes', '/finance', 0, 2, 'dollar-sign', '#10B981', 'USER_ID_HERE'),
  ('HR', 'Human resources processes', '/hr', 0, 3, 'users', '#F59E0B', 'USER_ID_HERE');
*/

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- ============================================
-- DONE!
-- ============================================
-- Your database is now ready!
-- Next steps:
-- 1. Configure Auth providers in Supabase dashboard
-- 2. Update frontend to use Supabase client
-- 3. Test authentication flow
