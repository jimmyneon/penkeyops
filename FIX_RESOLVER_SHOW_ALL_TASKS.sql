-- ============================================
-- FIX RESOLVER - Show ALL pending tasks
-- Tasks can be completed EARLY - don't hide them
-- ============================================

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
  task_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_time TIME := CURRENT_TIME;
BEGIN
  -- Return the first pending task, sorted by:
  -- 1. Critical tasks first
  -- 2. Priority (P1, P2, P3)
  -- 3. Sort order
  -- NO TIME FILTERING - tasks can be completed early!
  
  RETURN QUERY
  SELECT 
    'task'::TEXT as action_type,
    cr.id as task_id,
    ti.linked_group_id as group_id,
    ti.title,
    COALESCE(ti.instruction, ti.description) as instruction,
    ti.due_time,
    -- Mark as overdue if past due time (for visual warning)
    CASE 
      WHEN ti.due_time IS NOT NULL AND ti.due_time < v_current_time THEN true 
      ELSE false 
    END as is_overdue,
    -- Calculate overdue minutes (for logging)
    CASE 
      WHEN ti.due_time IS NOT NULL AND ti.due_time < v_current_time 
      THEN (EXTRACT(EPOCH FROM (v_current_time - ti.due_time)) / 60)::INTEGER
      ELSE NULL 
    END as overdue_minutes,
    ti.priority::TEXT,
    ti.is_critical,
    NULL::INTEGER as task_count
  FROM checklist_results cr
  JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
  JOIN template_items ti ON ti.id = cr.template_item_id
  WHERE ci.shift_session_id = p_session_id
    AND cr.status = 'pending'
  ORDER BY 
    -- Overdue critical tasks first
    CASE WHEN ti.due_time IS NOT NULL AND ti.due_time < v_current_time AND ti.is_critical THEN 0 ELSE 1 END,
    -- Then all critical tasks
    ti.is_critical DESC,
    -- Then by priority
    ti.priority ASC,
    -- Then by sort order
    ti.sort_order ASC
  LIMIT 1;
  
  RETURN;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION resolve_now_action(UUID) TO authenticated;

-- Test it - should show first task regardless of time
SELECT * FROM resolve_now_action('a977f875-85a1-4c82-8822-51c0fa9f972b');
