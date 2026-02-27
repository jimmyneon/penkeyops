-- ============================================
-- VERIFY SETUP - Run this to check everything is working
-- ============================================

-- 1. Check if RPC functions exist
SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('resolve_now_action', 'get_coming_up_tasks', 'get_group_tasks', 'get_current_phase')
ORDER BY routine_name;

-- 2. Check if templates exist
SELECT id, template_type, name FROM templates ORDER BY template_type;

-- 3. Check if template_items were loaded
SELECT 
  t.template_type,
  COUNT(*) as task_count
FROM template_items ti
JOIN templates t ON t.id = ti.template_id
GROUP BY t.template_type
ORDER BY t.template_type;

-- 4. Check sample template items
SELECT 
  t.template_type,
  ti.sort_order,
  ti.title,
  ti.due_time,
  ti.priority,
  ti.is_critical,
  ti.linked_group_id
FROM template_items ti
JOIN templates t ON t.id = ti.template_id
WHERE t.template_type = 'opening'
ORDER BY ti.sort_order
LIMIT 5;

-- 5. Check if task groups exist
SELECT * FROM task_groups;

-- 6. Check if shift_phases exist
SELECT * FROM shift_phases;

-- 7. Check active shift sessions
SELECT 
  id,
  shift_type,
  started_at,
  is_complete
FROM shift_sessions
WHERE is_complete = false
ORDER BY started_at DESC;

-- 8. If there's an active session, check its checklist_instances
SELECT 
  ci.id,
  ci.shift_session_id,
  t.template_type,
  COUNT(cr.id) as task_count
FROM checklist_instances ci
JOIN templates t ON t.id = ci.template_id
LEFT JOIN checklist_results cr ON cr.checklist_instance_id = ci.id
WHERE ci.shift_session_id IN (
  SELECT id FROM shift_sessions WHERE is_complete = false LIMIT 1
)
GROUP BY ci.id, ci.shift_session_id, t.template_type;
