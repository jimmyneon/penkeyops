-- FINAL FIX - Delete ALL references to Start/End Day tasks (not just today's)
-- Then delete the template_items themselves

-- ============================================
-- STEP 1: Create can_end_day function
-- ============================================

DROP FUNCTION IF EXISTS resolve_now_action(UUID);
DROP FUNCTION IF EXISTS can_end_day(UUID);

CREATE OR REPLACE FUNCTION can_end_day(p_session_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_incomplete_required INTEGER;
  v_incomplete_critical INTEGER;
BEGIN
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
  
  RETURN (v_incomplete_required = 0 AND v_incomplete_critical = 0);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 2: Delete ALL checklist_results for Start/End Day tasks (ALL sessions, not just today)
-- ============================================

-- Delete checklist_results that reference Start Day tasks
DELETE FROM checklist_results
WHERE template_item_id IN (
  SELECT id FROM template_items
  WHERE title ILIKE '%start%shift%'
     OR title ILIKE '%start%day%'
     OR title ILIKE '%confirm%start%'
);

-- Delete checklist_results that reference End Day tasks (except the one we'll keep)
DELETE FROM checklist_results
WHERE template_item_id IN (
  SELECT id FROM template_items
  WHERE (title ILIKE '%end%day%' OR title ILIKE '%confirm%end%' OR title ILIKE '%end%shift%')
    AND id NOT IN (
      -- Keep results for the highest sort_order End Day task
      SELECT id FROM template_items
      WHERE title ILIKE '%end%day%' OR title ILIKE '%confirm%end%' OR title ILIKE '%end%shift%'
      ORDER BY sort_order DESC
      LIMIT 1
    )
);

-- ============================================
-- STEP 3: Delete today's session completely
-- ============================================

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

-- ============================================
-- STEP 4: NOW delete the template_items (no more FK violations)
-- ============================================

-- Delete Start Day/Shift tasks
DELETE FROM template_items
WHERE title ILIKE '%start%shift%'
   OR title ILIKE '%start%day%'
   OR title ILIKE '%confirm%start%';

-- Delete duplicate End Day tasks (keep only one)
DELETE FROM template_items
WHERE id IN (
  SELECT id FROM template_items
  WHERE (title ILIKE '%end%day%' OR title ILIKE '%confirm%end%' OR title ILIKE '%end%shift%')
    AND id NOT IN (
      SELECT id FROM template_items
      WHERE title ILIKE '%end%day%' OR title ILIKE '%confirm%end%' OR title ILIKE '%end%shift%'
      ORDER BY sort_order DESC
      LIMIT 1
    )
);

-- ============================================
-- STEP 5: Verify cleanup
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

-- DONE! Refresh your browser
