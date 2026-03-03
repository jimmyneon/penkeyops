-- Consolidate multiple templates into single daily operations template
-- This removes the artificial opening/mid/closing split that causes premature shift endings

-- Step 1: Create new consolidated template for each site
DO $$
DECLARE
  v_site RECORD;
  v_new_template_id UUID;
  v_admin_id UUID;
BEGIN
  -- Get first admin user for created_by
  SELECT id INTO v_admin_id FROM users WHERE role = 'admin' LIMIT 1;
  
  -- For each site, consolidate templates
  FOR v_site IN SELECT DISTINCT site_id FROM templates WHERE is_active = true LOOP
    
    -- Create new consolidated template
    INSERT INTO templates (
      site_id,
      name,
      description,
      template_type,
      is_active,
      created_by
    ) VALUES (
      v_site.site_id,
      'Daily Operations',
      'Complete daily task list from opening to closing',
      'daily',  -- New type
      true,
      COALESCE(v_admin_id, (SELECT id FROM users LIMIT 1))
    )
    RETURNING id INTO v_new_template_id;
    
    -- Copy all template items from opening, mid, and closing templates
    -- Reorder them by due_time and original sort_order
    INSERT INTO template_items (
      template_id,
      title,
      description,
      priority,
      is_critical,
      due_time,
      grace_period_minutes,
      evidence_type,
      depends_on,
      sort_order,
      metadata,
      instruction,
      is_required,
      linked_group_id,
      task_type,
      interval_minutes,
      active_window_start,
      active_window_end,
      max_occurrences,
      never_goes_red,
      no_notifications
    )
    SELECT 
      v_new_template_id,  -- New template
      ti.title,
      ti.description,
      ti.priority,
      ti.is_critical,
      ti.due_time,
      ti.grace_period_minutes,
      ti.evidence_type,
      NULL,  -- Reset depends_on (will need manual fixing if used)
      ROW_NUMBER() OVER (ORDER BY 
        COALESCE(ti.due_time, '23:59:59'::TIME),  -- Tasks with due_time first
        t.template_type,  -- Then by template type (opening, mid, closing)
        ti.sort_order  -- Then original order
      ) as new_sort_order,
      ti.metadata,
      ti.instruction,
      ti.is_required,
      ti.linked_group_id,
      ti.task_type,
      ti.interval_minutes,
      ti.active_window_start,
      ti.active_window_end,
      ti.max_occurrences,
      ti.never_goes_red,
      ti.no_notifications
    FROM template_items ti
    JOIN templates t ON t.id = ti.template_id
    WHERE t.site_id = v_site.site_id
      AND t.is_active = true
      AND t.template_type IN ('opening', 'mid', 'closing')
      -- Exclude duplicate "End Day" tasks - keep only one
      AND NOT (
        (ti.title ILIKE '%end%day%' OR ti.title ILIKE '%confirm%end%')
        AND t.template_type != 'closing'
      )
    ORDER BY 
      COALESCE(ti.due_time, '23:59:59'::TIME),
      t.template_type,
      ti.sort_order;
    
    -- Deactivate old templates
    UPDATE templates
    SET is_active = false
    WHERE site_id = v_site.site_id
      AND template_type IN ('opening', 'mid', 'closing')
      AND id != v_new_template_id;
    
    RAISE NOTICE 'Created consolidated template for site: %', v_site.site_id;
  END LOOP;
END $$;

-- Step 2: Update shift_sessions to use 'daily' shift_type
UPDATE shift_sessions
SET shift_type = 'daily'
WHERE shift_type IN ('opening', 'mid', 'closing');

-- Step 3: Update resolver to remove template_type filtering
-- Drop and recreate resolve_now_action without template_type checks
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
      'Start Day'::TEXT as title,
      'Begin your shift and start daily operations'::TEXT as instruction,
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

  -- Band 3: Overdue P2
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

  -- Band 4: Overdue P3
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

  -- Due-soon P1 CRITICAL tasks (within 15 minutes)
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
    AND ti.title NOT ILIKE '%end%day%'
    AND ti.title NOT ILIKE '%confirm%end%'
  ORDER BY ti.due_time ASC, ti.sort_order ASC
  LIMIT 1;

  IF FOUND THEN RETURN; END IF;

  -- Linked groups
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
    AND ti.title NOT ILIKE '%end%day%'
    AND ti.title NOT ILIKE '%confirm%end%'
  GROUP BY ti.linked_group_id, tg.name, tg.description
  ORDER BY 
    bool_or(ti.is_critical) DESC,
    MIN(ti.priority::TEXT) ASC,
    MIN(ti.sort_order) ASC
  LIMIT 1;

  IF FOUND THEN RETURN; END IF;

  -- Required tasks
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

  -- Normal flow - any remaining pending tasks
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

COMMENT ON FUNCTION resolve_now_action IS 'Consolidated resolver - no template_type filtering, single daily template flow';
