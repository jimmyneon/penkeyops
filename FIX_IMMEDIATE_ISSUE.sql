-- IMMEDIATE FIX: Get unstuck from "Almost There" screen
-- Run these queries in order

-- 1. First, check your current session
SELECT 
  id,
  shift_type,
  started_at,
  is_complete,
  completed_at
FROM shift_sessions
WHERE started_at::DATE = CURRENT_DATE
ORDER BY started_at DESC
LIMIT 1;

-- 2. Find all "End Day" tasks across all templates
SELECT 
  t.name as template_name,
  t.template_type,
  ti.title,
  ti.is_required,
  ti.is_critical,
  ti.sort_order,
  COUNT(cr.id) as instance_count
FROM template_items ti
JOIN templates t ON t.id = ti.template_id
LEFT JOIN checklist_results cr ON cr.template_item_id = ti.id
WHERE ti.title ILIKE '%end%day%' 
   OR ti.title ILIKE '%confirm%end%'
GROUP BY t.name, t.template_type, ti.title, ti.is_required, ti.is_critical, ti.sort_order
ORDER BY t.template_type, ti.sort_order;

-- 3. Check what's blocking can_end_day for YOUR session
-- Replace SESSION_ID with the ID from query 1
WITH session_tasks AS (
  SELECT 
    ti.title,
    ti.is_required,
    ti.is_critical,
    cr.status,
    t.template_type,
    CASE 
      WHEN ti.title ILIKE '%end%day%' OR ti.title ILIKE '%confirm%end%' 
      THEN true 
      ELSE false 
    END as is_end_day_task
  FROM checklist_results cr
  JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
  JOIN template_items ti ON ti.id = cr.template_item_id
  JOIN templates t ON t.id = ti.template_id
  WHERE ci.shift_session_id = 'YOUR_SESSION_ID_HERE' -- Replace this
    AND cr.status = 'pending'
)
SELECT 
  template_type,
  title,
  is_required,
  is_critical,
  is_end_day_task,
  CASE 
    WHEN is_end_day_task THEN 'EXCLUDED from can_end_day check'
    WHEN is_required OR is_critical THEN 'BLOCKING end of day'
    ELSE 'Not blocking'
  END as blocking_status
FROM session_tasks
ORDER BY 
  CASE WHEN is_required OR is_critical THEN 0 ELSE 1 END,
  template_type;

-- 4. TEMPORARY FIX: Mark non-closing End Day tasks as not required/critical
-- This allows you to end the shift without being blocked by duplicate End Day tasks
UPDATE template_items
SET 
  is_required = false,
  is_critical = false
WHERE (title ILIKE '%end%day%' OR title ILIKE '%confirm%end%')
  AND template_id IN (
    SELECT id FROM templates WHERE template_type != 'closing'
  );

-- 5. Verify the fix
SELECT 
  t.template_type,
  ti.title,
  ti.is_required,
  ti.is_critical
FROM template_items ti
JOIN templates t ON t.id = ti.template_id
WHERE ti.title ILIKE '%end%day%' OR ti.title ILIKE '%confirm%end%'
ORDER BY t.template_type;

-- 6. Now check if you can end the day
-- Replace SESSION_ID
SELECT can_end_day('YOUR_SESSION_ID_HERE');

-- If that returns TRUE, refresh your browser and you should see "Ready to End Day" button
