-- Verify if deletion actually worked

-- 1. Check if any sessions exist for today
SELECT 
  'Sessions for today' as info,
  id,
  started_at,
  is_complete,
  shift_type
FROM shift_sessions
WHERE started_at::DATE = CURRENT_DATE
ORDER BY started_at;

-- 2. Check if any checklist_results exist for today
SELECT 
  'Checklist results for today' as info,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE cr.status = 'completed') as completed_count,
  COUNT(*) FILTER (WHERE cr.status = 'pending') as pending_count
FROM checklist_results cr
JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
JOIN shift_sessions ss ON ss.id = ci.shift_session_id
WHERE ss.started_at::DATE = CURRENT_DATE;

-- 3. If records still exist, this will show them
SELECT 
  ss.id as session_id,
  ss.started_at,
  ti.title as task_title,
  cr.status,
  cr.completed_at
FROM checklist_results cr
JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
JOIN shift_sessions ss ON ss.id = ci.shift_session_id
JOIN template_items ti ON ti.id = cr.template_item_id
WHERE ss.started_at::DATE = CURRENT_DATE
ORDER BY cr.status DESC, ti.sort_order
LIMIT 20;

-- If you see records here, the DELETE didn't work
-- Possible reasons:
-- 1. Foreign key constraints preventing deletion
-- 2. RLS policies blocking the delete
-- 3. Wrong date filter (timezone issue)
