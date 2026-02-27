-- ============================================
-- FIX COMING UP - Show all upcoming tasks
-- Don't hide tasks based on time
-- ============================================

DROP FUNCTION IF EXISTS get_coming_up_tasks(UUID, INTEGER);

CREATE OR REPLACE FUNCTION get_coming_up_tasks(
  p_session_id UUID,
  p_limit INTEGER DEFAULT 4
)
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
  -- Return next pending tasks (skip the first one which is NOW)
  -- NO TIME FILTERING - show all upcoming tasks
  
  RETURN QUERY
  SELECT 
    cr.id as task_id,
    ti.title,
    ti.due_time,
    ti.priority::TEXT,
    ti.is_critical
  FROM checklist_results cr
  JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
  JOIN template_items ti ON ti.id = cr.template_item_id
  WHERE ci.shift_session_id = p_session_id
    AND cr.status = 'pending'
  ORDER BY 
    ti.is_critical DESC,
    ti.priority ASC,
    ti.sort_order ASC
  OFFSET 1  -- Skip the first task (that's the NOW task)
  LIMIT p_limit;
  
  RETURN;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_coming_up_tasks(UUID, INTEGER) TO authenticated;

-- Test it
SELECT * FROM get_coming_up_tasks('a977f875-85a1-4c82-8822-51c0fa9f972b', 4);
