-- Check if grouped tasks explain the "missing" task count
-- Session: d94f747e-2bc0-474a-8d44-f07c5a530e59

-- 1. Count tasks by group status
SELECT 
  CASE 
    WHEN ti.linked_group_id IS NOT NULL THEN 'Grouped Task'
    ELSE 'Individual Task'
  END as task_type,
  COUNT(*) as count,
  COUNT(CASE WHEN cr.status = 'completed' THEN 1 END) as completed,
  COUNT(CASE WHEN cr.status = 'pending' THEN 1 END) as pending
FROM checklist_results cr
JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
JOIN template_items ti ON ti.id = cr.template_item_id
WHERE ci.shift_session_id = 'd94f747e-2bc0-474a-8d44-f07c5a530e59'
GROUP BY task_type;

-- 2. List all groups with their microtask counts
SELECT 
  tg.id as group_id,
  tg.name as group_name,
  COUNT(*) as microtask_count,
  COUNT(CASE WHEN cr.status = 'completed' THEN 1 END) as completed_count,
  COUNT(CASE WHEN cr.status = 'pending' THEN 1 END) as pending_count,
  MIN(ti.due_time) as earliest_due_time,
  MIN(ti.priority) as highest_priority
FROM checklist_results cr
JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
JOIN template_items ti ON ti.id = cr.template_item_id
JOIN task_groups tg ON tg.id = ti.linked_group_id
WHERE ci.shift_session_id = 'd94f747e-2bc0-474a-8d44-f07c5a530e59'
GROUP BY tg.id, tg.name
ORDER BY tg.name;

-- 3. Show individual tasks (non-grouped)
SELECT 
  ti.title,
  ti.sort_order,
  ti.priority,
  ti.due_time,
  cr.status
FROM checklist_results cr
JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
JOIN template_items ti ON ti.id = cr.template_item_id
WHERE ci.shift_session_id = 'd94f747e-2bc0-474a-8d44-f07c5a530e59'
  AND ti.linked_group_id IS NULL
ORDER BY ti.sort_order;

-- 4. Calculate UI display count
-- (individual tasks + number of groups = what user sees)
SELECT 
  (SELECT COUNT(DISTINCT ti.id) 
   FROM checklist_results cr
   JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
   JOIN template_items ti ON ti.id = cr.template_item_id
   WHERE ci.shift_session_id = 'd94f747e-2bc0-474a-8d44-f07c5a530e59'
     AND ti.linked_group_id IS NULL) as individual_tasks,
  (SELECT COUNT(DISTINCT ti.linked_group_id)
   FROM checklist_results cr
   JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
   JOIN template_items ti ON ti.id = cr.template_item_id
   WHERE ci.shift_session_id = 'd94f747e-2bc0-474a-8d44-f07c5a530e59'
     AND ti.linked_group_id IS NOT NULL) as number_of_groups,
  (SELECT COUNT(DISTINCT ti.id) 
   FROM checklist_results cr
   JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
   JOIN template_items ti ON ti.id = cr.template_item_id
   WHERE ci.shift_session_id = 'd94f747e-2bc0-474a-8d44-f07c5a530e59'
     AND ti.linked_group_id IS NULL) +
  (SELECT COUNT(DISTINCT ti.linked_group_id)
   FROM checklist_results cr
   JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
   JOIN template_items ti ON ti.id = cr.template_item_id
   WHERE ci.shift_session_id = 'd94f747e-2bc0-474a-8d44-f07c5a530e59'
     AND ti.linked_group_id IS NOT NULL) as total_ui_items;
