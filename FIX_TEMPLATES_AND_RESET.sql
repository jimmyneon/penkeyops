-- Fix template issues and reset today's data
-- Problem: Multiple "Daily Operations" templates with 0 items, old templates still active

-- STEP 1: Delete today's session data
DELETE FROM checklist_results
WHERE checklist_instance_id IN (
  SELECT ci.id
  FROM checklist_instances ci
  JOIN shift_sessions ss ON ss.id = ci.shift_session_id
  WHERE ss.started_at::DATE = CURRENT_DATE
);

DELETE FROM checklist_instances
WHERE shift_session_id IN (
  SELECT id FROM shift_sessions
  WHERE started_at::DATE = CURRENT_DATE
);

DELETE FROM shift_sessions
WHERE started_at::DATE = CURRENT_DATE;

-- STEP 2: Deactivate empty "Daily Operations" templates
UPDATE templates
SET is_active = false
WHERE name = 'Daily Operations'
  AND (
    SELECT COUNT(*) FROM template_items WHERE template_id = templates.id
  ) = 0;

-- STEP 3: Check what we have now
SELECT 
  id,
  name,
  template_type,
  is_active,
  (SELECT COUNT(*) FROM template_items WHERE template_id = templates.id) as item_count
FROM templates
WHERE is_active = true
ORDER BY name;

-- STEP 4: Verify total task count
SELECT 
  'Total Active Template Items' as info,
  COUNT(*) as count
FROM template_items ti
JOIN templates t ON t.id = ti.template_id
WHERE t.is_active = true
  AND ti.title NOT ILIKE '%end%day%'
  AND ti.title NOT ILIKE '%start%day%';

-- Expected result: Should see ~74 tasks from opening (19) + mid (25) + closing (30)
-- If you want ONE consolidated daily template instead, we need to run migration 016
