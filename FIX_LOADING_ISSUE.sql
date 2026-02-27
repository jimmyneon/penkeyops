-- ============================================
-- FIX LOADING ISSUE - RUN THIS IN SUPABASE SQL EDITOR
-- ============================================

-- Step 1: Create a default site (if you don't have one)
INSERT INTO sites (id, name, address, is_active)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'Penkey Délicaf & Gifts',
  'Lymington',
  true
)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Assign your user to the site
-- Replace 'jimmyneon@hotmail.com' with your actual email if different
UPDATE users 
SET site_id = '550e8400-e29b-41d4-a716-446655440000'
WHERE email = 'jimmyneon@hotmail.com';

-- Step 3: Verify it worked
SELECT id, email, role, site_id, is_active
FROM users
WHERE email = 'jimmyneon@hotmail.com';

-- You should see:
-- - role: 'staff'
-- - site_id: '550e8400-e29b-41d4-a716-446655440000'
-- - is_active: true

-- ============================================
-- WHY THIS FIXES IT
-- ============================================
-- The app is stuck on "Loading..." because:
-- 1. You're authenticated (✓ working)
-- 2. But the profile query is blocked by RLS (Row Level Security)
-- 3. RLS requires users to have a site_id to read their own profile
-- 4. Your user was created without a site_id (NULL)
-- 5. This SQL assigns you to a site, allowing the profile query to succeed

-- After running this SQL, refresh your browser and it will load!
