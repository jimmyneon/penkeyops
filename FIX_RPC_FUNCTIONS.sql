-- ============================================
-- FIX RPC FUNCTIONS - Add SECURITY DEFINER
-- Run this to make the resolver functions callable from the client
-- ============================================

-- Drop and recreate with SECURITY DEFINER
DROP FUNCTION IF EXISTS resolve_now_action(UUID);
DROP FUNCTION IF EXISTS get_coming_up_tasks(UUID, INTEGER);
DROP FUNCTION IF EXISTS get_group_tasks(UUID, TEXT);
DROP FUNCTION IF EXISTS get_current_phase(UUID);

-- ============================================
-- get_current_phase
-- ============================================
CREATE OR REPLACE FUNCTION get_current_phase(p_site_id UUID)
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_time TIME := CURRENT_TIME;
  v_phase TEXT;
BEGIN
  SELECT phase_name INTO v_phase
  FROM shift_phases
  WHERE site_id = p_site_id
    AND (
      (start_time <= end_time AND v_current_time >= start_time AND v_current_time < end_time)
      OR
      (start_time > end_time AND (v_current_time >= start_time OR v_current_time < end_time))
    )
  LIMIT 1;
  
  RETURN COALESCE(v_phase, 'trading');
END;
$$;

-- ============================================
-- resolve_now_action
-- ============================================
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
SECURITY DEFINER
AS $$
DECLARE
  v_current_time TIME := CURRENT_TIME;
BEGIN
  -- Priority 1: Overdue P1 CRITICAL tasks
  RETURN QUERY
  SELECT 
    'task'::TEXT as action_type,
    cr.id as task_id,
    NULL::TEXT as group_id,
    ti.title,
    COALESCE(ti.instruction, ti.description) as instruction,
    ti.due_time,
    true as is_overdue,
    EXTRACT(EPOCH FROM (v_current_time - ti.due_time))/60 as overdue_minutes,
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

  -- Priority 2: Due-soon P1 CRITICAL tasks
  RETURN QUERY
  SELECT 
    'task'::TEXT,
    cr.id,
    NULL::TEXT,
    ti.title,
    COALESCE(ti.instruction, ti.description),
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

  -- Priority 3: Linked groups
  RETURN QUERY
  SELECT 
    'group'::TEXT,
    NULL::UUID,
    ti.linked_group_id,
    COALESCE(tg.name, ti.linked_group_id) as title,
    COALESCE(tg.description, 'Complete these tasks') as instruction,
    MIN(ti.due_time) as due_time,
    bool_or(ti.due_time < v_current_time) as is_overdue,
    CASE WHEN bool_or(ti.due_time < v_current_time) 
      THEN EXTRACT(EPOCH FROM (v_current_time - MIN(ti.due_time)))/60 
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
    AND ti.is_required = true
  GROUP BY ti.linked_group_id, tg.name, tg.description
  ORDER BY 
    bool_or(ti.is_critical) DESC,
    MIN(ti.priority::TEXT) ASC,
    MIN(ti.due_time) ASC NULLS LAST
  LIMIT 1;

  IF FOUND THEN RETURN; END IF;

  -- Priority 4: Any required pending tasks
  RETURN QUERY
  SELECT 
    'task'::TEXT,
    cr.id,
    NULL::TEXT,
    ti.title,
    COALESCE(ti.instruction, ti.description),
    ti.due_time,
    CASE WHEN ti.due_time IS NOT NULL AND ti.due_time < v_current_time 
      THEN true ELSE false END as is_overdue,
    CASE WHEN ti.due_time IS NOT NULL AND ti.due_time < v_current_time 
      THEN EXTRACT(EPOCH FROM (v_current_time - ti.due_time))/60 
      ELSE NULL END as overdue_minutes,
    ti.priority::TEXT,
    ti.is_critical,
    NULL::INTEGER
  FROM checklist_results cr
  JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
  JOIN template_items ti ON ti.id = cr.template_item_id
  WHERE ci.shift_session_id = p_session_id
    AND cr.status = 'pending'
    AND ti.is_required = true
  ORDER BY 
    ti.is_critical DESC,
    ti.priority ASC,
    ti.due_time ASC NULLS LAST,
    ti.sort_order ASC
  LIMIT 1;

  RETURN;
END;
$$;

-- ============================================
-- get_coming_up_tasks
-- ============================================
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
AS $$
BEGIN
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
    AND ti.due_time IS NOT NULL
  ORDER BY 
    ti.due_time ASC,
    ti.priority ASC
  LIMIT p_limit;
END;
$$;

-- ============================================
-- get_group_tasks
-- ============================================
CREATE OR REPLACE FUNCTION get_group_tasks(p_session_id UUID, p_group_id TEXT)
RETURNS TABLE (
  task_id UUID,
  title TEXT,
  description TEXT,
  is_required BOOLEAN,
  is_critical BOOLEAN,
  priority TEXT,
  status TEXT,
  evidence_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cr.id,
    ti.title,
    ti.description,
    ti.is_required,
    ti.is_critical,
    ti.priority::TEXT,
    cr.status,
    ti.evidence_type::TEXT
  FROM checklist_results cr
  JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
  JOIN template_items ti ON ti.id = cr.template_item_id
  WHERE ci.shift_session_id = p_session_id
    AND ti.linked_group_id = p_group_id
  ORDER BY ti.sort_order ASC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION resolve_now_action(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_coming_up_tasks(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_group_tasks(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_phase(UUID) TO authenticated;

-- Verify functions exist
SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('resolve_now_action', 'get_coming_up_tasks', 'get_group_tasks', 'get_current_phase')
ORDER BY routine_name;
