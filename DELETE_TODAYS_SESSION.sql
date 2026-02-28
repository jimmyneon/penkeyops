-- Delete today's session to start fresh
-- This will allow auto-create to make a new session with ALL templates loaded

-- 1. Find today's session(s)
SELECT 
  id,
  shift_type,
  started_at,
  is_complete
FROM shift_sessions
WHERE started_at >= CURRENT_DATE
ORDER BY started_at DESC;

-- 2. Delete today's session (this will cascade delete all related data)
-- WARNING: This deletes the session and all its tasks/results
DELETE FROM shift_sessions
WHERE started_at >= CURRENT_DATE;

-- 3. Verify deletion
SELECT COUNT(*) as remaining_sessions_today
FROM shift_sessions
WHERE started_at >= CURRENT_DATE;

-- After running this:
-- 1. Refresh the dashboard in your browser
-- 2. New session will auto-create with ALL templates:
--    - Opening Checklist (21 tasks)
--    - Mid Shift Checklist (26 tasks)
--    - Closing Checklist (22 tasks global)
--    - Closing Checklist (1 task site-specific)
-- 3. Should see ~69 tasks total in upcoming (when expanded)
