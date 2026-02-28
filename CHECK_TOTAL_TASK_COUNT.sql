-- Check total task count for current session
-- Session: d94f747e-2bc0-474a-8d44-f07c5a530e59

-- 1. Total tasks in session
SELECT 
  COUNT(*) as total_tasks,
  COUNT(CASE WHEN cr.status = 'completed' THEN 1 END) as completed_count,
  COUNT(CASE WHEN cr.status = 'pending' THEN 1 END) as pending_count,
  COUNT(CASE WHEN cr.status = 'skipped' THEN 1 END) as skipped_count,
  COUNT(CASE WHEN cr.status = 'blocked' THEN 1 END) as blocked_count
FROM checklist_results cr
JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
WHERE ci.shift_session_id = 'd94f747e-2bc0-474a-8d44-f07c5a530e59';

-- 2. Breakdown by template/checklist
SELECT 
  t.name as template_name,
  COUNT(*) as task_count,
  COUNT(CASE WHEN cr.status = 'completed' THEN 1 END) as completed,
  COUNT(CASE WHEN cr.status = 'pending' THEN 1 END) as pending
FROM checklist_results cr
JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
JOIN templates t ON t.id = ci.template_id
WHERE ci.shift_session_id = 'd94f747e-2bc0-474a-8d44-f07c5a530e59'
GROUP BY t.name
ORDER BY t.name;

-- 3. Check if any tasks are filtered out by is_required
SELECT 
  ti.title,
  ti.is_required,
  ti.sort_order,
  ti.priority,
  cr.status,
  ti.linked_group_id
FROM checklist_results cr
JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
JOIN template_items ti ON ti.id = cr.template_item_id
WHERE ci.shift_session_id = 'd94f747e-2bc0-474a-8d44-f07c5a530e59'
  AND cr.status = 'pending'
ORDER BY ti.sort_order;

-- 4. Count tasks by linked_group_id (grouped tasks)
SELECT 
  ti.linked_group_id,
  tg.name as group_name,
  COUNT(*) as tasks_in_group,
  COUNT(CASE WHEN cr.status = 'pending' THEN 1 END) as pending_in_group
FROM checklist_results cr
JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
JOIN template_items ti ON ti.id = cr.template_item_id
LEFT JOIN task_groups tg ON tg.id = ti.linked_group_id
WHERE ci.shift_session_id = 'd94f747e-2bc0-474a-8d44-f07c5a530e59'
  AND ti.linked_group_id IS NOT NULL
GROUP BY ti.linked_group_id, tg.name
ORDER BY tg.name;
