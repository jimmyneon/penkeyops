-- Update get_coming_up_tasks to match new resolver sort_order logic
-- The old version sorts by priority first, but should follow sort_order like resolver

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
    ti.sort_order ASC,         -- Follow normal flow order
    ti.due_time ASC NULLS LAST -- Then by due time
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
