-- Fix resolver function to run with elevated permissions
-- This allows the function to return data even when called from the frontend

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
  task_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER  -- This is the key change - run with function owner's permissions
SET search_path = public
AS $$
DECLARE
  v_current_time TIME := CURRENT_TIME;
  v_current_phase TEXT;
  v_site_id UUID;
BEGIN
  -- Get site and phase
  SELECT ss.site_id INTO v_site_id
  FROM shift_sessions ss
  WHERE ss.id = p_session_id;
  
  v_current_phase := get_current_phase(v_site_id);

  -- Priority 1: Overdue P1 CRITICAL tasks
  RETURN QUERY
  SELECT 
    'task'::TEXT as action_type,
    cr.id as task_id,
    NULL::TEXT as group_id,
    ti.title,
    COALESCE(ti.description, ti.title) as instruction,
    ti.due_time,
    true as is_overdue,
    ROUND(EXTRACT(EPOCH FROM (v_current_time - ti.due_time))/60)::INTEGER as overdue_minutes,
    ti.priority::TEXT,
    ti.is_critical,
    NULL::INTEGER as task_count
  FROM checklist_results cr
  JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
  JOIN template_items ti ON ti.id = cr.template_item_id
  WHERE ci.shift_session_id = p_session_id
    AND cr.status = 'pending'
    AND ti.is_critical = true
    AND ti.priority = 'P1'
    AND ti.due_time IS NOT NULL
    AND ti.due_time < v_current_time
  ORDER BY ti.due_time ASC
  LIMIT 1;

  IF FOUND THEN RETURN; END IF;

  -- Priority 2: Due-soon P1 CRITICAL tasks (within 15 minutes)
  RETURN QUERY
  SELECT 
    'task'::TEXT,
    cr.id,
    NULL::TEXT,
    ti.title,
    COALESCE(ti.description, ti.title),
    ti.due_time,
    false as is_overdue,
    NULL::INTEGER as overdue_minutes,
    ti.priority::TEXT,
    ti.is_critical,
    NULL::INTEGER
  FROM checklist_results cr
  JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
  JOIN template_items ti ON ti.id = cr.template_item_id
  WHERE ci.shift_session_id = p_session_id
    AND cr.status = 'pending'
    AND ti.is_critical = true
    AND ti.priority = 'P1'
    AND ti.due_time IS NOT NULL
    AND ti.due_time >= v_current_time
    AND ti.due_time <= v_current_time + INTERVAL '15 minutes'
  ORDER BY ti.due_time ASC
  LIMIT 1;

  IF FOUND THEN RETURN; END IF;

  -- Priority 3: Check for linked groups with pending required tasks
  RETURN QUERY
  SELECT 
    'group'::TEXT,
    NULL::UUID,
    ti.linked_group_id,
    tg.name as title,
    tg.description as instruction,
    MIN(ti.due_time) as due_time,
    bool_or(ti.due_time < v_current_time) as is_overdue,
    CASE WHEN bool_or(ti.due_time < v_current_time) 
      THEN ROUND(EXTRACT(EPOCH FROM (v_current_time - MIN(ti.due_time)))/60)::INTEGER
      ELSE NULL 
    END as overdue_minutes,
    MIN(ti.priority::TEXT) as priority,
    bool_or(ti.is_critical) as is_critical,
    COUNT(*)::INTEGER as task_count
  FROM checklist_results cr
  JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
  JOIN template_items ti ON ti.id = cr.template_item_id
  LEFT JOIN task_groups tg ON tg.id = ti.linked_group_id
  WHERE ci.shift_session_id = p_session_id
    AND cr.status = 'pending'
    AND ti.linked_group_id IS NOT NULL
  GROUP BY ti.linked_group_id, tg.name, tg.description
  ORDER BY 
    bool_or(ti.is_critical) DESC,
    MIN(ti.priority::TEXT) ASC,
    MIN(ti.due_time) ASC NULLS LAST
  LIMIT 1;

  IF FOUND THEN RETURN; END IF;

  -- Priority 4: Current flow step tasks (by due time and priority)
  RETURN QUERY
  SELECT 
    'task'::TEXT,
    cr.id,
    NULL::TEXT,
    ti.title,
    COALESCE(ti.description, ti.title),
    ti.due_time,
    CASE WHEN ti.due_time IS NOT NULL AND ti.due_time < v_current_time 
      THEN true ELSE false END as is_overdue,
    CASE WHEN ti.due_time IS NOT NULL AND ti.due_time < v_current_time 
      THEN ROUND(EXTRACT(EPOCH FROM (v_current_time - ti.due_time))/60)::INTEGER
      ELSE NULL END as overdue_minutes,
    ti.priority::TEXT,
    ti.is_critical,
    NULL::INTEGER
  FROM checklist_results cr
  JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
  JOIN template_items ti ON ti.id = cr.template_item_id
  WHERE ci.shift_session_id = p_session_id
    AND cr.status = 'pending'
  ORDER BY 
    ti.is_critical DESC,
    ti.priority ASC,
    ti.due_time ASC NULLS LAST,
    ti.sort_order ASC
  LIMIT 1;

  IF FOUND THEN RETURN; END IF;

  -- Priority 5: Any remaining pending tasks
  RETURN QUERY
  SELECT 
    'task'::TEXT,
    cr.id,
    NULL::TEXT,
    ti.title,
    COALESCE(ti.description, ti.title),
    ti.due_time,
    false as is_overdue,
    NULL::INTEGER,
    ti.priority::TEXT,
    ti.is_critical,
    NULL::INTEGER
  FROM checklist_results cr
  JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
  JOIN template_items ti ON ti.id = cr.template_item_id
  WHERE ci.shift_session_id = p_session_id
    AND cr.status = 'pending'
  ORDER BY 
    ti.priority ASC,
    ti.sort_order ASC
  LIMIT 1;

  RETURN;
END;
$$;

-- Also fix get_coming_up_tasks
CREATE OR REPLACE FUNCTION get_coming_up_tasks(p_session_id UUID, p_limit INTEGER DEFAULT 4)
RETURNS TABLE (
  task_id UUID,
  title TEXT,
  due_time TIME,
  priority TEXT,
  is_critical BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_time TIME := CURRENT_TIME;
  v_now_task_id UUID;
BEGIN
  -- Get the current NOW task to exclude it
  SELECT resolve_now_action.task_id INTO v_now_task_id
  FROM resolve_now_action(p_session_id)
  WHERE action_type = 'task'
  LIMIT 1;

  RETURN QUERY
  SELECT
    cr.id,
    ti.title,
    ti.due_time,
    ti.priority::TEXT,
    ti.is_critical
  FROM checklist_results cr
  JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
  JOIN template_items ti ON ti.id = cr.template_item_id
  WHERE ci.shift_session_id = p_session_id
    AND cr.status = 'pending'
    AND cr.id != COALESCE(v_now_task_id, '00000000-0000-0000-0000-000000000000'::UUID)
  ORDER BY
    ti.is_critical DESC,
    ti.priority ASC,
    ti.due_time ASC NULLS LAST,
    ti.sort_order ASC
  LIMIT p_limit;
END;
$$;
