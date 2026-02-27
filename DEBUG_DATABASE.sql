-- ============================================
-- DEBUG DATABASE STATE
-- ============================================
-- Run this in Supabase SQL Editor to see what's actually in the database

-- 1. Check your user record
SELECT id, email, role, site_id, is_active, created_at
FROM users
WHERE email = 'jimmyneon@hotmail.com';

-- 2. Check if the site exists
SELECT id, name, address, is_active
FROM sites
WHERE id = '550e8400-e29b-41d4-a716-446655440000';

-- 3. Check all RLS policies on users table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'users';

-- 4. Check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'users';

-- ============================================
-- TEMPORARY FIX - DISABLE RLS FOR TESTING
-- ============================================
-- If nothing else works, run this to temporarily disable RLS:
-- (This will let you log in and see the app, then we can fix RLS properly)

-- ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- After running this, refresh your browser and it should work.
-- Then we can re-enable RLS and fix the policies properly.
