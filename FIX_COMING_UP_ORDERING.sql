-- Fix Coming Up to use same priority ordering as resolver
-- This ensures Coming Up shows what will actually come next

CREATE OR REPLACE FUNCTION get_coming_up_tasks(p_session_id UUID, p_limit INTEGER DEFAULT 4)
RETURNS TABLE (
  task_id UUID,
  title TEXT,
  due_time TIME,
  priority TEXT,
  is_critical BOOLEAN
) AS $$
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
    -- Match resolver priority logic exactly
    ti.is_critical DESC,
    ti.priority ASC,
    ti.due_time ASC NULLS LAST,
    ti.sort_order ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
