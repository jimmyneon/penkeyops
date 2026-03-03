-- RUN THIS IN SUPABASE SQL EDITOR - IN ORDER
-- This will fix the duplicate Start/End Day tasks and consolidate templates

-- ============================================
-- STEP 1: Run Migration 015 (creates can_end_day function)
-- ============================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS resolve_now_action(UUID);
DROP FUNCTION IF EXISTS can_end_day(UUID);

-- Create can_end_day function
CREATE OR REPLACE FUNCTION can_end_day(p_session_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_incomplete_required INTEGER;
  v_incomplete_critical INTEGER;
BEGIN
  -- Count incomplete required tasks (excluding End Day itself)
  SELECT COUNT(*) INTO v_incomplete_required
  FROM checklist_results cr
  JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
  JOIN template_items ti ON ti.id = cr.template_item_id
  WHERE ci.shift_session_id = p_session_id
    AND cr.status = 'pending'
    AND ti.is_required = true
    AND ti.title NOT ILIKE '%end%day%'
    AND ti.title NOT ILIKE '%confirm%end%'
    AND ti.title NOT ILIKE '%start%shift%'
    AND ti.title NOT ILIKE '%start%day%';
  
  -- Count incomplete critical tasks (excluding End Day itself)
  SELECT COUNT(*) INTO v_incomplete_critical
  FROM checklist_results cr
  JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
  JOIN template_items ti ON ti.id = cr.template_item_id
  WHERE ci.shift_session_id = p_session_id
    AND cr.status = 'pending'
    AND ti.is_critical = true
    AND ti.title NOT ILIKE '%end%day%'
    AND ti.title NOT ILIKE '%confirm%end%'
    AND ti.title NOT ILIKE '%start%shift%'
    AND ti.title NOT ILIKE '%start%day%';
  
  -- Can end day if no incomplete required or critical tasks
  RETURN (v_incomplete_required = 0 AND v_incomplete_critical = 0);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 2: Delete today's session (start fresh)
-- ============================================

-- Delete checklist results
DELETE FROM checklist_results
WHERE checklist_instance_id IN (
  SELECT ci.id
  FROM checklist_instances ci
  JOIN shift_sessions ss ON ss.id = ci.shift_session_id
  WHERE ss.started_at::DATE = CURRENT_DATE
);

-- Delete checklist instances
DELETE FROM checklist_instances
WHERE shift_session_id IN (
  SELECT id
  FROM shift_sessions
  WHERE started_at::DATE = CURRENT_DATE
);

-- Delete shift sessions
DELETE FROM shift_sessions
WHERE started_at::DATE = CURRENT_DATE;

-- ============================================
-- STEP 3: Remove duplicate Start/End Day tasks from templates
-- ============================================

-- Find all Start Day / Start Shift tasks
SELECT 
  t.name as template_name,
  t.template_type,
  ti.title,
  ti.id
FROM template_items ti
JOIN templates t ON t.id = ti.template_id
WHERE ti.title ILIKE '%start%shift%'
   OR ti.title ILIKE '%start%day%'
   OR ti.title ILIKE '%confirm%start%'
ORDER BY t.template_type, ti.title;

-- Delete Start Day/Shift tasks (these are system actions, not tasks)
DELETE FROM template_items
WHERE title ILIKE '%start%shift%'
   OR title ILIKE '%start%day%'
   OR title ILIKE '%confirm%start%';

-- Find all End Day tasks
SELECT 
  t.name as template_name,
  t.template_type,
  ti.title,
  ti.id
FROM template_items ti
JOIN templates t ON t.id = ti.template_id
WHERE ti.title ILIKE '%end%day%'
   OR ti.title ILIKE '%confirm%end%'
   OR ti.title ILIKE '%end%shift%'
ORDER BY t.template_type, ti.title;

-- Keep only ONE End Day task (the one with highest sort_order)
-- Delete all others
DELETE FROM template_items
WHERE id IN (
  SELECT ti.id
  FROM template_items ti
  JOIN templates t ON t.id = ti.template_id
  WHERE (ti.title ILIKE '%end%day%' OR ti.title ILIKE '%confirm%end%' OR ti.title ILIKE '%end%shift%')
    AND ti.id NOT IN (
      -- Keep the one with highest sort_order (should be last)
      SELECT id
      FROM template_items
      WHERE title ILIKE '%end%day%' OR title ILIKE '%confirm%end%' OR title ILIKE '%end%shift%'
      ORDER BY sort_order DESC
      LIMIT 1
    )
);

-- ============================================
-- STEP 4: Verify cleanup
-- ============================================

-- Should show only ONE End Day task, NO Start Day tasks
SELECT 
  t.name as template_name,
  t.template_type,
  ti.title,
  ti.sort_order,
  ti.is_required,
  ti.is_critical
FROM template_items ti
JOIN templates t ON t.id = ti.template_id
WHERE ti.title ILIKE '%end%day%'
   OR ti.title ILIKE '%start%day%'
   OR ti.title ILIKE '%confirm%end%'
   OR ti.title ILIKE '%confirm%start%'
   OR ti.title ILIKE '%start%shift%'
   OR ti.title ILIKE '%end%shift%'
ORDER BY t.template_type, ti.sort_order;

-- ============================================
-- DONE! Now refresh your browser
-- ============================================
-- The system will create a new session
-- Start Day will be a system action (not a task)
-- End Day will only appear when all required/critical tasks are complete
