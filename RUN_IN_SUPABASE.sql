-- Run this in Supabase SQL Editor to update the resolver with End Day system action

-- Drop and recreate the resolver function with End Day support
DROP FUNCTION IF EXISTS resolve_now_action(UUID);

CREATE OR REPLACE FUNCTION resolve_now_action(p_session_id UUID)
RETURNS TABLE (
  action_type TEXT,
  task_id UUID,
  group_id TEXT,
  title TEXT,
  instruction TEXT,
  due_time TIME,
  is_overdue BOOLEAN,
  overdue_minutes INTEGER,
  priority TEXT,
  is_critical BOOLEAN,
  task_count INTEGER,
  never_goes_red BOOLEAN
) AS $$
DECLARE
  v_current_time TIME := CURRENT_TIME;
  v_site_id UUID;
  v_session_started BOOLEAN;
BEGIN
  -- Get site and check if session started
  SELECT ss.site_id, ss.started_at IS NOT NULL INTO v_site_id, v_session_started
  FROM shift_sessions ss
  WHERE ss.id = p_session_id;
  
  -- SYSTEM ACTION: Start Opening (only if session not started)
  IF NOT v_session_started THEN
    RETURN QUERY
    SELECT 
      'start_opening'::TEXT as action_type,
      NULL::UUID as task_id,
      NULL::TEXT as group_id,
      'Start Opening'::TEXT as title,
      'Begin your shift and start opening procedures'::TEXT as instruction,
      NULL::TIME as due_time,
      false as is_overdue,
      NULL::INTEGER as overdue_minutes,
      'P1'::TEXT as priority,
      true as is_critical,
      NULL::INTEGER as task_count,
      false as never_goes_red;
    RETURN;
  END IF;

  -- SYSTEM ACTION: End Day (only if all required/critical tasks complete)
  IF can_end_day(p_session_id) THEN
    RETURN QUERY
    SELECT 
      'end_day'::TEXT as action_type,
      NULL::UUID as task_id,
      NULL::TEXT as group_id,
      'End Day'::TEXT as title,
      'Complete your shift and view performance summary'::TEXT as instruction,
      NULL::TIME as due_time,
      false as is_overdue,
      NULL::INTEGER as overdue_minutes,
      'P1'::TEXT as priority,
      true as is_critical,
      NULL::INTEGER as task_count,
      false as never_goes_red;
    RETURN;
  END IF;

  -- OVERDUE ORDERING: Priority bands + sort_order (STABLE)
  -- Band 1: Overdue P1 CRITICAL (excluding never_goes_red and End Day)
  RETURN QUERY
  SELECT 
    'task'::TEXT as action_type,
    cr.id as task_id,
    NULL::TEXT as group_id,
    ti.title,
    COALESCE(ti.instruction, ti.description) as instruction,
    ti.due_time,
    true as is_overdue,
    FLOOR(EXTRACT(EPOCH FROM (v_current_time - ti.due_time))/60)::INTEGER as overdue_minutes,
    ti.priority::TEXT,
    ti.is_critical,
    NULL::INTEGER as task_count,
    COALESCE(ti.never_goes_red, false) as never_goes_red
  FROM checklist_results cr
  JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
  JOIN template_items ti ON ti.id = cr.template_item_id
  WHERE ci.shift_session_id = p_session_id
    AND cr.status = 'pending'
    AND ti.is_critical = true
    AND ti.priority = 'P1'
    AND ti.due_time IS NOT NULL
    AND ti.due_time < v_current_time
    AND COALESCE(ti.never_goes_red, false) = false
    AND ti.title NOT ILIKE '%end%day%'
    AND ti.title NOT ILIKE '%confirm%end%'
  ORDER BY ti.sort_order ASC
  LIMIT 1;

  IF FOUND THEN RETURN; END IF;

  -- Band 2: Overdue P1 (excluding never_goes_red and End Day)
  RETURN QUERY
  SELECT 
    'task'::TEXT,
    cr.id,
    NULL::TEXT,
    ti.title,
    COALESCE(ti.instruction, ti.description),
    ti.due_time,
    true as is_overdue,
    FLOOR(EXTRACT(EPOCH FROM (v_current_time - ti.due_time))/60)::INTEGER,
    ti.priority::TEXT,
    ti.is_critical,
    NULL::INTEGER,
    COALESCE(ti.never_goes_red, false)
  FROM checklist_results cr
  JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
  JOIN template_items ti ON ti.id = cr.template_item_id
  WHERE ci.shift_session_id = p_session_id
    AND cr.status = 'pending'
    AND ti.priority = 'P1'
    AND ti.due_time IS NOT NULL
    AND ti.due_time < v_current_time
    AND COALESCE(ti.never_goes_red, false) = false
    AND ti.title NOT ILIKE '%end%day%'
    AND ti.title NOT ILIKE '%confirm%end%'
  ORDER BY ti.sort_order ASC
  LIMIT 1;

  IF FOUND THEN RETURN; END IF;

  -- Band 3: Overdue P2 (excluding never_goes_red and End Day)
  RETURN QUERY
  SELECT 
    'task'::TEXT,
    cr.id,
    NULL::TEXT,
    ti.title,
    COALESCE(ti.instruction, ti.description),
    ti.due_time,
    true as is_overdue,
    FLOOR(EXTRACT(EPOCH FROM (v_current_time - ti.due_time))/60)::INTEGER,
    ti.priority::TEXT,
    ti.is_critical,
    NULL::INTEGER,
    COALESCE(ti.never_goes_red, false)
  FROM checklist_results cr
  JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
  JOIN template_items ti ON ti.id = cr.template_item_id
  WHERE ci.shift_session_id = p_session_id
    AND cr.status = 'pending'
    AND ti.priority = 'P2'
    AND ti.due_time IS NOT NULL
    AND ti.due_time < v_current_time
    AND COALESCE(ti.never_goes_red, false) = false
    AND ti.title NOT ILIKE '%end%day%'
    AND ti.title NOT ILIKE '%confirm%end%'
  ORDER BY ti.sort_order ASC
  LIMIT 1;

  IF FOUND THEN RETURN; END IF;

  -- Band 4: Overdue P3 (excluding never_goes_red and End Day)
  RETURN QUERY
  SELECT 
    'task'::TEXT,
    cr.id,
    NULL::TEXT,
    ti.title,
    COALESCE(ti.instruction, ti.description),
    ti.due_time,
    true as is_overdue,
    FLOOR(EXTRACT(EPOCH FROM (v_current_time - ti.due_time))/60)::INTEGER,
    ti.priority::TEXT,
    ti.is_critical,
    NULL::INTEGER,
    COALESCE(ti.never_goes_red, false)
  FROM checklist_results cr
  JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
  JOIN template_items ti ON ti.id = cr.template_item_id
  WHERE ci.shift_session_id = p_session_id
    AND cr.status = 'pending'
    AND ti.priority = 'P3'
    AND ti.due_time IS NOT NULL
    AND ti.due_time < v_current_time
    AND COALESCE(ti.never_goes_red, false) = false
    AND ti.title NOT ILIKE '%end%day%'
    AND ti.title NOT ILIKE '%confirm%end%'
  ORDER BY ti.sort_order ASC
  LIMIT 1;

  IF FOUND THEN RETURN; END IF;

  -- Critical tasks (excluding End Day)
  RETURN QUERY
  SELECT 
    'task'::TEXT,
    cr.id,
    NULL::TEXT,
    ti.title,
    COALESCE(ti.instruction, ti.description),
    ti.due_time,
    CASE WHEN ti.due_time IS NOT NULL AND ti.due_time < v_current_time AND COALESCE(ti.never_goes_red, false) = false
      THEN true ELSE false END as is_overdue,
    CASE WHEN ti.due_time IS NOT NULL AND ti.due_time < v_current_time AND COALESCE(ti.never_goes_red, false) = false
      THEN FLOOR(EXTRACT(EPOCH FROM (v_current_time - ti.due_time))/60)::INTEGER
      ELSE NULL END as overdue_minutes,
    ti.priority::TEXT,
    ti.is_critical,
    NULL::INTEGER,
    COALESCE(ti.never_goes_red, false)
  FROM checklist_results cr
  JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
  JOIN template_items ti ON ti.id = cr.template_item_id
  WHERE ci.shift_session_id = p_session_id
    AND cr.status = 'pending'
    AND ti.is_critical = true
    AND ti.title NOT ILIKE '%end%day%'
    AND ti.title NOT ILIKE '%confirm%end%'
  ORDER BY 
    ti.priority ASC,
    ti.sort_order ASC
  LIMIT 1;

  IF FOUND THEN RETURN; END IF;

  -- Required tasks (excluding End Day)
  RETURN QUERY
  SELECT 
    'task'::TEXT,
    cr.id,
    NULL::TEXT,
    ti.title,
    COALESCE(ti.instruction, ti.description),
    ti.due_time,
    CASE WHEN ti.due_time IS NOT NULL AND ti.due_time < v_current_time AND COALESCE(ti.never_goes_red, false) = false
      THEN true ELSE false END as is_overdue,
    CASE WHEN ti.due_time IS NOT NULL AND ti.due_time < v_current_time AND COALESCE(ti.never_goes_red, false) = false
      THEN FLOOR(EXTRACT(EPOCH FROM (v_current_time - ti.due_time))/60)::INTEGER
      ELSE NULL END as overdue_minutes,
    ti.priority::TEXT,
    ti.is_critical,
    NULL::INTEGER,
    COALESCE(ti.never_goes_red, false)
  FROM checklist_results cr
  JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
  JOIN template_items ti ON ti.id = cr.template_item_id
  WHERE ci.shift_session_id = p_session_id
    AND cr.status = 'pending'
    AND ti.is_required = true
    AND ti.title NOT ILIKE '%end%day%'
    AND ti.title NOT ILIKE '%confirm%end%'
  ORDER BY 
    ti.is_critical DESC,
    ti.priority ASC,
    ti.sort_order ASC
  LIMIT 1;

  IF FOUND THEN RETURN; END IF;

  -- Normal flow - any remaining pending tasks (excluding End Day)
  RETURN QUERY
  SELECT 
    'task'::TEXT,
    cr.id,
    NULL::TEXT,
    ti.title,
    COALESCE(ti.instruction, ti.description),
    ti.due_time,
    false as is_overdue,
    NULL::INTEGER,
    ti.priority::TEXT,
    ti.is_critical,
    NULL::INTEGER,
    COALESCE(ti.never_goes_red, false)
  FROM checklist_results cr
  JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
  JOIN template_items ti ON ti.id = cr.template_item_id
  WHERE ci.shift_session_id = p_session_id
    AND cr.status = 'pending'
    AND ti.title NOT ILIKE '%end%day%'
    AND ti.title NOT ILIKE '%confirm%end%'
  ORDER BY 
    ti.priority ASC,
    ti.sort_order ASC
  LIMIT 1;

  RETURN;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION resolve_now_action IS 'Resolver with Start Opening and End Day as system actions, all other End Day tasks excluded from flow';
