-- ============================================
-- TEST RESOLVER DIRECTLY
-- Run this to test if the resolver function works
-- ============================================

-- 1. Get the active shift session ID
SELECT id, shift_type, started_at 
FROM shift_sessions 
WHERE is_complete = false 
ORDER BY started_at DESC 
LIMIT 1;

-- Copy the session ID from above and use it below
-- Replace 'YOUR_SESSION_ID_HERE' with the actual ID

-- 2. Test resolve_now_action function
-- SELECT * FROM resolve_now_action('YOUR_SESSION_ID_HERE');

-- 3. Check if there are any pending tasks for this session
SELECT 
  cr.id,
  cr.status,
  ti.title,
  ti.due_time,
  ti.priority,
  ti.is_critical,
  ti.is_required,
  ti.linked_group_id
FROM checklist_results cr
JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
JOIN template_items ti ON ti.id = cr.template_item_id
WHERE ci.shift_session_id IN (
  SELECT id FROM shift_sessions WHERE is_complete = false LIMIT 1
)
AND cr.status = 'pending'
ORDER BY ti.sort_order;

-- 4. Check if checklist_instances exist
SELECT 
  ci.id,
  ci.shift_session_id,
  t.template_type,
  COUNT(cr.id) as total_tasks,
  COUNT(CASE WHEN cr.status = 'pending' THEN 1 END) as pending_tasks
FROM checklist_instances ci
JOIN templates t ON t.id = ci.template_id
LEFT JOIN checklist_results cr ON cr.checklist_instance_id = ci.id
WHERE ci.shift_session_id IN (
  SELECT id FROM shift_sessions WHERE is_complete = false LIMIT 1
)
GROUP BY ci.id, ci.shift_session_id, t.template_type;
