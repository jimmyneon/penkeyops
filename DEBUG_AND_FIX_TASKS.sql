-- ============================================
-- DEBUG AND FIX MISSING TASKS
-- Check what exists and recreate checklist instances if needed
-- ============================================

-- Step 1: Check today's shift session
SELECT 
  'Shift Session' as item,
  id,
  started_at,
  is_complete,
  site_id
FROM shift_sessions
WHERE started_at::DATE = CURRENT_DATE;

-- Step 2: Check checklist instances for today
SELECT 
  'Checklist Instances' as item,
  ci.id,
  ci.template_id,
  t.name as template_name,
  ci.shift_session_id
FROM checklist_instances ci
JOIN templates t ON t.id = ci.template_id
WHERE ci.shift_session_id IN (
  SELECT id FROM shift_sessions WHERE started_at::DATE = CURRENT_DATE
);

-- Step 3: Check checklist results (should be empty after reset)
SELECT 
  'Checklist Results' as item,
  COUNT(*) as count
FROM checklist_results cr
WHERE cr.checklist_instance_id IN (
  SELECT ci.id 
  FROM checklist_instances ci
  WHERE ci.shift_session_id IN (
    SELECT id FROM shift_sessions WHERE started_at::DATE = CURRENT_DATE
  )
);

-- Step 4: Check template items
SELECT 
  'Template Items' as item,
  ti.id,
  ti.title,
  ti.task_type,
  ti.sort_order,
  ti.priority,
  t.name as template_name
FROM template_items ti
JOIN templates t ON t.id = ti.template_id
WHERE t.site_id = (
  SELECT site_id FROM shift_sessions WHERE started_at::DATE = CURRENT_DATE LIMIT 1
)
ORDER BY t.name, ti.sort_order;

-- ============================================
-- FIX: Recreate checklist results if instances exist but results are missing
-- ============================================

-- This will create pending checklist_results for all template_items
-- that don't already have results for today's session
INSERT INTO checklist_results (
  checklist_instance_id,
  template_item_id,
  status,
  created_at
)
SELECT 
  ci.id as checklist_instance_id,
  ti.id as template_item_id,
  'pending' as status,
  NOW() as created_at
FROM checklist_instances ci
JOIN templates t ON t.id = ci.template_id
JOIN template_items ti ON ti.template_id = t.id
WHERE ci.shift_session_id IN (
  SELECT id FROM shift_sessions WHERE started_at::DATE = CURRENT_DATE
)
AND NOT EXISTS (
  -- Don't create duplicates
  SELECT 1 FROM checklist_results cr
  WHERE cr.checklist_instance_id = ci.id
    AND cr.template_item_id = ti.id
);

-- Verify results were created
SELECT 
  'Created Results' as item,
  COUNT(*) as count
FROM checklist_results cr
WHERE cr.checklist_instance_id IN (
  SELECT ci.id 
  FROM checklist_instances ci
  WHERE ci.shift_session_id IN (
    SELECT id FROM shift_sessions WHERE started_at::DATE = CURRENT_DATE
  )
);
