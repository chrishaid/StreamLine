-- StreamLine Organizations RLS Fix
-- Run this SQL AFTER the main organizations migration to fix infinite recursion
-- This replaces the problematic RLS policies with ones that use security definer functions

-- ============================================
-- CREATE HELPER FUNCTION TO CHECK MEMBERSHIP
-- ============================================
-- This function bypasses RLS to check if a user is a member of an organization
-- Using SECURITY DEFINER means it runs with the permissions of the function owner (postgres)

CREATE OR REPLACE FUNCTION public.is_org_member(org_id UUID, check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = org_id
      AND user_id = check_user_id
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_user_org_role(org_id UUID, check_user_id UUID DEFAULT auth.uid())
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.organization_members
  WHERE organization_id = org_id
    AND user_id = check_user_id
    AND status = 'active';
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_org_admin(org_id UUID, check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.organization_members
  WHERE organization_id = org_id
    AND user_id = check_user_id
    AND status = 'active';
  RETURN user_role IN ('owner', 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_org_owner(org_id UUID, check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.organization_members
  WHERE organization_id = org_id
    AND user_id = check_user_id
    AND status = 'active';
  RETURN user_role = 'owner';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.is_org_member TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_org_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_owner TO authenticated;

-- ============================================
-- DROP OLD PROBLEMATIC POLICIES
-- ============================================

-- Organization members policies
DROP POLICY IF EXISTS "Users can view org members" ON public.organization_members;
DROP POLICY IF EXISTS "Org admins can add members" ON public.organization_members;
DROP POLICY IF EXISTS "Org admins can update members" ON public.organization_members;
DROP POLICY IF EXISTS "Org admins can remove members" ON public.organization_members;

-- Organization policies
DROP POLICY IF EXISTS "Users can view their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Org admins can update organization" ON public.organizations;
DROP POLICY IF EXISTS "Org owners can delete organization" ON public.organizations;

-- Organization tags policies
DROP POLICY IF EXISTS "Org members can view tags" ON public.organization_tags;
DROP POLICY IF EXISTS "Org members can create tags" ON public.organization_tags;
DROP POLICY IF EXISTS "Org admins can update tags" ON public.organization_tags;
DROP POLICY IF EXISTS "Org admins can delete tags" ON public.organization_tags;

-- Organization invitations policies
DROP POLICY IF EXISTS "Org admins can view invitations" ON public.organization_invitations;
DROP POLICY IF EXISTS "Org admins can create invitations" ON public.organization_invitations;
DROP POLICY IF EXISTS "Org admins can delete invitations" ON public.organization_invitations;

-- Process policies (the updated ones)
DROP POLICY IF EXISTS "Users can view accessible processes" ON public.processes;
DROP POLICY IF EXISTS "Users can create processes" ON public.processes;
DROP POLICY IF EXISTS "Process owners or org admins can update" ON public.processes;

-- ============================================
-- RECREATE ORGANIZATION_MEMBERS POLICIES
-- ============================================

-- Users can view their own membership record AND members of orgs they belong to
CREATE POLICY "Users can view org members" ON public.organization_members
  FOR SELECT USING (
    -- Users can always see their own membership
    user_id = auth.uid()
    -- OR they can see other members if they're in the same org (using helper function)
    OR public.is_org_member(organization_id)
  );

-- Org admins can add members (first member added via create_organization function)
CREATE POLICY "Org admins can add members" ON public.organization_members
  FOR INSERT WITH CHECK (
    public.is_org_admin(organization_id)
  );

-- Users can update their own membership, admins can update others
CREATE POLICY "Org admins can update members" ON public.organization_members
  FOR UPDATE USING (
    user_id = auth.uid() OR public.is_org_admin(organization_id)
  );

-- Users can leave (delete own non-owner), admins can remove others (except owner)
CREATE POLICY "Org admins can remove members" ON public.organization_members
  FOR DELETE USING (
    (user_id = auth.uid() AND role != 'owner')
    OR (public.is_org_admin(organization_id) AND role != 'owner')
  );

-- ============================================
-- RECREATE ORGANIZATIONS POLICIES
-- ============================================

CREATE POLICY "Users can view their organizations" ON public.organizations
  FOR SELECT USING (
    public.is_org_member(id)
  );

CREATE POLICY "Org admins can update organization" ON public.organizations
  FOR UPDATE USING (
    public.is_org_admin(id)
  );

CREATE POLICY "Org owners can delete organization" ON public.organizations
  FOR DELETE USING (
    public.is_org_owner(id)
  );

-- ============================================
-- RECREATE ORGANIZATION_TAGS POLICIES
-- ============================================

CREATE POLICY "Org members can view tags" ON public.organization_tags
  FOR SELECT USING (
    public.is_org_member(organization_id)
  );

CREATE POLICY "Org members can create tags" ON public.organization_tags
  FOR INSERT WITH CHECK (
    public.is_org_member(organization_id)
    AND created_by = auth.uid()
  );

CREATE POLICY "Org admins can update tags" ON public.organization_tags
  FOR UPDATE USING (
    public.is_org_admin(organization_id)
  );

CREATE POLICY "Org admins can delete tags" ON public.organization_tags
  FOR DELETE USING (
    public.is_org_admin(organization_id)
  );

-- ============================================
-- RECREATE ORGANIZATION_INVITATIONS POLICIES
-- ============================================

CREATE POLICY "Org admins can view invitations" ON public.organization_invitations
  FOR SELECT USING (
    public.is_org_admin(organization_id)
  );

CREATE POLICY "Org admins can create invitations" ON public.organization_invitations
  FOR INSERT WITH CHECK (
    public.is_org_admin(organization_id)
    AND invited_by = auth.uid()
  );

CREATE POLICY "Org admins can delete invitations" ON public.organization_invitations
  FOR DELETE USING (
    public.is_org_admin(organization_id)
  );

-- ============================================
-- RECREATE PROCESSES POLICIES
-- ============================================

-- Users can view their own processes OR org processes they have access to
CREATE POLICY "Users can view accessible processes" ON public.processes
  FOR SELECT USING (
    -- User owns the process
    owner_id = auth.uid()
    -- OR process is in an org the user belongs to
    OR (
      organization_id IS NOT NULL
      AND public.is_org_member(organization_id)
    )
    -- OR process is active and has no organization (legacy public processes)
    OR (status = 'active' AND organization_id IS NULL)
  );

-- Users can create processes for themselves or their org
CREATE POLICY "Users can create processes" ON public.processes
  FOR INSERT WITH CHECK (
    owner_id = auth.uid()
    AND (
      -- Personal process (no org)
      organization_id IS NULL
      -- OR creating in an org they belong to
      OR public.is_org_member(organization_id)
    )
  );

-- Owners can update, OR org admins can update org processes
CREATE POLICY "Process owners or org admins can update" ON public.processes
  FOR UPDATE USING (
    owner_id = auth.uid()
    OR (
      organization_id IS NOT NULL
      AND public.is_org_admin(organization_id)
    )
  );

-- ============================================
-- DONE!
-- ============================================
-- The infinite recursion should now be fixed.
-- Helper functions use SECURITY DEFINER to bypass RLS when checking membership.
