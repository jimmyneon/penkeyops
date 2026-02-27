-- ============================================
-- COUNT TASKS - Verify task counts
-- ============================================

-- Count tasks by template type
SELECT 
  t.template_type,
  COUNT(*) as task_count
FROM template_items ti
JOIN templates t ON t.id = ti.template_id
GROUP BY t.template_type
ORDER BY t.template_type;

-- Total task count
SELECT 
  COUNT(*) as total_tasks
FROM template_items;

-- Show all tasks with times
SELECT 
  t.template_type,
  ti.sort_order,
  ti.due_time,
  ti.title,
  ti.priority,
  ti.is_critical
FROM template_items ti
JOIN templates t ON t.id = ti.template_id
ORDER BY t.template_type, ti.due_time, ti.sort_order;
