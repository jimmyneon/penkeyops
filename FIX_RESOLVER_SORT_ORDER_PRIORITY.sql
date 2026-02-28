-- Fix resolver to use sort_order as primary driver, priority only for tie-breaking
-- Based on user specification: order_index drives normal flow, priority only for time conflicts

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
) AS $$
DECLARE
  v_current_time TIME := CURRENT_TIME;
  v_site_id UUID;
BEGIN
  -- Get site ID
  SELECT ss.site_id INTO v_site_id
  FROM shift_sessions ss
  WHERE ss.id = p_session_id;

  -- Step A: Check for ANY overdue tasks
  -- If multiple overdue, use priority as tie-breaker, then sort_order
  RETURN QUERY
  SELECT 
    'task'::TEXT as action_type,
    cr.id as task_id,
    NULL::TEXT as group_id,
    ti.title,
    COALESCE(ti.instruction, ti.description) as instruction,
    ti.due_time,
    true as is_overdue,
    (EXTRACT(EPOCH FROM (v_current_time - ti.due_time))/60)::INTEGER as overdue_minutes,
    ti.priority::TEXT,
    ti.is_critical,
    NULL::INTEGER as task_count
  FROM checklist_results cr
  JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
  JOIN template_items ti ON ti.id = cr.template_item_id
  WHERE ci.shift_session_id = p_session_id
    AND cr.status = 'pending'
    AND ti.due_time IS NOT NULL
    AND ti.due_time < v_current_time
  ORDER BY 
    ti.priority ASC,           -- P1 > P2 > P3 when overdue
    ti.sort_order ASC          -- Then by order_index
  LIMIT 1;

  IF FOUND THEN RETURN; END IF;

  -- Step B: Check for linked groups (if any are overdue or due soon)
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
      THEN (EXTRACT(EPOCH FROM (v_current_time - MIN(ti.due_time)))/60)::INTEGER
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
  HAVING bool_or(ti.due_time < v_current_time) = true  -- Only if group has overdue tasks
  ORDER BY 
    MIN(ti.priority::TEXT) ASC,
    MIN(ti.sort_order) ASC
  LIMIT 1;

  IF FOUND THEN RETURN; END IF;

  -- Step C: Normal flow - use sort_order as primary driver
  -- This is the 95% case - just follow the list in order
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
    NULL::INTEGER
  FROM checklist_results cr
  JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
  JOIN template_items ti ON ti.id = cr.template_item_id
  WHERE ci.shift_session_id = p_session_id
    AND cr.status = 'pending'
  ORDER BY 
    ti.sort_order ASC,         -- Primary: follow the order_index
    ti.due_time ASC NULLS LAST -- Secondary: if same sort_order, use due time
  LIMIT 1;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
