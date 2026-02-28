-- Check if End of Day task exists in the current session
-- Session: d94f747e-2bc0-474a-8d44-f07c5a530e59

SELECT 
  ti.title,
  ti.due_time,
  ti.is_critical,
  cr.status,
  cr.completed_at
FROM checklist_results cr
JOIN template_items ti ON ti.id = cr.template_item_id
JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
WHERE ci.shift_session_id = 'd94f747e-2bc0-474a-8d44-f07c5a530e59'
  AND (ti.title ILIKE '%end of day%' OR ti.title ILIKE '%confirm end%')
ORDER BY ti.sort_order;

-- Show all tasks in this session to see what's there
SELECT 
  ti.title,
  ti.due_time,
  ti.sort_order,
  cr.status,
  cr.completed_at
FROM checklist_results cr
JOIN template_items ti ON ti.id = cr.template_item_id
JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
WHERE ci.shift_session_id = 'd94f747e-2bc0-474a-8d44-f07c5a530e59'
ORDER BY ti.sort_order;
