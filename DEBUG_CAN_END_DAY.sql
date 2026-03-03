-- Debug can_end_day function to see what's blocking end of shift
-- Replace SESSION_ID with your actual session ID

DO $$
DECLARE
  v_session_id UUID := 'YOUR_SESSION_ID_HERE'; -- Replace this
  v_incomplete_required INTEGER;
  v_incomplete_critical INTEGER;
  v_can_end BOOLEAN;
  v_task RECORD;
BEGIN
  -- Check what can_end_day returns
  SELECT can_end_day(v_session_id) INTO v_can_end;
  RAISE NOTICE 'can_end_day result: %', v_can_end;
  
  -- Count incomplete required tasks (excluding End Day)
  SELECT COUNT(*) INTO v_incomplete_required
  FROM checklist_results cr
  JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
  JOIN template_items ti ON ti.id = cr.template_item_id
  WHERE ci.shift_session_id = v_session_id
    AND cr.status = 'pending'
    AND ti.is_required = true
    AND ti.title NOT ILIKE '%end%day%'
    AND ti.title NOT ILIKE '%confirm%end%';
  
  RAISE NOTICE 'Incomplete required tasks (excluding End Day): %', v_incomplete_required;
  
  -- Count incomplete critical tasks (excluding End Day)
  SELECT COUNT(*) INTO v_incomplete_critical
  FROM checklist_results cr
  JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
  JOIN template_items ti ON ti.id = cr.template_item_id
  WHERE ci.shift_session_id = v_session_id
    AND cr.status = 'pending'
    AND ti.is_critical = true
    AND ti.title NOT ILIKE '%end%day%'
    AND ti.title NOT ILIKE '%confirm%end%';
  
  RAISE NOTICE 'Incomplete critical tasks (excluding End Day): %', v_incomplete_critical;
  
  -- Show ALL pending tasks
  RAISE NOTICE '--- ALL PENDING TASKS ---';
  FOR v_task IN 
    SELECT ti.title, ti.is_required, ti.is_critical, cr.status
    FROM checklist_results cr
    JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
    JOIN template_items ti ON ti.id = cr.template_item_id
    WHERE ci.shift_session_id = v_session_id
      AND cr.status = 'pending'
    ORDER BY ti.sort_order
  LOOP
    RAISE NOTICE 'Task: % | Required: % | Critical: % | Status: %', 
      v_task.title, v_task.is_required, v_task.is_critical, v_task.status;
  END LOOP;
END $$;

-- Alternative: Just show all pending tasks directly
SELECT 
  ti.title,
  ti.is_required,
  ti.is_critical,
  ti.sort_order,
  cr.status,
  CASE 
    WHEN ti.title ILIKE '%end%day%' OR ti.title ILIKE '%confirm%end%' 
    THEN 'EXCLUDED from can_end_day check'
    ELSE 'INCLUDED in can_end_day check'
  END as check_status
FROM checklist_results cr
JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
JOIN template_items ti ON ti.id = cr.template_item_id
WHERE ci.shift_session_id = 'YOUR_SESSION_ID_HERE' -- Replace this
  AND cr.status = 'pending'
ORDER BY ti.sort_order;
