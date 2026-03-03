-- Check how many tasks exist in templates vs current session

-- 1. Count template items (should be ~72)
SELECT 
  'Template Items' as source,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE is_required) as required_count,
  COUNT(*) FILTER (WHERE is_critical) as critical_count
FROM template_items
WHERE title NOT ILIKE '%end%day%'
  AND title NOT ILIKE '%confirm%end%'
  AND title NOT ILIKE '%start%day%'
  AND title NOT ILIKE '%start%shift%';

-- 2. Count checklist results for today's session
SELECT 
  'Today Session Tasks' as source,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE cr.status = 'pending') as pending_count,
  COUNT(*) FILTER (WHERE cr.status = 'completed') as completed_count,
  COUNT(*) FILTER (WHERE ti.is_required) as required_count,
  COUNT(*) FILTER (WHERE ti.is_critical) as critical_count
FROM checklist_results cr
JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
JOIN template_items ti ON ti.id = cr.template_item_id
JOIN shift_sessions ss ON ss.id = ci.shift_session_id
WHERE ss.started_at::DATE = CURRENT_DATE;

-- 3. Show today's session details
SELECT 
  id,
  started_at,
  completed_at,
  is_complete,
  shift_type
FROM shift_sessions
WHERE started_at::DATE = CURRENT_DATE;

-- 4. Check if checklist instances were created
SELECT 
  ci.id as instance_id,
  t.name as template_name,
  COUNT(cr.id) as task_count
FROM checklist_instances ci
JOIN templates t ON t.id = ci.template_id
LEFT JOIN checklist_results cr ON cr.checklist_instance_id = ci.id
JOIN shift_sessions ss ON ss.id = ci.shift_session_id
WHERE ss.started_at::DATE = CURRENT_DATE
GROUP BY ci.id, t.name;

-- 5. List all active templates
SELECT 
  id,
  name,
  template_type,
  is_active,
  (SELECT COUNT(*) FROM template_items WHERE template_id = templates.id) as item_count
FROM templates
WHERE is_active = true
ORDER BY name;
