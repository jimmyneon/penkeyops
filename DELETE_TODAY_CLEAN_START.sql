-- Delete today's session data for a clean test
-- Run this BEFORE running RUN_IN_SUPABASE.sql

-- Step 1: Delete checklist_results for today's session
DELETE FROM checklist_results
WHERE checklist_instance_id IN (
  SELECT ci.id
  FROM checklist_instances ci
  JOIN shift_sessions ss ON ss.id = ci.shift_session_id
  WHERE ss.started_at::DATE = CURRENT_DATE
);

-- Step 2: Delete checklist_instances for today's session
DELETE FROM checklist_instances
WHERE shift_session_id IN (
  SELECT id FROM shift_sessions
  WHERE started_at::DATE = CURRENT_DATE
);

-- Step 3: Delete today's shift session
DELETE FROM shift_sessions
WHERE started_at::DATE = CURRENT_DATE;

-- Verify deletion
SELECT 
  'Sessions deleted' as status,
  COUNT(*) as remaining_today_sessions
FROM shift_sessions
WHERE started_at::DATE = CURRENT_DATE;

-- DONE! Now:
-- 1. Run RUN_IN_SUPABASE.sql to update the resolver function
-- 2. Refresh your browser
-- 3. New session will auto-create
-- 4. You'll see Start Day button first
