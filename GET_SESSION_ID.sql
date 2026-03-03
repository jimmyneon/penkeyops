-- Get your current session ID
-- Run this first, then copy the ID into the other scripts

SELECT 
  id as session_id,
  shift_type,
  started_at,
  is_complete,
  completed_at
FROM shift_sessions
WHERE started_at::DATE = CURRENT_DATE
ORDER BY started_at DESC
LIMIT 1;

-- Copy the 'session_id' value from the result above
-- It will look like: d19e64d8-b5ca-49f7-a9ec-07aa21cb070c
-- Then replace 'YOUR_SESSION_ID_HERE' in the other scripts with this value
