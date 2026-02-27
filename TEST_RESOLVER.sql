-- Test if resolver functions exist and work
-- Run this to verify the functions are accessible

-- 1. Check if functions exist
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('resolve_now_action', 'get_coming_up_tasks', 'get_group_tasks', 'get_current_phase');

-- 2. Test get_current_phase (should work without session)
SELECT get_current_phase((SELECT id FROM sites LIMIT 1));

-- 3. Get an active session ID to test with
SELECT id, shift_type, started_at 
FROM shift_sessions 
WHERE is_complete = false 
ORDER BY started_at DESC 
LIMIT 1;

-- 4. Test resolve_now_action with the session ID from above
-- Replace 'YOUR_SESSION_ID' with actual ID from query above
-- SELECT * FROM resolve_now_action('YOUR_SESSION_ID');

-- 5. Test get_coming_up_tasks
-- SELECT * FROM get_coming_up_tasks('YOUR_SESSION_ID', 4);
