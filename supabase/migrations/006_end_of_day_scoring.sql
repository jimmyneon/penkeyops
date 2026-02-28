-- ============================================
-- END-OF-DAY SCORING SYSTEM
-- Simple deterministic scoring based on task completion timing
-- ============================================

-- Function to calculate shift score (0-100)
CREATE OR REPLACE FUNCTION calculate_shift_score(p_session_id UUID)
RETURNS TABLE (
  total_score INTEGER,
  green_count INTEGER,
  amber_count INTEGER,
  red_count INTEGER,
  total_tasks INTEGER,
  penalties JSONB
) AS $$
DECLARE
  v_score INTEGER := 100;
  v_green INTEGER := 0;
  v_amber INTEGER := 0;
  v_red INTEGER := 0;
  v_total INTEGER := 0;
  v_penalties JSONB := '[]'::JSONB;
  v_task RECORD;
  v_penalty INTEGER;
  v_status TEXT;
BEGIN
  -- Loop through all tasks with due times
  FOR v_task IN
    SELECT 
      cr.id,
      cr.status,
      cr.completed_at,
      ti.title,
      ti.priority,
      ti.is_critical,
      ti.due_time,
      ti.grace_period_minutes
    FROM checklist_results cr
    JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
    JOIN template_items ti ON ti.id = cr.template_item_id
    WHERE ci.shift_session_id = p_session_id
      AND ti.due_time IS NOT NULL
  LOOP
    v_total := v_total + 1;
    v_penalty := 0;
    v_status := 'green';

    -- Determine status and penalty
    IF v_task.status = 'blocked' THEN
      -- Blocked tasks get small penalty (encourages honest reporting)
      v_status := 'amber';
      v_amber := v_amber + 1;
      v_penalty := CASE 
        WHEN v_task.is_critical THEN 3
        WHEN v_task.priority = 'P1' THEN 3
        WHEN v_task.priority = 'P2' THEN 1
        ELSE 1
      END;
      
    ELSIF v_task.status != 'completed' THEN
      -- Not completed = Red
      v_status := 'red';
      v_red := v_red + 1;
      v_penalty := CASE 
        WHEN v_task.is_critical THEN 15
        WHEN v_task.priority = 'P1' THEN 15
        WHEN v_task.priority = 'P2' THEN 5
        ELSE 2
      END;
      
    ELSIF v_task.completed_at IS NOT NULL THEN
      -- Compare completion time to due time
      DECLARE
        v_completed_time TIME := v_task.completed_at::TIME;
        v_due_time TIME := v_task.due_time;
        v_grace_time TIME := v_task.due_time + (v_task.grace_period_minutes || ' minutes')::INTERVAL;
      BEGIN
        IF v_completed_time <= v_due_time THEN
          -- Green: On time
          v_status := 'green';
          v_green := v_green + 1;
          
        ELSIF v_completed_time <= v_grace_time THEN
          -- Amber: Within grace period
          v_status := 'amber';
          v_amber := v_amber + 1;
          v_penalty := CASE 
            WHEN v_task.is_critical THEN 5
            WHEN v_task.priority = 'P1' THEN 5
            WHEN v_task.priority = 'P2' THEN 2
            ELSE 1
          END;
          
        ELSE
          -- Red: Past grace period
          v_status := 'red';
          v_red := v_red + 1;
          v_penalty := CASE 
            WHEN v_task.is_critical THEN 15
            WHEN v_task.priority = 'P1' THEN 15
            WHEN v_task.priority = 'P2' THEN 5
            ELSE 2
          END;
        END IF;
      END;
    END IF;

    -- Apply penalty
    IF v_penalty > 0 THEN
      v_score := v_score - v_penalty;
      v_penalties := v_penalties || jsonb_build_object(
        'task', v_task.title,
        'status', v_status,
        'penalty', v_penalty,
        'priority', v_task.priority,
        'is_critical', v_task.is_critical
      );
    END IF;
  END LOOP;

  -- Clamp score to 0-100
  v_score := GREATEST(0, LEAST(100, v_score));

  RETURN QUERY SELECT v_score, v_green, v_amber, v_red, v_total, v_penalties;
END;
$$ LANGUAGE plpgsql;

-- Function to get end-of-day summary
CREATE OR REPLACE FUNCTION get_end_of_day_summary(p_session_id UUID)
RETURNS TABLE (
  score INTEGER,
  green_count INTEGER,
  amber_count INTEGER,
  red_count INTEGER,
  total_tasks INTEGER,
  opening_status TEXT,
  safety_status TEXT,
  closing_status TEXT,
  late_tasks JSONB,
  shift_label TEXT
) AS $$
DECLARE
  v_score INTEGER;
  v_green INTEGER;
  v_amber INTEGER;
  v_red INTEGER;
  v_total INTEGER;
  v_penalties JSONB;
  v_opening TEXT := '✓';
  v_safety TEXT := '✓';
  v_closing TEXT := '✓';
  v_late_tasks JSONB := '[]'::JSONB;
  v_label TEXT;
BEGIN
  -- Get score
  SELECT * INTO v_score, v_green, v_amber, v_red, v_total, v_penalties
  FROM calculate_shift_score(p_session_id);

  -- Determine shift label
  v_label := CASE 
    WHEN v_score >= 90 THEN 'Smooth shift'
    WHEN v_score >= 75 THEN 'Needs attention'
    ELSE 'Risky day'
  END;

  -- Check opening tasks
  SELECT CASE 
    WHEN COUNT(*) FILTER (WHERE cr.status != 'completed' AND ti.is_critical) > 0 THEN '❌'
    WHEN COUNT(*) FILTER (WHERE cr.status != 'completed') > 0 THEN '⚠️'
    ELSE '✓'
  END INTO v_opening
  FROM checklist_results cr
  JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
  JOIN template_items ti ON ti.id = cr.template_item_id
  JOIN templates t ON t.id = ti.template_id
  WHERE ci.shift_session_id = p_session_id
    AND t.template_type = 'opening';

  -- Check safety tasks
  SELECT CASE 
    WHEN COUNT(*) FILTER (WHERE cr.status != 'completed' AND ti.is_critical) > 0 THEN '❌'
    WHEN COUNT(*) FILTER (WHERE cr.status != 'completed') > 0 THEN '⚠️'
    ELSE '✓'
  END INTO v_safety
  FROM checklist_results cr
  JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
  JOIN template_items ti ON ti.id = cr.template_item_id
  JOIN templates t ON t.id = ti.template_id
  WHERE ci.shift_session_id = p_session_id
    AND (t.template_type = 'safety' OR ti.evidence_type != 'none');

  -- Check closing tasks
  SELECT CASE 
    WHEN COUNT(*) FILTER (WHERE cr.status != 'completed' AND ti.is_critical) > 0 THEN '❌'
    WHEN COUNT(*) FILTER (WHERE cr.status != 'completed') > 0 THEN '⚠️'
    ELSE '✓'
  END INTO v_closing
  FROM checklist_results cr
  JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
  JOIN template_items ti ON ti.id = cr.template_item_id
  JOIN templates t ON t.id = ti.template_id
  WHERE ci.shift_session_id = p_session_id
    AND t.template_type = 'closing';

  -- Get top 5 late/missed tasks
  SELECT jsonb_agg(task_info ORDER BY penalty DESC)
  INTO v_late_tasks
  FROM (
    SELECT jsonb_build_object(
      'title', ti.title,
      'status', CASE 
        WHEN cr.status = 'blocked' THEN 'blocked'
        WHEN cr.status != 'completed' THEN 'missed'
        WHEN cr.completed_at::TIME > ti.due_time + (ti.grace_period_minutes || ' minutes')::INTERVAL THEN 'late'
        WHEN cr.completed_at::TIME > ti.due_time THEN 'grace'
        ELSE 'on_time'
      END,
      'priority', ti.priority,
      'is_critical', ti.is_critical,
      'due_time', ti.due_time::TEXT,
      'completed_at', cr.completed_at::TIME::TEXT
    ) as task_info,
    CASE 
      WHEN cr.status != 'completed' THEN 100
      WHEN cr.completed_at::TIME > ti.due_time + (ti.grace_period_minutes || ' minutes')::INTERVAL THEN 50
      ELSE 25
    END as penalty
    FROM checklist_results cr
    JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
    JOIN template_items ti ON ti.id = cr.template_item_id
    WHERE ci.shift_session_id = p_session_id
      AND ti.due_time IS NOT NULL
      AND (
        cr.status != 'completed' 
        OR cr.completed_at::TIME > ti.due_time
      )
    ORDER BY penalty DESC
    LIMIT 5
  ) late_items;

  RETURN QUERY SELECT 
    v_score,
    v_green,
    v_amber,
    v_red,
    v_total,
    v_opening,
    v_safety,
    v_closing,
    COALESCE(v_late_tasks, '[]'::JSONB),
    v_label;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_shift_score IS 'Calculates 0-100 score based on task completion timing with priority-based penalties';
COMMENT ON FUNCTION get_end_of_day_summary IS 'Returns complete end-of-day summary with score, status indicators, and late tasks';
