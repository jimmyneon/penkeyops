-- Fix can_end_day to handle sessions with no tasks yet
-- This prevents End Day from appearing immediately on empty sessions

DROP FUNCTION IF EXISTS can_end_day(UUID);

CREATE OR REPLACE FUNCTION can_end_day(p_session_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_total_tasks INTEGER;
  v_incomplete_required INTEGER;
  v_incomplete_critical INTEGER;
BEGIN
  -- First, check if any tasks exist at all
  SELECT COUNT(*) INTO v_total_tasks
  FROM checklist_results cr
  JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
  WHERE ci.shift_session_id = p_session_id;
  
  -- If no tasks exist yet, cannot end day
  IF v_total_tasks = 0 THEN
    RETURN false;
  END IF;
  
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
    AND ti.title NOT ILIKE '%start%day%'
    AND ti.title NOT ILIKE '%start%shift%';
  
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
    AND ti.title NOT ILIKE '%start%day%'
    AND ti.title NOT ILIKE '%start%shift%';
  
  -- Can end day if tasks exist AND no incomplete required or critical tasks
  RETURN (v_incomplete_required = 0 AND v_incomplete_critical = 0);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION can_end_day IS 'Checks if all required and critical tasks are complete. Returns false if no tasks exist yet.';

-- Now run RUN_IN_SUPABASE.sql to update the resolver
