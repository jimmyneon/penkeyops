-- Check session shift_type and understand template loading
-- Session: d94f747e-2bc0-474a-8d44-f07c5a530e59

-- 1. Session details
SELECT 
  id,
  shift_type,
  started_at,
  is_complete,
  site_id,
  started_by
FROM shift_sessions
WHERE id = 'd94f747e-2bc0-474a-8d44-f07c5a530e59';

-- 2. Which checklist instances were created for this session?
SELECT 
  ci.id as instance_id,
  t.name as template_name,
  t.template_type,
  t.site_id as template_site_id,
  (SELECT COUNT(*) FROM checklist_results WHERE checklist_instance_id = ci.id) as task_count
FROM checklist_instances ci
JOIN templates t ON t.id = ci.template_id
WHERE ci.shift_session_id = 'd94f747e-2bc0-474a-8d44-f07c5a530e59'
ORDER BY t.name;

-- 3. Check what the auto-create logic should have done
-- Based on app/page.tsx lines 50-62, it should load templates matching:
-- - template_type = shift_type
-- - is_active = true
-- - site_id = session.site_id OR site_id IS NULL

-- Show what SHOULD have been loaded (assuming shift_type from query 1)
-- Run this after seeing shift_type result
