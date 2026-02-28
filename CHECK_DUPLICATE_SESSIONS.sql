-- Check if multiple sessions are being created
-- This would explain why tasks appear complete but count resets to 22

-- 1. Show ALL incomplete sessions (should only be 1)
SELECT 
  id,
  shift_type,
  started_at,
  started_by,
  is_complete
FROM shift_sessions
WHERE is_complete = false
ORDER BY started_at DESC;

-- 2. Count tasks per session to see if there are multiple sessions with tasks
SELECT 
  ss.id as session_id,
  ss.started_at,
  COUNT(cr.id) as total_tasks,
  COUNT(CASE WHEN cr.status = 'pending' THEN 1 END) as pending,
  COUNT(CASE WHEN cr.status = 'completed' THEN 1 END) as completed
FROM shift_sessions ss
JOIN checklist_instances ci ON ci.shift_session_id = ss.id
JOIN checklist_results cr ON cr.checklist_instance_id = ci.id
WHERE ss.is_complete = false
GROUP BY ss.id, ss.started_at
ORDER BY ss.started_at DESC;

-- 3. Show which session has the completed tasks
SELECT 
  ss.id as session_id,
  ss.started_at,
  ti.title,
  cr.status,
  cr.completed_at
FROM checklist_results cr
JOIN template_items ti ON ti.id = cr.template_item_id
JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
JOIN shift_sessions ss ON ss.id = ci.shift_session_id
WHERE cr.status = 'completed'
  AND ss.is_complete = false
ORDER BY ss.started_at DESC, cr.completed_at DESC
LIMIT 20;
