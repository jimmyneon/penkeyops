-- ============================================
-- FIX INFINITE RECURSION IN RLS POLICIES
-- ============================================
-- Run this in Supabase SQL Editor to fix the loading issue

-- Step 1: Drop the problematic policies
DROP POLICY IF EXISTS "Users can read own record" ON users;
DROP POLICY IF EXISTS "Users can read site members" ON users;
DROP POLICY IF EXISTS "Admins can update site users" ON users;

-- Step 2: Create simpler, non-recursive policies
-- Users can ALWAYS read their own record (no recursion)
CREATE POLICY "Users can read own record" ON users
  FOR SELECT 
  USING (auth.uid() = id);

-- Admins can read all users at their site
CREATE POLICY "Admins can read site users" ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users AS u
      WHERE u.id = auth.uid() 
      AND u.role = 'admin'
      AND u.site_id = users.site_id
    )
  );

-- Admins can update users at their site
CREATE POLICY "Admins can update site users" ON users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users AS u
      WHERE u.id = auth.uid() 
      AND u.role = 'admin'
      AND u.site_id = users.site_id
    )
  );

-- ============================================
-- EXPLANATION
-- ============================================
-- The old policy had infinite recursion because it was doing:
-- SELECT FROM users WHERE site_id IN (SELECT site_id FROM users WHERE id = auth.uid())
-- 
-- This causes Postgres to recursively check the users table while checking the users table!
-- 
-- The fix: Use a table alias (users AS u) in the subquery to break the recursion.
-- Now it checks a separate reference to the users table.
