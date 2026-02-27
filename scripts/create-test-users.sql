-- ============================================
-- CREATE TEST USERS FOR PENKEY OPS
-- ============================================
-- Run this in Supabase SQL Editor after migrations

-- IMPORTANT: With the auto-create trigger (migration 004), users are automatically
-- created as STAFF when they sign up. You only need to:
-- 1. Create users in Supabase Auth Dashboard
-- 2. Assign them to a site (if not using default site)
-- 3. Change role to 'admin' for admin users

-- Example users to create in Supabase Auth Dashboard:
-- 1. admin@penkeyops.com (password: admin123) - will be staff, change to admin
-- 2. alice@penkeyops.com (password: staff123) - will be staff automatically
-- 3. bob@penkeyops.com (password: staff123) - will be staff automatically

-- After creating users in Auth, they will automatically have profiles created.
-- Run this SQL to assign them to a site and set admin role:

-- Get the site ID (or use the one from seed data)
-- If you ran the seed script, the site ID is: 550e8400-e29b-41d4-a716-446655440000

-- Method 1: Update auto-created profiles to assign site and set admin role
-- Users are automatically created as 'staff' via trigger, so we just need to:
-- 1. Assign them to a site
-- 2. Change admin user to 'admin' role

-- Update admin user (change role from staff to admin)
UPDATE users
SET 
  role = 'admin',
  site_id = '550e8400-e29b-41d4-a716-446655440000',
  full_name = 'Admin User'
WHERE email = 'admin@penkeyops.com';

-- Update staff users (just assign to site, they're already staff)
UPDATE users
SET 
  site_id = '550e8400-e29b-41d4-a716-446655440000',
  full_name = 'Alice Smith'
WHERE email = 'alice@penkeyops.com';

UPDATE users
SET 
  site_id = '550e8400-e29b-41d4-a716-446655440000',
  full_name = 'Bob Jones'
WHERE email = 'bob@penkeyops.com';

-- ============================================
-- ALTERNATIVE: Query to find auth user IDs
-- ============================================
-- Run this first to get the user IDs from auth.users:

SELECT id, email, created_at
FROM auth.users
ORDER BY created_at DESC;

-- Copy the IDs and use them in the INSERT statements above

-- ============================================
-- STEP-BY-STEP INSTRUCTIONS (SIMPLIFIED)
-- ============================================

/*
1. CREATE USERS IN SUPABASE AUTH DASHBOARD:
   - Go to Authentication > Users
   - Click "Add User"
   - Enter email and password for each user:
     * admin@penkeyops.com / admin123
     * alice@penkeyops.com / staff123
     * bob@penkeyops.com / staff123
   - Confirm email automatically (toggle "Auto Confirm User")
   - User profiles are AUTOMATICALLY created as 'staff' via trigger!

2. ASSIGN SITE AND SET ADMIN ROLE:
   - Run the UPDATE statements above to:
     * Assign all users to a site
     * Change admin@penkeyops.com role from 'staff' to 'admin'
     * Update full names

3. TEST LOGIN:
   - Go to http://localhost:3000/auth/login
   - Login with admin@penkeyops.com / admin123
   - Should redirect to /admin
   - Login with alice@penkeyops.com / staff123
   - Should redirect to / (staff dashboard)

NOTES:
- All new signups are automatically 'staff' role
- Use Admin Panel (User Management) to change roles to 'admin' via UI
- Or use SQL UPDATE to change role manually
*/

-- ============================================
-- VERIFY SETUP
-- ============================================

-- Check all users and their roles
SELECT 
  u.id,
  u.email,
  u.full_name,
  u.role,
  u.is_active,
  s.name as site_name
FROM users u
LEFT JOIN sites s ON u.site_id = s.id
ORDER BY u.role, u.full_name;
