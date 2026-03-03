-- Nuclear option: Delete EVERYTHING for March 3rd, 2026

-- First, let's see what exists for March 3rd across ALL tables
SELECT 'shift_sessions' as table_name, COUNT(*) as count
FROM shift_sessions
WHERE started_at::DATE = '2026-03-03'

UNION ALL

SELECT 'checklist_instances', COUNT(*)
FROM checklist_instances ci
JOIN shift_sessions ss ON ss.id = ci.shift_session_id
WHERE ss.started_at::DATE = '2026-03-03'

UNION ALL

SELECT 'checklist_results', COUNT(*)
FROM checklist_results cr
JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
JOIN shift_sessions ss ON ss.id = ci.shift_session_id
WHERE ss.started_at::DATE = '2026-03-03';

-- Now delete EVERYTHING for March 3rd
-- Step 1: Delete checklist_results
DELETE FROM checklist_results
WHERE checklist_instance_id IN (
  SELECT ci.id
  FROM checklist_instances ci
  JOIN shift_sessions ss ON ss.id = ci.shift_session_id
  WHERE ss.started_at::DATE = '2026-03-03'
);

-- Step 2: Delete checklist_instances
DELETE FROM checklist_instances
WHERE shift_session_id IN (
  SELECT id FROM shift_sessions
  WHERE started_at::DATE = '2026-03-03'
);

-- Step 3: Delete shift_sessions
DELETE FROM shift_sessions
WHERE started_at::DATE = '2026-03-03';

-- Step 4: Also check for any sessions with completed_at on March 3rd
DELETE FROM shift_sessions
WHERE completed_at::DATE = '2026-03-03';

-- Verify everything is gone
SELECT 'After deletion - shift_sessions' as check_type, COUNT(*) as count
FROM shift_sessions
WHERE started_at::DATE = '2026-03-03' OR completed_at::DATE = '2026-03-03'

UNION ALL

SELECT 'After deletion - checklist_results', COUNT(*)
FROM checklist_results cr
JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
JOIN shift_sessions ss ON ss.id = ci.shift_session_id
WHERE ss.started_at::DATE = '2026-03-03' OR ss.completed_at::DATE = '2026-03-03';

-- Should show 0 for everything
