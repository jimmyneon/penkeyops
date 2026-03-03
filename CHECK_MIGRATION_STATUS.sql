-- Check if migrations have been run successfully

-- 1. Check if can_end_day function exists (from migration 015)
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE proname = 'can_end_day';

-- 2. Check if Daily Operations template was created (from migration 016)
SELECT 
  name,
  template_type,
  is_active,
  site_id,
  (SELECT COUNT(*) FROM template_items WHERE template_id = templates.id) as task_count
FROM templates
WHERE template_type = 'daily'
   OR name ILIKE '%daily%operations%';

-- 3. Check old templates status
SELECT 
  name,
  template_type,
  is_active,
  (SELECT COUNT(*) FROM template_items WHERE template_id = templates.id) as task_count
FROM templates
WHERE template_type IN ('opening', 'mid', 'closing')
ORDER BY template_type, is_active DESC;

-- 4. Check current session
SELECT 
  id,
  shift_type,
  started_at,
  is_complete,
  completed_at
FROM shift_sessions
WHERE started_at::DATE = CURRENT_DATE
ORDER BY started_at DESC
LIMIT 5;

-- 5. If you have an active session, check what templates are instantiated
SELECT 
  ss.id as session_id,
  ss.shift_type,
  t.name as template_name,
  t.template_type,
  t.is_active as template_active,
  COUNT(cr.id) as total_tasks,
  SUM(CASE WHEN cr.status = 'pending' THEN 1 ELSE 0 END) as pending_tasks,
  SUM(CASE WHEN cr.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks
FROM shift_sessions ss
JOIN checklist_instances ci ON ci.shift_session_id = ss.id
JOIN templates t ON t.id = ci.template_id
LEFT JOIN checklist_results cr ON cr.checklist_instance_id = ci.id
WHERE ss.started_at::DATE = CURRENT_DATE
  AND ss.is_complete = false
GROUP BY ss.id, ss.shift_type, t.name, t.template_type, t.is_active
ORDER BY ss.started_at DESC;

-- 6. Check pending required/critical tasks (what's blocking end day)
SELECT 
  ti.title,
  ti.is_required,
  ti.is_critical,
  cr.status,
  t.template_type,
  CASE 
    WHEN ti.title ILIKE '%end%day%' OR ti.title ILIKE '%confirm%end%' 
    THEN 'END DAY TASK (excluded from can_end_day check)'
    WHEN ti.is_required OR ti.is_critical 
    THEN 'BLOCKING end of day'
    ELSE 'Not blocking'
  END as blocking_status
FROM checklist_results cr
JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
JOIN template_items ti ON ti.id = cr.template_item_id
JOIN templates t ON t.id = ti.template_id
WHERE ci.shift_session_id IN (
  SELECT id FROM shift_sessions 
  WHERE started_at::DATE = CURRENT_DATE 
    AND is_complete = false
  LIMIT 1
)
AND cr.status = 'pending'
ORDER BY 
  CASE WHEN ti.is_required OR ti.is_critical THEN 0 ELSE 1 END,
  ti.sort_order;
