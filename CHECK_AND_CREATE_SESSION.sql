-- Check current state and manually create a session if needed

-- 1. Verify no sessions exist for March 3rd
SELECT 'Sessions for March 3rd' as info, COUNT(*) as count
FROM shift_sessions
WHERE started_at::DATE = '2026-03-03';

-- 2. Check what the latest session is
SELECT 
  'Latest session' as info,
  id,
  started_at,
  completed_at,
  is_complete,
  shift_type
FROM shift_sessions
ORDER BY started_at DESC
LIMIT 1;

-- 3. Get your site_id (you'll need this)
SELECT id as site_id, name as site_name
FROM sites
LIMIT 1;

-- 4. Manually create a new session for today
-- REPLACE 'YOUR_SITE_ID' with the actual site_id from step 3
-- REPLACE 'YOUR_USER_ID' with your user ID

INSERT INTO shift_sessions (site_id, started_by, shift_type)
VALUES (
  'YOUR_SITE_ID',  -- Replace with actual site_id
  'YOUR_USER_ID',  -- Replace with actual user_id
  'daily'
)
RETURNING *;

-- 5. Get the new session ID and create checklists
-- After running the INSERT above, copy the session ID and run:

-- Get active templates
SELECT id, name FROM templates WHERE is_active = true;

-- For EACH template ID, run this (replace SESSION_ID and TEMPLATE_ID):
-- SELECT create_checklist_from_template('SESSION_ID', 'TEMPLATE_ID');
