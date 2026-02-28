-- Clean up all 77 duplicate sessions
-- Keep only the most recent session with completed tasks: d94f747e-2bc0-474a-8d44-f07c5a530e59

-- Mark all sessions as complete EXCEPT the one we want to keep
UPDATE shift_sessions 
SET is_complete = true, 
    completed_at = NOW()
WHERE is_complete = false 
  AND id != 'd94f747e-2bc0-474a-8d44-f07c5a530e59';

-- Verify only one active session remains
SELECT 
  id,
  started_at,
  is_complete,
  (SELECT COUNT(*) FROM checklist_instances WHERE shift_session_id = ss.id) as instance_count,
  (SELECT COUNT(*) FROM checklist_results cr 
   JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id 
   WHERE ci.shift_session_id = ss.id AND cr.status = 'completed') as completed_count,
  (SELECT COUNT(*) FROM checklist_results cr 
   JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id 
   WHERE ci.shift_session_id = ss.id AND cr.status = 'pending') as pending_count
FROM shift_sessions ss
WHERE is_complete = false
ORDER BY started_at DESC;
