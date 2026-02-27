-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to create audit trail entries
CREATE OR REPLACE FUNCTION create_audit_entry()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    INSERT INTO audit_trail (user_id, action, table_name, record_id, old_data)
    VALUES (auth.uid(), 'delete', TG_TABLE_NAME, OLD.id, row_to_json(OLD));
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO audit_trail (user_id, action, table_name, record_id, old_data, new_data)
    VALUES (auth.uid(), 'update', TG_TABLE_NAME, NEW.id, row_to_json(OLD), row_to_json(NEW));
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO audit_trail (user_id, action, table_name, record_id, new_data)
    VALUES (auth.uid(), 'create', TG_TABLE_NAME, NEW.id, row_to_json(NEW));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to critical tables
CREATE TRIGGER audit_checklist_results
  AFTER INSERT OR UPDATE OR DELETE ON checklist_results
  FOR EACH ROW EXECUTE FUNCTION create_audit_entry();

CREATE TRIGGER audit_log_entries
  AFTER INSERT OR UPDATE OR DELETE ON log_entries
  FOR EACH ROW EXECUTE FUNCTION create_audit_entry();

CREATE TRIGGER audit_incidents
  AFTER INSERT OR UPDATE OR DELETE ON incidents
  FOR EACH ROW EXECUTE FUNCTION create_audit_entry();

CREATE TRIGGER audit_shift_sessions
  AFTER INSERT OR UPDATE OR DELETE ON shift_sessions
  FOR EACH ROW EXECUTE FUNCTION create_audit_entry();

-- ============================================
-- Function to check if shift can be completed
-- ============================================
CREATE OR REPLACE FUNCTION can_complete_shift(session_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  critical_incomplete INTEGER;
BEGIN
  SELECT COUNT(*) INTO critical_incomplete
  FROM checklist_results cr
  JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
  JOIN template_items ti ON ti.id = cr.template_item_id
  WHERE ci.shift_session_id = session_id
    AND ti.is_critical = true
    AND cr.status != 'completed';
  
  RETURN critical_incomplete = 0;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Function to get overdue tasks
-- ============================================
CREATE OR REPLACE FUNCTION get_overdue_tasks(session_id UUID)
RETURNS TABLE (
  task_id UUID,
  task_title TEXT,
  due_time TIME,
  priority priority_level
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cr.id,
    ti.title,
    ti.due_time,
    ti.priority
  FROM checklist_results cr
  JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
  JOIN template_items ti ON ti.id = cr.template_item_id
  WHERE ci.shift_session_id = session_id
    AND cr.status = 'pending'
    AND ti.due_time IS NOT NULL
    AND ti.due_time < CURRENT_TIME
  ORDER BY ti.priority, ti.due_time;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Function to create checklist from template
-- ============================================
CREATE OR REPLACE FUNCTION create_checklist_from_template(
  p_shift_session_id UUID,
  p_template_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_checklist_id UUID;
  v_item RECORD;
BEGIN
  -- Create checklist instance
  INSERT INTO checklist_instances (shift_session_id, template_id)
  VALUES (p_shift_session_id, p_template_id)
  RETURNING id INTO v_checklist_id;
  
  -- Create results for each template item
  FOR v_item IN 
    SELECT id FROM template_items 
    WHERE template_id = p_template_id 
    ORDER BY sort_order
  LOOP
    INSERT INTO checklist_results (
      checklist_instance_id,
      template_item_id,
      status
    ) VALUES (
      v_checklist_id,
      v_item.id,
      'pending'
    );
  END LOOP;
  
  RETURN v_checklist_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Function to get current active shift
-- ============================================
CREATE OR REPLACE FUNCTION get_active_shift(p_site_id UUID)
RETURNS UUID AS $$
DECLARE
  v_shift_id UUID;
BEGIN
  SELECT id INTO v_shift_id
  FROM shift_sessions
  WHERE site_id = p_site_id
    AND is_complete = false
  ORDER BY started_at DESC
  LIMIT 1;
  
  RETURN v_shift_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Function to get user's site
-- ============================================
CREATE OR REPLACE FUNCTION get_user_site()
RETURNS UUID AS $$
DECLARE
  v_site_id UUID;
BEGIN
  SELECT site_id INTO v_site_id
  FROM users
  WHERE id = auth.uid();
  
  RETURN v_site_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
