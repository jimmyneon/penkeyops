-- Manually create a session since auto-create isn't working

-- Step 1: Get your site_id and user_id
SELECT 
  'Your site info' as info,
  s.id as site_id,
  s.name as site_name
FROM sites s
LIMIT 1;

-- Copy the site_id from above, then run:

-- Step 2: Create session (REPLACE the UUIDs below)
INSERT INTO shift_sessions (site_id, started_by, shift_type, started_at)
VALUES (
  (SELECT id FROM sites LIMIT 1),  -- Auto-gets first site
  (SELECT id FROM auth.users LIMIT 1),  -- Auto-gets first user
  'daily',
  NOW()
)
RETURNING id, started_at, shift_type;

-- Step 3: Get the session ID from above and create checklists
-- Copy the session_id from the result above

-- Get active templates
SELECT id, name, is_active 
FROM templates 
WHERE is_active = true
ORDER BY name;

-- For EACH template, run this (replace SESSION_ID with actual ID from step 2):
-- Opening template
SELECT create_checklist_from_template(
  (SELECT id FROM shift_sessions ORDER BY started_at DESC LIMIT 1),
  (SELECT id FROM templates WHERE name = 'Opening Checklist' AND is_active = true LIMIT 1)
);

-- Mid template
SELECT create_checklist_from_template(
  (SELECT id FROM shift_sessions ORDER BY started_at DESC LIMIT 1),
  (SELECT id FROM templates WHERE name = 'Mid Shift Checklist' AND is_active = true LIMIT 1)
);

-- Closing template
SELECT create_checklist_from_template(
  (SELECT id FROM shift_sessions ORDER BY started_at DESC LIMIT 1),
  (SELECT id FROM templates WHERE name = 'Closing Checklist' AND is_active = true LIMIT 1)
);

-- Step 4: Verify tasks were created
SELECT 
  'Tasks created' as info,
  COUNT(*) as task_count
FROM checklist_results cr
JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
JOIN shift_sessions ss ON ss.id = ci.shift_session_id
WHERE ss.id = (SELECT id FROM shift_sessions ORDER BY started_at DESC LIMIT 1);

-- Should show ~74 tasks
