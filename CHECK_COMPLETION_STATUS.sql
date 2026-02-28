-- Check completion status for current session
-- This will show if tasks are actually being marked complete in the database

-- Get the current active session
WITH current_session AS (
  SELECT id, shift_type, started_at
  FROM shift_sessions 
  WHERE is_complete = false 
  ORDER BY started_at DESC 
  LIMIT 1
)
-- Count tasks by status
SELECT 
  cs.id as session_id,
  cs.shift_type,
  COUNT(CASE WHEN cr.status = 'pending' THEN 1 END) as pending_count,
  COUNT(CASE WHEN cr.status = 'completed' THEN 1 END) as completed_count,
  COUNT(*) as total_tasks
FROM current_session cs
JOIN checklist_instances ci ON ci.shift_session_id = cs.id
JOIN checklist_results cr ON cr.checklist_instance_id = ci.id
GROUP BY cs.id, cs.shift_type;

-- Show recently completed tasks (if any)
SELECT 
  ti.title,
  cr.status,
  cr.completed_at
FROM checklist_results cr
JOIN template_items ti ON ti.id = cr.template_item_id
JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
JOIN shift_sessions ss ON ss.id = ci.shift_session_id
WHERE ss.is_complete = false
  AND cr.status = 'completed'
ORDER BY cr.completed_at DESC
LIMIT 10;
