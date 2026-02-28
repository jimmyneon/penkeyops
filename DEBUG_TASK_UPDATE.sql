-- Debug why task updates aren't persisting
-- The console shows successful update but tasks revert to pending after refresh

-- 1. Check the specific task that was marked complete in console
-- Task ID from console: b0d6787b-3cd6-40b1-a269-f0557b6c9bd6
SELECT 
  cr.id,
  ti.title,
  cr.status,
  cr.completed_at,
  cr.completed_by,
  ci.shift_session_id
FROM checklist_results cr
JOIN template_items ti ON ti.id = cr.template_item_id
JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
WHERE cr.id = 'b0d6787b-3cd6-40b1-a269-f0557b6c9bd6';

-- 2. Check if ANY tasks in current session are marked complete
SELECT 
  COUNT(*) as total_tasks,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
  COUNT(CASE WHEN status = 'blocked' THEN 1 END) as blocked,
  COUNT(CASE WHEN status = 'skipped' THEN 1 END) as skipped
FROM checklist_results cr
JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
WHERE ci.shift_session_id = (
  SELECT id FROM shift_sessions 
  WHERE is_complete = false 
  ORDER BY started_at DESC 
  LIMIT 1
);

-- 3. Try to manually update a task and see if it persists
-- First, get a pending task
SELECT id, status 
FROM checklist_results 
WHERE status = 'pending' 
LIMIT 1;

-- Manually update it (uncomment and replace ID)
-- UPDATE checklist_results 
-- SET status = 'completed', completed_at = NOW(), completed_by = 'fa96c977-7a00-45e5-bb70-2e0ec4da5ff8'
-- WHERE id = 'PASTE_ID_HERE';

-- Check if the update worked
-- SELECT id, status, completed_at, completed_by
-- FROM checklist_results 
-- WHERE id = 'PASTE_ID_HERE';
