-- Fix: Ensure Start Day appears instead of End Day

-- First, verify the session state
SELECT 
  id,
  started_at,
  is_complete,
  'Session should have NULL started_at' as note
FROM shift_sessions
ORDER BY created_at DESC
LIMIT 1;

-- Check if can_end_day is incorrectly returning true
SELECT 
  ss.id as session_id,
  can_end_day(ss.id) as can_end_result,
  COUNT(*) FILTER (WHERE cr.status = 'pending' AND ti.is_required) as pending_required,
  COUNT(*) FILTER (WHERE cr.status = 'pending' AND ti.is_critical) as pending_critical,
  COUNT(*) FILTER (WHERE cr.status = 'pending') as total_pending
FROM shift_sessions ss
JOIN checklist_instances ci ON ci.shift_session_id = ss.id
JOIN checklist_results cr ON cr.checklist_instance_id = ci.id
JOIN template_items ti ON ti.id = cr.template_item_id
WHERE ss.id = (SELECT id FROM shift_sessions ORDER BY created_at DESC LIMIT 1)
GROUP BY ss.id;

-- The issue: You need to run RUN_IN_SUPABASE.sql first!
-- That script updates the resolve_now_action function to include Start Day logic

-- After running RUN_IN_SUPABASE.sql, refresh browser and you should see Start Day button
