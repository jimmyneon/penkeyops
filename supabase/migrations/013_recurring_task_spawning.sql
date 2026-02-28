-- ============================================
-- RECURRING TASK SPAWNING SYSTEM
-- Automatically creates new instances of recurring tasks based on interval
-- ============================================

-- Function to spawn recurring task instances for a shift session
CREATE OR REPLACE FUNCTION spawn_recurring_tasks(p_session_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_spawned_count INTEGER := 0;
  v_current_time TIME := CURRENT_TIME;
  v_recurring_item RECORD;
  v_last_spawn_time TIMESTAMPTZ;
  v_spawn_count INTEGER;
  v_next_spawn_time TIME;
BEGIN
  -- Loop through all recurring template items for this session's templates
  FOR v_recurring_item IN
    SELECT DISTINCT
      ti.id as template_item_id,
      ti.title,
      ti.interval_minutes,
      ti.active_window_start,
      ti.active_window_end,
      ti.max_occurrences,
      ti.never_goes_red,
      ti.no_notifications,
      ti.priority,
      ti.is_critical,
      ti.is_required,
      ti.evidence_type,
      ti.description,
      ti.instruction,
      ci.id as checklist_instance_id
    FROM template_items ti
    JOIN templates t ON t.id = ti.template_id
    JOIN checklist_instances ci ON ci.template_id = t.id
    WHERE ci.shift_session_id = p_session_id
      AND ti.task_type = 'recurring'
      AND ti.interval_minutes IS NOT NULL
      AND ti.active_window_start IS NOT NULL
      AND ti.active_window_end IS NOT NULL
  LOOP
    -- Check if we're within the active window
    IF v_current_time < v_recurring_item.active_window_start 
       OR v_current_time > v_recurring_item.active_window_end THEN
      CONTINUE;
    END IF;

    -- Get the last spawn time for this recurring item today
    SELECT MAX(created_at), COUNT(*)
    INTO v_last_spawn_time, v_spawn_count
    FROM checklist_results
    WHERE checklist_instance_id = v_recurring_item.checklist_instance_id
      AND template_item_id = v_recurring_item.template_item_id
      AND created_at::DATE = CURRENT_DATE;

    -- Check if max_occurrences limit reached
    IF v_recurring_item.max_occurrences IS NOT NULL 
       AND v_spawn_count >= v_recurring_item.max_occurrences THEN
      CONTINUE;
    END IF;

    -- Calculate next spawn time
    IF v_last_spawn_time IS NULL THEN
      -- First spawn of the day - create it
      v_next_spawn_time := v_recurring_item.active_window_start;
    ELSE
      -- Calculate next spawn based on interval
      v_next_spawn_time := (v_last_spawn_time + (v_recurring_item.interval_minutes || ' minutes')::INTERVAL)::TIME;
    END IF;

    -- Check if it's time to spawn a new instance
    IF v_current_time >= v_next_spawn_time THEN
      -- Create new checklist_result instance
      INSERT INTO checklist_results (
        checklist_instance_id,
        template_item_id,
        status,
        created_at
      ) VALUES (
        v_recurring_item.checklist_instance_id,
        v_recurring_item.template_item_id,
        'pending',
        NOW()
      );

      v_spawned_count := v_spawned_count + 1;
    END IF;
  END LOOP;

  RETURN v_spawned_count;
END;
$$ LANGUAGE plpgsql;

-- Function to be called periodically (e.g., every 5 minutes via cron)
CREATE OR REPLACE FUNCTION spawn_all_recurring_tasks()
RETURNS TABLE (
  session_id UUID,
  spawned_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ss.id,
    spawn_recurring_tasks(ss.id)
  FROM shift_sessions ss
  WHERE ss.is_complete = false
    AND ss.started_at::DATE = CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Drop existing functions to avoid return type conflicts
DROP FUNCTION IF EXISTS resolve_now_action(UUID);
DROP FUNCTION IF EXISTS get_coming_up_tasks(UUID, INTEGER);

-- Update resolver to respect never_goes_red flag
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
  v_current_phase TEXT;
  v_site_id UUID;
BEGIN
  -- Get site and phase
  SELECT ss.site_id INTO v_site_id
  FROM shift_sessions ss
  WHERE ss.id = p_session_id;
  
  v_current_phase := get_current_phase(v_site_id);

  -- Priority 1: Overdue P1 CRITICAL tasks (but NOT never_goes_red tasks)
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
    AND COALESCE(ti.never_goes_red, false) = false  -- Exclude rhythm tasks
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
    COALESCE(ti.instruction, ti.description),
    ti.due_time,
    false as is_overdue,
    NULL::INTEGER as overdue_minutes,
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
    bool_or(ti.due_time < v_current_time AND COALESCE(ti.never_goes_red, false) = false) as is_overdue,
    CASE WHEN bool_or(ti.due_time < v_current_time AND COALESCE(ti.never_goes_red, false) = false) 
      THEN FLOOR(EXTRACT(EPOCH FROM (v_current_time - MIN(ti.due_time)))/60)::INTEGER
      ELSE NULL 
    END as overdue_minutes,
    MIN(ti.priority::TEXT) as priority,
    bool_or(ti.is_critical) as is_critical,
    COUNT(*)::INTEGER as task_count,
    false as never_goes_red
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

  -- Priority 4: Current flow step REQUIRED tasks (by due time and priority)
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
  ORDER BY 
    ti.priority ASC,
    ti.sort_order ASC
  LIMIT 1;

  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Update get_coming_up_tasks to include never_goes_red flag
CREATE OR REPLACE FUNCTION get_coming_up_tasks(p_session_id UUID, p_limit INTEGER DEFAULT 4)
RETURNS TABLE (
  task_id UUID,
  title TEXT,
  due_time TIME,
  priority TEXT,
  is_critical BOOLEAN,
  never_goes_red BOOLEAN
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
    ti.is_critical,
    COALESCE(ti.never_goes_red, false)
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
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION spawn_recurring_tasks IS 'Spawns new instances of recurring tasks based on interval and active window';
COMMENT ON FUNCTION spawn_all_recurring_tasks IS 'Spawns recurring tasks for all active shift sessions - call via cron every 5 minutes';
COMMENT ON FUNCTION resolve_now_action IS 'Updated to respect never_goes_red flag - rhythm tasks never show as overdue';
COMMENT ON FUNCTION get_coming_up_tasks IS 'Updated to include never_goes_red flag for UI color coding';
