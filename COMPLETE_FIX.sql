-- COMPLETE FIX - Run this ONE script to fix everything
-- This replaces all the other scripts

-- ============================================
-- STEP 1: Clean up database
-- ============================================

-- Delete all sessions and tasks for March 3rd
DELETE FROM checklist_results
WHERE checklist_instance_id IN (
  SELECT ci.id FROM checklist_instances ci
  JOIN shift_sessions ss ON ss.id = ci.shift_session_id
  WHERE ss.started_at >= '2026-03-03'::timestamp
);

DELETE FROM checklist_instances
WHERE shift_session_id IN (
  SELECT id FROM shift_sessions WHERE started_at >= '2026-03-03'::timestamp
);

DELETE FROM shift_sessions
WHERE started_at >= '2026-03-03'::timestamp;

-- Deactivate empty Daily Operations templates
UPDATE templates
SET is_active = false
WHERE name = 'Daily Operations'
  AND (SELECT COUNT(*) FROM template_items WHERE template_id = templates.id) = 0;

-- ============================================
-- STEP 2: Update can_end_day function
-- ============================================

DROP FUNCTION IF EXISTS can_end_day(UUID);

CREATE OR REPLACE FUNCTION can_end_day(p_session_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_total_tasks INTEGER;
  v_incomplete_required INTEGER;
  v_incomplete_critical INTEGER;
BEGIN
  -- Check if any tasks exist
  SELECT COUNT(*) INTO v_total_tasks
  FROM checklist_results cr
  JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
  WHERE ci.shift_session_id = p_session_id;
  
  IF v_total_tasks = 0 THEN
    RETURN false;
  END IF;
  
  -- Count incomplete required/critical tasks
  SELECT COUNT(*) INTO v_incomplete_required
  FROM checklist_results cr
  JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
  JOIN template_items ti ON ti.id = cr.template_item_id
  WHERE ci.shift_session_id = p_session_id
    AND cr.status = 'pending'
    AND ti.is_required = true;
  
  SELECT COUNT(*) INTO v_incomplete_critical
  FROM checklist_results cr
  JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
  JOIN template_items ti ON ti.id = cr.template_item_id
  WHERE ci.shift_session_id = p_session_id
    AND cr.status = 'pending'
    AND ti.is_critical = true;
  
  RETURN (v_incomplete_required = 0 AND v_incomplete_critical = 0);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 3: Update resolve_now_action function
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
  task_count INTEGER,
  never_goes_red BOOLEAN
) AS $$
DECLARE
  v_current_time TIME := CURRENT_TIME;
  v_session_started BOOLEAN;
BEGIN
  -- Check if session started
  SELECT started_at IS NOT NULL INTO v_session_started
  FROM shift_sessions
  WHERE id = p_session_id;
  
  -- SYSTEM ACTION: Start Day (if not started)
  IF NOT v_session_started THEN
    RETURN QUERY
    SELECT 
      'start_opening'::TEXT,
      NULL::UUID,
      NULL::TEXT,
      'Start Day'::TEXT,
      'Begin your shift'::TEXT,
      NULL::TIME,
      false,
      NULL::INTEGER,
      'P1'::TEXT,
      true,
      NULL::INTEGER,
      false;
    RETURN;
  END IF;

  -- Return first pending task
  RETURN QUERY
  SELECT 
    'task'::TEXT,
    cr.id,
    NULL::TEXT,
    ti.title,
    COALESCE(ti.instruction, ti.description),
    ti.due_time,
    false,
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
  ORDER BY ti.sort_order ASC
  LIMIT 1;

  RETURN;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 4: Create fresh session
-- ============================================

INSERT INTO shift_sessions (site_id, started_by, shift_type)
VALUES (
  (SELECT id FROM sites LIMIT 1),
  (SELECT id FROM auth.users LIMIT 1),
  'daily'
)
RETURNING id, started_at, shift_type;

-- ============================================
-- STEP 5: Load templates
-- ============================================

-- Get the session ID we just created
DO $$
DECLARE
  v_session_id UUID;
  v_template RECORD;
BEGIN
  SELECT id INTO v_session_id FROM shift_sessions ORDER BY created_at DESC LIMIT 1;
  
  FOR v_template IN 
    SELECT id FROM templates WHERE is_active = true
  LOOP
    PERFORM create_checklist_from_template(v_session_id, v_template.id);
  END LOOP;
END $$;

-- ============================================
-- VERIFY
-- ============================================

SELECT 
  'Session created' as status,
  id,
  started_at,
  (SELECT COUNT(*) FROM checklist_results cr
   JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
   WHERE ci.shift_session_id = shift_sessions.id) as task_count
FROM shift_sessions
ORDER BY created_at DESC
LIMIT 1;
