-- Find the session that's blocking auto-create

-- The auto-create checks for sessions with started_at >= today at 00:00
-- Let's see what it's finding

-- 1. Check what "today" is in the database timezone
SELECT 
  CURRENT_DATE as current_date,
  CURRENT_TIMESTAMP as current_timestamp,
  NOW() as now;

-- 2. Find ALL sessions that would match the auto-create check
-- This is exactly what the app checks:
SELECT 
  id,
  started_at,
  started_at::DATE as started_date,
  completed_at,
  is_complete,
  shift_type,
  'This session is blocking auto-create' as note
FROM shift_sessions
WHERE started_at >= (CURRENT_DATE::timestamp)
ORDER BY started_at DESC;

-- 3. Delete ALL sessions from today (including timezone variations)
DELETE FROM shift_sessions
WHERE started_at >= (CURRENT_DATE::timestamp);

-- 4. Verify deletion
SELECT 
  'Sessions remaining for today' as check,
  COUNT(*) as count
FROM shift_sessions
WHERE started_at >= (CURRENT_DATE::timestamp);

-- Should show 0

-- 5. Also check for any sessions in the last 24 hours
SELECT 
  id,
  started_at,
  is_complete
FROM shift_sessions
WHERE started_at >= NOW() - INTERVAL '24 hours'
ORDER BY started_at DESC;
