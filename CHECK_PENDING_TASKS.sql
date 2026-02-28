-- Check for pending tasks in active shift sessions
-- This will help diagnose why resolver returns "No tasks"

-- 1. Check active shift sessions
SELECT 
  ss.id as session_id,
  ss.shift_type,
  ss.started_at,
  ss.is_complete,
  u.full_name as started_by,
  s.name as site_name
FROM shift_sessions ss
JOIN users u ON u.id = ss.started_by
JOIN sites s ON s.id = ss.site_id
WHERE ss.is_complete = false
ORDER BY ss.started_at DESC;

-- 2. Check checklist instances for active sessions
SELECT 
  ci.id as instance_id,
  ci.shift_session_id,
  t.name as template_name,
  t.template_type,
  ci.created_at
FROM checklist_instances ci
JOIN templates t ON t.id = ci.template_id
WHERE ci.shift_session_id IN (
  SELECT id FROM shift_sessions WHERE is_complete = false
)
ORDER BY ci.created_at DESC;

-- 3. Check pending tasks for active sessions
SELECT 
  ss.id as session_id,
  ss.shift_type,
  ti.title as task_title,
  ti.priority,
  ti.is_critical,
  ti.due_time,
  cr.status,
  cr.completed_at
FROM shift_sessions ss
JOIN checklist_instances ci ON ci.shift_session_id = ss.id
JOIN checklist_results cr ON cr.checklist_instance_id = ci.id
JOIN template_items ti ON ti.id = cr.template_item_id
WHERE ss.is_complete = false
ORDER BY ss.id, ti.due_time ASC NULLS LAST, ti.sort_order ASC;

-- 4. Count pending tasks by session
SELECT 
  ss.id as session_id,
  ss.shift_type,
  COUNT(*) FILTER (WHERE cr.status = 'pending') as pending_count,
  COUNT(*) FILTER (WHERE cr.status = 'completed') as completed_count,
  COUNT(*) FILTER (WHERE cr.status = 'skipped') as skipped_count,
  COUNT(*) FILTER (WHERE cr.status = 'blocked') as blocked_count,
  COUNT(*) as total_tasks
FROM shift_sessions ss
LEFT JOIN checklist_instances ci ON ci.shift_session_id = ss.id
LEFT JOIN checklist_results cr ON cr.checklist_instance_id = ci.id
WHERE ss.is_complete = false
GROUP BY ss.id, ss.shift_type
ORDER BY ss.started_at DESC;

-- 5. Check if any templates exist
SELECT 
  t.id,
  t.name,
  t.template_type,
  t.is_active,
  COUNT(ti.id) as item_count
FROM templates t
LEFT JOIN template_items ti ON ti.template_id = t.id
WHERE t.is_active = true
GROUP BY t.id, t.name, t.template_type, t.is_active
ORDER BY t.template_type, t.name;

-- 6. Test resolver function directly for a specific session
-- Replace 'YOUR_SESSION_ID_HERE' with an actual session ID from query #1
-- SELECT * FROM resolve_now_action('YOUR_SESSION_ID_HERE');
