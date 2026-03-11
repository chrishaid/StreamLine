-- StreamLine Database Fix Migration
-- Run this SQL in your Supabase SQL Editor to fix saving issues

-- ============================================
-- FIX 1: Make primary_category_id nullable
-- ============================================
ALTER TABLE public.processes
ALTER COLUMN primary_category_id DROP NOT NULL;

-- ============================================
-- FIX 2: Add INSERT policy for users table
-- ============================================
-- Allow authenticated users to insert their own record
DROP POLICY IF EXISTS "Users can insert own record" ON public.users;
CREATE POLICY "Users can insert own record" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================
-- FIX 3: Ensure the handle_new_user trigger exists
-- ============================================
-- Drop and recreate to ensure it works correctly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar_url, role, created_at, last_login_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    'editor',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    last_login_at = NOW(),
    name = COALESCE(EXCLUDED.name, public.users.name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- DONE!
-- ============================================
-- After running this, processes should save correctly.
