-- Check current active session and how many tasks it has
-- This will show if new session was created with all templates

-- 1. Get current active session
SELECT 
  id,
  shift_type,
  started_at,
  is_complete,
  site_id
FROM shift_sessions
WHERE is_complete = false
ORDER BY started_at DESC
LIMIT 1;

-- 2. Count tasks in most recent session (use ID from query 1)
-- Replace with actual session ID if needed
SELECT 
  COUNT(*) as total_tasks,
  COUNT(CASE WHEN cr.status = 'completed' THEN 1 END) as completed,
  COUNT(CASE WHEN cr.status = 'pending' THEN 1 END) as pending
FROM checklist_results cr
JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
JOIN shift_sessions ss ON ss.id = ci.shift_session_id
WHERE ss.is_complete = false
ORDER BY ss.started_at DESC
LIMIT 1;

-- 3. Show which templates are loaded in current session
SELECT 
  t.name as template_name,
  COUNT(*) as task_count,
  COUNT(CASE WHEN cr.status = 'pending' THEN 1 END) as pending_count
FROM checklist_results cr
JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
JOIN templates t ON t.id = ci.template_id
JOIN shift_sessions ss ON ss.id = ci.shift_session_id
WHERE ss.is_complete = false
GROUP BY t.name
ORDER BY t.name;
