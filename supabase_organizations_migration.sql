-- StreamLine Organizations Migration for Supabase
-- Run this SQL in your Supabase SQL Editor after the main migration

-- ============================================
-- ORGANIZATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  created_by UUID REFERENCES public.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  settings JSONB DEFAULT '{}'::jsonb
);

-- ============================================
-- ORGANIZATION MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'member', -- owner, admin, member, viewer
  invited_by UUID REFERENCES public.users(id),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active', -- active, pending, inactive
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- ============================================
-- ORGANIZATION TAGS TABLE (Shared Tag Dictionary)
-- ============================================
CREATE TABLE IF NOT EXISTS public.organization_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  parent_tag_id UUID REFERENCES public.organization_tags(id) ON DELETE CASCADE,
  description TEXT,
  color TEXT,
  created_by UUID REFERENCES public.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

-- ============================================
-- ORGANIZATION INVITATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.organization_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  invited_by UUID REFERENCES public.users(id) NOT NULL,
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- ADD ORGANIZATION COLUMNS TO EXISTING TABLES
-- ============================================

-- Add organization_id to processes (nullable - personal processes don't have one)
ALTER TABLE public.processes
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Add current_organization_id to users (their active organization context)
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS current_organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

-- ============================================
-- CREATE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_created_by ON public.organizations(created_by);
CREATE INDEX IF NOT EXISTS idx_organization_members_organization_id ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_tags_organization_id ON public.organization_tags(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_tags_parent_tag_id ON public.organization_tags(parent_tag_id);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_email ON public.organization_invitations(email);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_token ON public.organization_invitations(token);
CREATE INDEX IF NOT EXISTS idx_processes_organization_id ON public.processes(organization_id);

-- ============================================
-- APPLY UPDATED_AT TRIGGERS
-- ============================================
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_members_updated_at BEFORE UPDATE ON public.organization_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_tags_updated_at BEFORE UPDATE ON public.organization_tags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES FOR ORGANIZATIONS
-- ============================================

-- Organizations: Users can view orgs they are members of
CREATE POLICY "Users can view their organizations" ON public.organizations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = id AND om.user_id = auth.uid() AND om.status = 'active'
    )
  );

-- Organizations: Only org owners/admins can update
CREATE POLICY "Org admins can update organization" ON public.organizations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
  );

-- Organizations: Authenticated users can create orgs
CREATE POLICY "Authenticated users can create organizations" ON public.organizations
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Organizations: Only org owners can delete
CREATE POLICY "Org owners can delete organization" ON public.organizations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = id
        AND om.user_id = auth.uid()
        AND om.role = 'owner'
        AND om.status = 'active'
    )
  );

-- ============================================
-- RLS POLICIES FOR ORGANIZATION MEMBERS
-- ============================================

-- Members can view other members in their orgs
CREATE POLICY "Users can view org members" ON public.organization_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
  );

-- Org admins can add members
CREATE POLICY "Org admins can add members" ON public.organization_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
  );

-- Org admins can update members (but not change owner role)
CREATE POLICY "Org admins can update members" ON public.organization_members
  FOR UPDATE USING (
    (
      -- Admin/owner can update other members
      EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.organization_id = organization_id
          AND om.user_id = auth.uid()
          AND om.role IN ('owner', 'admin')
          AND om.status = 'active'
      )
    ) OR (
      -- Users can update their own membership (e.g., leave)
      user_id = auth.uid()
    )
  );

-- Org admins can remove members (except owner)
CREATE POLICY "Org admins can remove members" ON public.organization_members
  FOR DELETE USING (
    (
      EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.organization_id = organization_id
          AND om.user_id = auth.uid()
          AND om.role IN ('owner', 'admin')
          AND om.status = 'active'
      )
      AND role != 'owner'
    ) OR (
      -- Users can remove themselves (leave org)
      user_id = auth.uid() AND role != 'owner'
    )
  );

-- ============================================
-- RLS POLICIES FOR ORGANIZATION TAGS
-- ============================================

-- Members can view org tags
CREATE POLICY "Org members can view tags" ON public.organization_tags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
  );

-- Members (non-viewers) can create tags
CREATE POLICY "Org members can create tags" ON public.organization_tags
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin', 'member')
        AND om.status = 'active'
    )
    AND created_by = auth.uid()
  );

-- Admins can update tags
CREATE POLICY "Org admins can update tags" ON public.organization_tags
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
  );

-- Admins can delete tags
CREATE POLICY "Org admins can delete tags" ON public.organization_tags
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
  );

-- ============================================
-- RLS POLICIES FOR ORGANIZATION INVITATIONS
-- ============================================

-- Admins can view invitations for their org
CREATE POLICY "Org admins can view invitations" ON public.organization_invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
  );

-- Admins can create invitations
CREATE POLICY "Org admins can create invitations" ON public.organization_invitations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
    AND invited_by = auth.uid()
  );

-- Admins can delete invitations
CREATE POLICY "Org admins can delete invitations" ON public.organization_invitations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
  );

-- ============================================
-- UPDATE PROCESSES RLS FOR ORGANIZATION ACCESS
-- ============================================

-- Drop the old policy if it exists
DROP POLICY IF EXISTS "Everyone can view active processes" ON public.processes;

-- New policy: Users can view their own processes OR org processes they have access to
CREATE POLICY "Users can view accessible processes" ON public.processes
  FOR SELECT USING (
    -- User owns the process
    owner_id = auth.uid()
    -- OR process is in an org the user belongs to
    OR (
      organization_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.organization_id = processes.organization_id
          AND om.user_id = auth.uid()
          AND om.status = 'active'
      )
    )
    -- OR process is active and has no organization (legacy public processes)
    OR (status = 'active' AND organization_id IS NULL)
  );

-- Drop old insert policy
DROP POLICY IF EXISTS "Authenticated users can create processes" ON public.processes;

-- New policy: Users can create processes for themselves or their org
CREATE POLICY "Users can create processes" ON public.processes
  FOR INSERT WITH CHECK (
    owner_id = auth.uid()
    AND (
      -- Personal process (no org)
      organization_id IS NULL
      -- OR creating in an org they belong to with proper role
      OR EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.organization_id = processes.organization_id
          AND om.user_id = auth.uid()
          AND om.role IN ('owner', 'admin', 'member')
          AND om.status = 'active'
      )
    )
  );

-- Drop old update policy
DROP POLICY IF EXISTS "Process owners can update" ON public.processes;

-- New policy: Owners can update, OR org admins can update org processes
CREATE POLICY "Process owners or org admins can update" ON public.processes
  FOR UPDATE USING (
    -- User owns the process
    owner_id = auth.uid()
    -- OR user is an admin in the process's org
    OR (
      organization_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.organization_id = processes.organization_id
          AND om.user_id = auth.uid()
          AND om.role IN ('owner', 'admin')
          AND om.status = 'active'
      )
    )
  );

-- Drop old delete policy
DROP POLICY IF EXISTS "Process owners can delete" ON public.processes;

-- New policy: Only owners can delete their processes
CREATE POLICY "Process owners can delete" ON public.processes
  FOR DELETE USING (owner_id = auth.uid());

-- ============================================
-- HELPER FUNCTION: CREATE ORG AND ADD OWNER
-- ============================================
CREATE OR REPLACE FUNCTION public.create_organization(
  org_name TEXT,
  org_slug TEXT,
  org_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_org_id UUID;
BEGIN
  -- Create the organization
  INSERT INTO public.organizations (name, slug, description, created_by)
  VALUES (org_name, org_slug, org_description, auth.uid())
  RETURNING id INTO new_org_id;

  -- Add the creator as owner
  INSERT INTO public.organization_members (organization_id, user_id, role, status, joined_at)
  VALUES (new_org_id, auth.uid(), 'owner', 'active', NOW());

  RETURN new_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- HELPER FUNCTION: ACCEPT INVITATION
-- ============================================
CREATE OR REPLACE FUNCTION public.accept_organization_invitation(
  invitation_token TEXT
)
RETURNS UUID AS $$
DECLARE
  inv RECORD;
  new_member_id UUID;
BEGIN
  -- Find and validate the invitation
  SELECT * INTO inv
  FROM public.organization_invitations
  WHERE token = invitation_token
    AND accepted_at IS NULL
    AND expires_at > NOW();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  -- Check if user email matches invitation
  IF (SELECT email FROM auth.users WHERE id = auth.uid()) != inv.email THEN
    RAISE EXCEPTION 'Invitation is for a different email address';
  END IF;

  -- Add user to organization
  INSERT INTO public.organization_members (organization_id, user_id, role, invited_by, status, joined_at)
  VALUES (inv.organization_id, auth.uid(), inv.role, inv.invited_by, 'active', NOW())
  ON CONFLICT (organization_id, user_id) DO UPDATE
  SET status = 'active', role = inv.role, joined_at = NOW()
  RETURNING id INTO new_member_id;

  -- Mark invitation as accepted
  UPDATE public.organization_invitations
  SET accepted_at = NOW()
  WHERE id = inv.id;

  RETURN new_member_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT ALL ON public.organizations TO authenticated;
GRANT ALL ON public.organization_members TO authenticated;
GRANT ALL ON public.organization_tags TO authenticated;
GRANT ALL ON public.organization_invitations TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_organization TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_organization_invitation TO authenticated;

-- ============================================
-- DONE!
-- ============================================
-- Organizations are now available!
-- Features:
-- 1. Users can create organizations
-- 2. Organizations have members with roles (owner, admin, member, viewer)
-- 3. Organizations can have shared tag dictionaries
-- 4. Processes can be assigned to organizations
-- 5. Organization members can access shared processes
