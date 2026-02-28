-- Create function to get end of day summary
-- This is called by the EndOfDayModal component

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
  v_green INTEGER := 0;
  v_amber INTEGER := 0;
  v_red INTEGER := 0;
  v_total INTEGER := 0;
  v_score INTEGER := 0;
  v_opening TEXT := '✓';
  v_safety TEXT := '✓';
  v_closing TEXT := '✓';
  v_late_tasks JSONB;
BEGIN
  -- Count task statuses
  SELECT 
    COUNT(*) FILTER (WHERE cr.status = 'completed' AND ti.due_time IS NOT NULL AND cr.completed_at::TIME <= ti.due_time) as green,
    COUNT(*) FILTER (WHERE cr.status = 'completed' AND ti.due_time IS NOT NULL AND cr.completed_at::TIME > ti.due_time AND cr.completed_at::TIME <= (ti.due_time + (ti.grace_period_minutes || ' minutes')::INTERVAL)) as amber,
    COUNT(*) FILTER (WHERE 
      (cr.status = 'completed' AND ti.due_time IS NOT NULL AND cr.completed_at::TIME > (ti.due_time + (ti.grace_period_minutes || ' minutes')::INTERVAL))
      OR (cr.status = 'skipped')
    ) as red,
    COUNT(*) as total
  INTO v_green, v_amber, v_red, v_total
  FROM checklist_results cr
  JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
  JOIN template_items ti ON ti.id = cr.template_item_id
  WHERE ci.shift_session_id = p_session_id
    AND ti.title != 'End of Day'; -- Exclude the End of Day task itself
  
  -- Calculate score (green = 100%, amber = 80%, red = 0%)
  IF v_total > 0 THEN
    v_score := ROUND(((v_green * 100.0) + (v_amber * 80.0)) / v_total);
  ELSE
    v_score := 100;
  END IF;
  
  -- Check opening status (any critical P1 tasks in first 2 hours)
  IF EXISTS (
    SELECT 1 FROM checklist_results cr
    JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
    JOIN template_items ti ON ti.id = cr.template_item_id
    WHERE ci.shift_session_id = p_session_id
      AND ti.is_critical = true
      AND ti.priority = 'P1'
      AND ti.due_time < '11:00:00'::TIME
      AND (cr.status = 'skipped' OR (cr.status = 'completed' AND cr.completed_at::TIME > (ti.due_time + (ti.grace_period_minutes || ' minutes')::INTERVAL)))
  ) THEN
    v_opening := '✗';
  END IF;
  
  -- Check safety status (temperature logs - numeric evidence type)
  IF EXISTS (
    SELECT 1 FROM checklist_results cr
    JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
    JOIN template_items ti ON ti.id = cr.template_item_id
    WHERE ci.shift_session_id = p_session_id
      AND ti.evidence_type = 'numeric'
      AND ti.title ILIKE '%temperature%'
      AND cr.status = 'skipped'
  ) THEN
    v_safety := '✗';
  END IF;
  
  -- Check closing status
  IF EXISTS (
    SELECT 1 FROM checklist_results cr
    JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
    JOIN template_items ti ON ti.id = cr.template_item_id
    WHERE ci.shift_session_id = p_session_id
      AND ti.due_time > '16:00:00'::TIME
      AND cr.status = 'skipped'
  ) THEN
    v_closing := '⚠️';
  END IF;
  
  -- Get late tasks
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'title', ti.title,
      'status', CASE
        WHEN cr.status = 'skipped' THEN 'missed'
        WHEN cr.status = 'completed' AND cr.completed_at::TIME > (ti.due_time + (ti.grace_period_minutes || ' minutes')::INTERVAL) THEN 'late'
        WHEN cr.status = 'completed' AND cr.completed_at::TIME > ti.due_time THEN 'grace'
        ELSE 'blocked'
      END,
      'priority', ti.priority,
      'is_critical', ti.is_critical,
      'due_time', ti.due_time::TEXT,
      'completed_at', cr.completed_at::TIME::TEXT
    )
  ), '[]'::jsonb) INTO v_late_tasks
  FROM checklist_results cr
  JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
  JOIN template_items ti ON ti.id = cr.template_item_id
  WHERE ci.shift_session_id = p_session_id
    AND ti.title != 'End of Day'
    AND (
      cr.status = 'skipped'
      OR (cr.status = 'completed' AND ti.due_time IS NOT NULL AND cr.completed_at::TIME > ti.due_time)
    );
  
  -- Return summary
  RETURN QUERY SELECT
    v_score,
    v_green,
    v_amber,
    v_red,
    v_total,
    v_opening,
    v_safety,
    v_closing,
    v_late_tasks,
    CASE
      WHEN v_score >= 95 THEN 'Excellent Shift! 🌟'
      WHEN v_score >= 90 THEN 'Great Work! 👏'
      WHEN v_score >= 80 THEN 'Good Effort 👍'
      WHEN v_score >= 70 THEN 'Room for Improvement'
      ELSE 'Needs Attention'
    END;
END;
$$ LANGUAGE plpgsql;
