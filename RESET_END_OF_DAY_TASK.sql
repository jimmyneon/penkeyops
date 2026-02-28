-- Reset the End of Day task to pending so we can test the completion flow
-- Session: d94f747e-2bc0-474a-8d44-f07c5a530e59

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

-- Verify it's now pending
SELECT 
  ti.title,
  cr.status,
  cr.completed_at
FROM checklist_results cr
JOIN template_items ti ON ti.id = cr.template_item_id
JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
WHERE ci.shift_session_id = 'd94f747e-2bc0-474a-8d44-f07c5a530e59'
  AND ti.title = 'End of Day';
