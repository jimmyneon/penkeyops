-- Check what tasks exist in the database and their priorities
-- Session: d94f747e-2bc0-474a-8d44-f07c5a530e59

-- 1. Check all template items and their priorities
SELECT 
  t.name as template_name,
  t.template_type,
  ti.title,
  ti.priority,
  ti.is_critical,
  ti.is_required,
  ti.due_time,
  ti.sort_order
FROM template_items ti
JOIN templates t ON t.id = ti.template_id
WHERE t.is_active = true
ORDER BY t.template_type, ti.sort_order;

-- 2. Check what tasks are in the current session
SELECT 
  ti.title,
  ti.priority,
  ti.is_critical,
  ti.is_required,
  ti.due_time,
  ti.sort_order,
  cr.status
FROM checklist_results cr
JOIN template_items ti ON ti.id = cr.template_item_id
JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
WHERE ci.shift_session_id = 'd94f747e-2bc0-474a-8d44-f07c5a530e59'
ORDER BY ti.sort_order;

-- 3. Count tasks by priority
SELECT 
  ti.priority,
  COUNT(*) as task_count,
  COUNT(CASE WHEN cr.status = 'pending' THEN 1 END) as pending_count,
  COUNT(CASE WHEN cr.status = 'completed' THEN 1 END) as completed_count
FROM checklist_results cr
JOIN template_items ti ON ti.id = cr.template_item_id
JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
WHERE ci.shift_session_id = 'd94f747e-2bc0-474a-8d44-f07c5a530e59'
GROUP BY ti.priority
ORDER BY ti.priority;
