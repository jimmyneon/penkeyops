-- ============================================
-- PHASE-BASED TASK FILTERING (Option C)
-- Mixed approach: template_type + due_time ranges + phase configuration
-- ============================================

-- Add phase mapping to shift_phases table for template filtering
ALTER TABLE shift_phases 
ADD COLUMN IF NOT EXISTS allowed_template_types TEXT[] DEFAULT '{}';

COMMENT ON COLUMN shift_phases.allowed_template_types IS 'Array of template types allowed in this phase (e.g., {opening, mid})';

-- Update existing phase data with template type mappings
-- This provides sensible defaults that admins can modify
DO $$
DECLARE
  v_site_id UUID;
BEGIN
  FOR v_site_id IN SELECT DISTINCT site_id FROM shift_phases LOOP
    -- Pre-open phase: only opening tasks
    UPDATE shift_phases 
    SET allowed_template_types = ARRAY['opening']
    WHERE site_id = v_site_id 
      AND phase_name = 'pre_open'
      AND allowed_template_types = '{}';
    
    -- Opening phase: opening and mid tasks
    UPDATE shift_phases 
    SET allowed_template_types = ARRAY['opening', 'mid']
    WHERE site_id = v_site_id 
      AND phase_name = 'opening'
      AND allowed_template_types = '{}';
    
    -- Trading/operational phase: mid tasks primarily
    UPDATE shift_phases 
    SET allowed_template_types = ARRAY['mid', 'safety']
    WHERE site_id = v_site_id 
      AND phase_name IN ('trading', 'operational')
      AND allowed_template_types = '{}';
    
    -- Peak phase: mid and closing prep
    UPDATE shift_phases 
    SET allowed_template_types = ARRAY['mid', 'closing']
    WHERE site_id = v_site_id 
      AND phase_name = 'peak'
      AND allowed_template_types = '{}';
    
    -- Closing phase: closing tasks
    UPDATE shift_phases 
    SET allowed_template_types = ARRAY['closing']
    WHERE site_id = v_site_id 
      AND phase_name = 'closing'
      AND allowed_template_types = '{}';
    
    -- Closed phase: only critical closing tasks
    UPDATE shift_phases 
    SET allowed_template_types = ARRAY['closing']
    WHERE site_id = v_site_id 
      AND phase_name = 'closed'
      AND allowed_template_types = '{}';
  END LOOP;
END $$;

-- ============================================
-- Updated resolver with phase-based filtering
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
) AS $$
DECLARE
  v_current_time TIME := CURRENT_TIME;
  v_current_phase TEXT;
  v_site_id UUID;
  v_allowed_types TEXT[];
BEGIN
  -- Get site and phase
  SELECT ss.site_id INTO v_site_id
  FROM shift_sessions ss
  WHERE ss.id = p_session_id;
  
  v_current_phase := get_current_phase(v_site_id);
  
  -- Get allowed template types for current phase
  SELECT allowed_template_types INTO v_allowed_types
  FROM shift_phases
  WHERE site_id = v_site_id
    AND phase_name = v_current_phase;
  
  -- If no phase config, allow all types (fallback)
  IF v_allowed_types IS NULL OR array_length(v_allowed_types, 1) IS NULL THEN
    v_allowed_types := ARRAY['opening', 'mid', 'closing', 'safety', 'cleaning'];
  END IF;

  -- Priority 1: Overdue P1 CRITICAL tasks (ALWAYS show regardless of phase)
  RETURN QUERY
  SELECT 
    'task'::TEXT as action_type,
    cr.id as task_id,
    NULL::TEXT as group_id,
    ti.title,
    COALESCE(ti.instruction, ti.description) as instruction,
    ti.due_time,
    true as is_overdue,
    CAST(EXTRACT(EPOCH FROM (v_current_time - ti.due_time))/60 AS INTEGER) as overdue_minutes,
    ti.priority::TEXT,
    ti.is_critical,
    NULL::INTEGER as task_count
  FROM checklist_results cr
  JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
  JOIN template_items ti ON ti.id = cr.template_item_id
  JOIN templates t ON t.id = ti.template_id
  WHERE ci.shift_session_id = p_session_id
    AND cr.status = 'pending'
    AND ti.is_critical = true
    AND ti.priority = 'P1'
    AND ti.due_time IS NOT NULL
    AND ti.due_time < v_current_time
  ORDER BY ti.due_time ASC
  LIMIT 1;

  IF FOUND THEN RETURN; END IF;

  -- Priority 2: Due-soon P1 CRITICAL tasks (within 15 minutes, ALWAYS show)
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
  JOIN templates t ON t.id = ti.template_id
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

  -- Priority 3: Linked groups with pending required tasks (phase-filtered)
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
      THEN CAST(EXTRACT(EPOCH FROM (v_current_time - MIN(ti.due_time)))/60 AS INTEGER)
      ELSE NULL 
    END as overdue_minutes,
    MIN(ti.priority::TEXT) as priority,
    bool_or(ti.is_critical) as is_critical,
    COUNT(*)::INTEGER as task_count
  FROM checklist_results cr
  JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
  JOIN template_items ti ON ti.id = cr.template_item_id
  JOIN templates t ON t.id = ti.template_id
  LEFT JOIN task_groups tg ON tg.id = ti.linked_group_id
  WHERE ci.shift_session_id = p_session_id
    AND cr.status = 'pending'
    AND ti.linked_group_id IS NOT NULL
    AND ti.is_required = true
    AND t.template_type = ANY(v_allowed_types)
  GROUP BY ti.linked_group_id, tg.name, tg.description
  ORDER BY 
    bool_or(ti.is_critical) DESC,
    MIN(ti.priority::TEXT) ASC,
    MIN(ti.due_time) ASC NULLS LAST
  LIMIT 1;

  IF FOUND THEN RETURN; END IF;

  -- Priority 4: Required tasks by priority + due_time (phase-filtered)
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
      THEN CAST(EXTRACT(EPOCH FROM (v_current_time - ti.due_time))/60 AS INTEGER)
      ELSE NULL END as overdue_minutes,
    ti.priority::TEXT,
    ti.is_critical,
    NULL::INTEGER
  FROM checklist_results cr
  JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
  JOIN template_items ti ON ti.id = cr.template_item_id
  JOIN templates t ON t.id = ti.template_id
  WHERE ci.shift_session_id = p_session_id
    AND cr.status = 'pending'
    AND ti.is_required = true
    AND t.template_type = ANY(v_allowed_types)
  ORDER BY 
    ti.is_critical DESC,
    ti.priority ASC,
    ti.due_time ASC NULLS LAST,
    ti.sort_order ASC
  LIMIT 1;

  IF FOUND THEN RETURN; END IF;

  -- Priority 5: Any remaining pending tasks (phase-filtered)
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
  JOIN templates t ON t.id = ti.template_id
  WHERE ci.shift_session_id = p_session_id
    AND cr.status = 'pending'
    AND t.template_type = ANY(v_allowed_types)
  ORDER BY 
    ti.priority ASC,
    ti.sort_order ASC
  LIMIT 1;

  RETURN;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION resolve_now_action IS 'Core resolver with phase-based filtering: P1 CRITICAL tasks always show, others filtered by current phase + template type';
