-- Clean up duplicate sessions and keep only the most recent one
-- This will consolidate all completed tasks into one session

-- 1. First, check which sessions exist
SELECT 
  id,
  started_at,
  is_complete,
  (SELECT COUNT(*) FROM checklist_instances WHERE shift_session_id = ss.id) as instance_count,
  (SELECT COUNT(*) FROM checklist_results cr 
   JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id 
   WHERE ci.shift_session_id = ss.id AND cr.status = 'completed') as completed_count
FROM shift_sessions ss
WHERE is_complete = false
ORDER BY started_at DESC;

-- 2. Mark old sessions as complete (keep only the most recent)
-- This will make useShiftSession only return the newest session
-- Uncomment to execute:

-- UPDATE shift_sessions 
-- SET is_complete = true, completed_at = NOW()
-- WHERE is_complete = false 
--   AND id != (
--     SELECT id FROM shift_sessions 
--     WHERE is_complete = false 
--     ORDER BY started_at DESC 
--     LIMIT 1
--   );

-- 3. Verify only one active session remains
-- SELECT id, started_at, is_complete 
-- FROM shift_sessions 
-- WHERE is_complete = false;
