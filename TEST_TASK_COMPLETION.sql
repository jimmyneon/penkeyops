-- Test task completion flow
-- This will help verify tasks are being marked complete properly

-- 1. Check current session and its tasks
SELECT 
  ss.id as session_id,
  ss.shift_type,
  COUNT(CASE WHEN cr.status = 'pending' THEN 1 END) as pending_count,
  COUNT(CASE WHEN cr.status = 'completed' THEN 1 END) as completed_count,
  COUNT(*) as total_tasks
FROM shift_sessions ss
JOIN checklist_instances ci ON ci.shift_session_id = ss.id
JOIN checklist_results cr ON cr.checklist_instance_id = ci.id
WHERE ss.is_complete = false
GROUP BY ss.id, ss.shift_type
ORDER BY ss.started_at DESC
LIMIT 1;

-- 2. Show recent task completions (last 10)
SELECT 
  ti.title,
  cr.status,
  cr.completed_at,
  ss.shift_type
FROM checklist_results cr
JOIN template_items ti ON ti.id = cr.template_item_id
JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
JOIN shift_sessions ss ON ss.id = ci.shift_session_id
WHERE cr.status = 'completed'
  AND ss.is_complete = false
ORDER BY cr.completed_at DESC
LIMIT 10;

-- 3. Show current pending tasks for active session
SELECT 
  cr.id as task_id,
  ti.title,
  ti.due_time,
  ti.priority,
  ti.is_critical,
  cr.status,
  ss.id as session_id
FROM checklist_results cr
JOIN template_items ti ON ti.id = cr.template_item_id
JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
JOIN shift_sessions ss ON ss.id = ci.shift_session_id
WHERE ss.is_complete = false
  AND cr.status = 'pending'
ORDER BY 
  ti.is_critical DESC,
  ti.priority ASC,
  ti.due_time ASC NULLS LAST
LIMIT 10;

-- 4. Test the resolver with current session
-- Replace session_id with the one from query #1
SELECT * FROM resolve_now_action(
  (SELECT id FROM shift_sessions WHERE is_complete = false ORDER BY started_at DESC LIMIT 1)
);
