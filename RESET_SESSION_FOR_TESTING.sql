-- Reset both the End of Day task AND the session to incomplete for testing
-- Session: d94f747e-2bc0-474a-8d44-f07c5a530e59

-- 1. Mark session as incomplete
UPDATE shift_sessions
SET is_complete = false,
    completed_at = NULL,
    completed_by = NULL
WHERE id = 'd94f747e-2bc0-474a-8d44-f07c5a530e59';

-- 2. Reset End of Day task to pending
UPDATE checklist_results
SET status = 'pending', 
    completed_at = NULL,
    completed_by = NULL
WHERE id IN (
  SELECT cr.id
  FROM checklist_results cr
  JOIN template_items ti ON ti.id = cr.template_item_id
  JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
  WHERE ci.shift_session_id = 'd94f747e-2bc0-474a-8d44-f07c5a530e59'
    AND ti.title = 'End of Day'
);

-- 3. Verify session is incomplete and task is pending
SELECT 
  ss.id,
  ss.is_complete,
  ss.completed_at,
  ti.title,
  cr.status
FROM shift_sessions ss
JOIN checklist_instances ci ON ci.shift_session_id = ss.id
JOIN checklist_results cr ON cr.checklist_instance_id = ci.id
JOIN template_items ti ON ti.id = cr.template_item_id
WHERE ss.id = 'd94f747e-2bc0-474a-8d44-f07c5a530e59'
  AND ti.title = 'End of Day';
