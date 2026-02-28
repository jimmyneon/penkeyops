-- ============================================
-- RESET TODAY'S TASKS FOR TESTING
-- Deletes all checklist results for today's shift session
-- This will make all tasks reappear on the dashboard
-- ============================================

-- Find today's shift session ID (replace with your actual session ID if needed)
-- You can get this from the console logs or run:
-- SELECT id, started_at FROM shift_sessions WHERE started_at::DATE = CURRENT_DATE;

-- Delete all checklist results for today's session
-- This will make tasks reappear as pending
DELETE FROM checklist_results
WHERE checklist_instance_id IN (
  SELECT ci.id 
  FROM checklist_instances ci
  JOIN shift_sessions ss ON ss.id = ci.shift_session_id
  WHERE ss.started_at::DATE = CURRENT_DATE
);

-- Optional: Also clear notifications for today
DELETE FROM notifications
WHERE created_at::DATE = CURRENT_DATE;

-- Optional: Clear audit trail for today
DELETE FROM audit_trail
WHERE created_at::DATE = CURRENT_DATE;

-- Verify what's left
SELECT 
  'Remaining results' as type,
  COUNT(*) as count
FROM checklist_results cr
JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
JOIN shift_sessions ss ON ss.id = ci.shift_session_id
WHERE ss.started_at::DATE = CURRENT_DATE

UNION ALL

SELECT 
  'Today notifications' as type,
  COUNT(*) as count
FROM notifications
WHERE created_at::DATE = CURRENT_DATE

UNION ALL

SELECT 
  'Today audit trail' as type,
  COUNT(*) as count
FROM audit_trail
WHERE created_at::DATE = CURRENT_DATE;
