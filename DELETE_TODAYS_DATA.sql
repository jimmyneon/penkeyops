-- DELETE ALL DATA FROM TODAY
-- WARNING: This will permanently delete today's shift session and all task completions
-- Use this to start fresh after running migrations

-- Step 1: Show what will be deleted (run this first to verify)
SELECT 
  'shift_sessions' as table_name,
  id,
  shift_type,
  started_at,
  is_complete
FROM shift_sessions
WHERE started_at::DATE = CURRENT_DATE

UNION ALL

SELECT 
  'checklist_instances' as table_name,
  ci.id,
  t.name as template_name,
  ci.created_at,
  NULL::boolean
FROM checklist_instances ci
JOIN shift_sessions ss ON ss.id = ci.shift_session_id
JOIN templates t ON t.id = ci.template_id
WHERE ss.started_at::DATE = CURRENT_DATE

UNION ALL

SELECT 
  'checklist_results' as table_name,
  cr.id,
  ti.title as task_title,
  cr.created_at,
  NULL::boolean
FROM checklist_results cr
JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
JOIN shift_sessions ss ON ss.id = ci.shift_session_id
JOIN template_items ti ON ti.id = cr.template_item_id
WHERE ss.started_at::DATE = CURRENT_DATE;

-- Step 2: DELETE (uncomment to actually delete)
-- WARNING: This is permanent!

-- Delete checklist results first (child records)
DELETE FROM checklist_results
WHERE checklist_instance_id IN (
  SELECT ci.id
  FROM checklist_instances ci
  JOIN shift_sessions ss ON ss.id = ci.shift_session_id
  WHERE ss.started_at::DATE = CURRENT_DATE
);

-- Delete checklist instances
DELETE FROM checklist_instances
WHERE shift_session_id IN (
  SELECT id
  FROM shift_sessions
  WHERE started_at::DATE = CURRENT_DATE
);

-- Delete shift sessions
DELETE FROM shift_sessions
WHERE started_at::DATE = CURRENT_DATE;

-- Step 3: Verify deletion
SELECT 
  (SELECT COUNT(*) FROM shift_sessions WHERE started_at::DATE = CURRENT_DATE) as sessions_remaining,
  (SELECT COUNT(*) FROM checklist_instances ci 
   JOIN shift_sessions ss ON ss.id = ci.shift_session_id 
   WHERE ss.started_at::DATE = CURRENT_DATE) as instances_remaining,
  (SELECT COUNT(*) FROM checklist_results cr
   JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
   JOIN shift_sessions ss ON ss.id = ci.shift_session_id
   WHERE ss.started_at::DATE = CURRENT_DATE) as results_remaining;

-- Should all be 0

-- Step 4: After deletion, refresh your browser
-- The system will auto-create a new session with:
-- - shift_type = 'daily' (if migration 016 ran)
-- - Single Daily Operations template
-- - All tasks in fresh state
