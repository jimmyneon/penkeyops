-- ============================================
-- QUICK FIX - Test and fix resolver immediately
-- ============================================

-- 1. Test the resolver function directly
SELECT * FROM resolve_now_action('a977f875-85a1-4c82-8822-51c0fa9f972b');

-- If above returns nothing, the issue is in the SQL function logic
-- Let's check what tasks exist and should be returned:

SELECT 
  'Should find this task:' as debug,
  cr.id as task_id,
  ti.title,
  ti.due_time,
  CURRENT_TIME as current_time,
  ti.priority,
  ti.is_critical,
  ti.is_required,
  ti.linked_group_id,
  CASE 
    WHEN ti.due_time IS NOT NULL AND ti.due_time < CURRENT_TIME THEN 'OVERDUE'
    WHEN ti.due_time IS NOT NULL AND ti.due_time >= CURRENT_TIME THEN 'DUE SOON'
    ELSE 'NO DUE TIME'
  END as status
FROM checklist_results cr
JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
JOIN template_items ti ON ti.id = cr.template_item_id
WHERE ci.shift_session_id = 'a977f875-85a1-4c82-8822-51c0fa9f972b'
  AND cr.status = 'pending'
ORDER BY 
  ti.is_critical DESC,
  ti.priority ASC,
  ti.sort_order ASC
LIMIT 5;

-- If tasks exist but resolver returns nothing, the problem is:
-- 1. The RETURN QUERY logic isn't matching any tasks
-- 2. The function exits early with IF FOUND checks

-- Let's simplify the resolver to ALWAYS return the first pending task:
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
  -- Just return the first pending task, sorted by priority
  RETURN QUERY
  SELECT 
    'task'::TEXT as action_type,
    cr.id as task_id,
    ti.linked_group_id as group_id,
    ti.title,
    COALESCE(ti.instruction, ti.description) as instruction,
    ti.due_time,
    CASE 
      WHEN ti.due_time IS NOT NULL AND ti.due_time < v_current_time THEN true 
      ELSE false 
    END as is_overdue,
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
    ti.is_critical DESC,
    ti.priority ASC,
    ti.sort_order ASC
  LIMIT 1;
  
  RETURN;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION resolve_now_action(UUID) TO authenticated;

-- Test again
SELECT * FROM resolve_now_action('a977f875-85a1-4c82-8822-51c0fa9f972b');
