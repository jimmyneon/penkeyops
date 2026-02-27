-- This script will:
-- 1. Find your active shift session
-- 2. Create the checklist instance if missing
-- 3. Create all the checklist results (tasks) for that shift

-- First, let's see what we have
SELECT 
  ss.id as session_id,
  ss.shift_type,
  ss.started_at,
  ci.id as checklist_instance_id,
  COUNT(cr.id) as task_count
FROM shift_sessions ss
LEFT JOIN checklist_instances ci ON ci.shift_session_id = ss.id
LEFT JOIN checklist_results cr ON cr.checklist_instance_id = ci.id
WHERE ss.is_complete = false
GROUP BY ss.id, ss.shift_type, ss.started_at, ci.id;

-- If the above shows a session with no checklist_instance_id or 0 tasks, run this:
-- (Replace the shift_session_id with your actual session ID from the query above)

DO $$
DECLARE
  v_session_id uuid;
  v_template_id uuid;
  v_instance_id uuid;
BEGIN
  -- Get the active session
  SELECT id INTO v_session_id
  FROM shift_sessions
  WHERE is_complete = false
  ORDER BY started_at DESC
  LIMIT 1;

  IF v_session_id IS NULL THEN
    RAISE NOTICE 'No active shift session found';
    RETURN;
  END IF;

  RAISE NOTICE 'Found active session: %', v_session_id;

  -- Get the template for this shift type
  SELECT t.id INTO v_template_id
  FROM shift_sessions ss
  JOIN templates t ON t.template_type = ss.shift_type
  WHERE ss.id = v_session_id;

  IF v_template_id IS NULL THEN
    RAISE NOTICE 'No template found for this shift type';
    RETURN;
  END IF;

  RAISE NOTICE 'Found template: %', v_template_id;

  -- Check if checklist_instance exists
  SELECT id INTO v_instance_id
  FROM checklist_instances
  WHERE shift_session_id = v_session_id;

  -- Create checklist_instance if it doesn't exist
  IF v_instance_id IS NULL THEN
    INSERT INTO checklist_instances (shift_session_id, template_id)
    VALUES (v_session_id, v_template_id)
    RETURNING id INTO v_instance_id;
    
    RAISE NOTICE 'Created checklist instance: %', v_instance_id;
  ELSE
    RAISE NOTICE 'Checklist instance already exists: %', v_instance_id;
  END IF;

  -- Create checklist_results for all template items if they don't exist
  INSERT INTO checklist_results (
    checklist_instance_id,
    template_item_id,
    status
  )
  SELECT 
    v_instance_id,
    ti.id,
    'pending'
  FROM template_items ti
  WHERE ti.template_id = v_template_id
  AND NOT EXISTS (
    SELECT 1 FROM checklist_results cr 
    WHERE cr.checklist_instance_id = v_instance_id 
    AND cr.template_item_id = ti.id
  );

  RAISE NOTICE 'Created missing checklist results';
  
  -- Show what we created
  RAISE NOTICE 'Total tasks: %', (
    SELECT COUNT(*) 
    FROM checklist_results 
    WHERE checklist_instance_id = v_instance_id
  );
END $$;

-- Verify everything is set up correctly
SELECT 
  ss.id as session_id,
  ss.shift_type,
  ci.id as instance_id,
  ti.title as task_title,
  ti.priority,
  ti.is_critical,
  cr.status
FROM shift_sessions ss
JOIN checklist_instances ci ON ci.shift_session_id = ss.id
JOIN checklist_results cr ON cr.checklist_instance_id = ci.id
JOIN template_items ti ON ti.id = cr.template_item_id
WHERE ss.is_complete = false
ORDER BY ti.sort_order;
