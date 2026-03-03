-- Delete all of today's session data for a clean restart

-- Step 1: Delete checklist_results for today's sessions
DELETE FROM checklist_results
WHERE checklist_instance_id IN (
  SELECT ci.id
  FROM checklist_instances ci
  JOIN shift_sessions ss ON ss.id = ci.shift_session_id
  WHERE ss.started_at::DATE = CURRENT_DATE
);

-- Step 2: Delete checklist_instances for today's sessions
DELETE FROM checklist_instances
WHERE shift_session_id IN (
  SELECT id FROM shift_sessions
  WHERE started_at::DATE = CURRENT_DATE
);

-- Step 3: Delete today's shift sessions
DELETE FROM shift_sessions
WHERE started_at::DATE = CURRENT_DATE;

-- Step 4: Deactivate empty "Daily Operations" templates
UPDATE templates
SET is_active = false
WHERE name = 'Daily Operations'
  AND (SELECT COUNT(*) FROM template_items WHERE template_id = templates.id) = 0;

-- Step 5: Verify cleanup
SELECT 'Sessions for today' as check_type, COUNT(*) as count
FROM shift_sessions
WHERE started_at::DATE = CURRENT_DATE

UNION ALL

SELECT 'Active templates', COUNT(*)
FROM templates
WHERE is_active = true

UNION ALL

SELECT 'Total active template items', COUNT(*)
FROM template_items ti
JOIN templates t ON t.id = ti.template_id
WHERE t.is_active = true;

-- Expected results after cleanup:
-- Sessions for today: 0
-- Active templates: 3 (Opening, Mid, Closing)
-- Total active template items: ~74
