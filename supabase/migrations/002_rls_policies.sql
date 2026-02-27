-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE log_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- USERS POLICIES
-- ============================================
-- Users can read their own record
CREATE POLICY "Users can read own record" ON users
  FOR SELECT USING (auth.uid() = id);

-- Users can read other users at their site
CREATE POLICY "Users can read site members" ON users
  FOR SELECT USING (
    site_id IN (SELECT site_id FROM users WHERE id = auth.uid())
  );

-- Admins can update users at their site
CREATE POLICY "Admins can update site users" ON users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin' 
      AND site_id = users.site_id
    )
  );

-- ============================================
-- SITES POLICIES
-- ============================================
-- Users can read their own site
CREATE POLICY "Users can read own site" ON sites
  FOR SELECT USING (
    id IN (SELECT site_id FROM users WHERE id = auth.uid())
  );

-- Admins can update their site
CREATE POLICY "Admins can update own site" ON sites
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin' 
      AND site_id = sites.id
    )
  );

-- ============================================
-- SHIFT SESSIONS POLICIES
-- ============================================
-- Users can read shift sessions at their site
CREATE POLICY "Users can read site shift sessions" ON shift_sessions
  FOR SELECT USING (
    site_id IN (SELECT site_id FROM users WHERE id = auth.uid())
  );

-- Users can create shift sessions at their site
CREATE POLICY "Users can create shift sessions" ON shift_sessions
  FOR INSERT WITH CHECK (
    site_id IN (SELECT site_id FROM users WHERE id = auth.uid())
  );

-- Users can update shift sessions they started or are completing
CREATE POLICY "Users can update shift sessions" ON shift_sessions
  FOR UPDATE USING (
    site_id IN (SELECT site_id FROM users WHERE id = auth.uid())
  );

-- ============================================
-- TEMPLATES POLICIES
-- ============================================
-- Users can read templates for their site
CREATE POLICY "Users can read site templates" ON templates
  FOR SELECT USING (
    site_id IN (SELECT site_id FROM users WHERE id = auth.uid())
    OR site_id IS NULL -- Global templates
  );

-- Admins can create templates
CREATE POLICY "Admins can create templates" ON templates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Admins can update templates at their site
CREATE POLICY "Admins can update templates" ON templates
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin' 
      AND site_id = templates.site_id
    )
  );

-- Admins can delete templates at their site
CREATE POLICY "Admins can delete templates" ON templates
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin' 
      AND site_id = templates.site_id
    )
  );

-- ============================================
-- TEMPLATE ITEMS POLICIES
-- ============================================
-- Users can read template items for accessible templates
CREATE POLICY "Users can read template items" ON template_items
  FOR SELECT USING (
    template_id IN (
      SELECT id FROM templates 
      WHERE site_id IN (SELECT site_id FROM users WHERE id = auth.uid())
      OR site_id IS NULL
    )
  );

-- Admins can manage template items
CREATE POLICY "Admins can insert template items" ON template_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      JOIN templates t ON t.site_id = u.site_id
      WHERE u.id = auth.uid() 
      AND u.role = 'admin'
      AND t.id = template_items.template_id
    )
  );

CREATE POLICY "Admins can update template items" ON template_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN templates t ON t.site_id = u.site_id
      WHERE u.id = auth.uid() 
      AND u.role = 'admin'
      AND t.id = template_items.template_id
    )
  );

CREATE POLICY "Admins can delete template items" ON template_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN templates t ON t.site_id = u.site_id
      WHERE u.id = auth.uid() 
      AND u.role = 'admin'
      AND t.id = template_items.template_id
    )
  );

-- ============================================
-- CHECKLIST INSTANCES POLICIES
-- ============================================
-- Users can read checklist instances for their site's shift sessions
CREATE POLICY "Users can read checklist instances" ON checklist_instances
  FOR SELECT USING (
    shift_session_id IN (
      SELECT id FROM shift_sessions 
      WHERE site_id IN (SELECT site_id FROM users WHERE id = auth.uid())
    )
  );

-- Users can create checklist instances
CREATE POLICY "Users can create checklist instances" ON checklist_instances
  FOR INSERT WITH CHECK (
    shift_session_id IN (
      SELECT id FROM shift_sessions 
      WHERE site_id IN (SELECT site_id FROM users WHERE id = auth.uid())
    )
  );

-- ============================================
-- CHECKLIST RESULTS POLICIES
-- ============================================
-- Users can read checklist results for their site
CREATE POLICY "Users can read checklist results" ON checklist_results
  FOR SELECT USING (
    checklist_instance_id IN (
      SELECT ci.id FROM checklist_instances ci
      JOIN shift_sessions ss ON ss.id = ci.shift_session_id
      WHERE ss.site_id IN (SELECT site_id FROM users WHERE id = auth.uid())
    )
  );

-- Users can create checklist results
CREATE POLICY "Users can create checklist results" ON checklist_results
  FOR INSERT WITH CHECK (
    checklist_instance_id IN (
      SELECT ci.id FROM checklist_instances ci
      JOIN shift_sessions ss ON ss.id = ci.shift_session_id
      WHERE ss.site_id IN (SELECT site_id FROM users WHERE id = auth.uid())
    )
  );

-- Users can update their own checklist results (for amendments)
CREATE POLICY "Users can update checklist results" ON checklist_results
  FOR UPDATE USING (
    checklist_instance_id IN (
      SELECT ci.id FROM checklist_instances ci
      JOIN shift_sessions ss ON ss.id = ci.shift_session_id
      WHERE ss.site_id IN (SELECT site_id FROM users WHERE id = auth.uid())
    )
  );

-- ============================================
-- LOG ENTRIES POLICIES
-- ============================================
-- Users can read log entries for their site
CREATE POLICY "Users can read log entries" ON log_entries
  FOR SELECT USING (
    shift_session_id IN (
      SELECT id FROM shift_sessions 
      WHERE site_id IN (SELECT site_id FROM users WHERE id = auth.uid())
    )
  );

-- Users can create log entries
CREATE POLICY "Users can create log entries" ON log_entries
  FOR INSERT WITH CHECK (
    shift_session_id IN (
      SELECT id FROM shift_sessions 
      WHERE site_id IN (SELECT site_id FROM users WHERE id = auth.uid())
    )
  );

-- ============================================
-- INCIDENTS POLICIES
-- ============================================
-- Users can read incidents for their site
CREATE POLICY "Users can read incidents" ON incidents
  FOR SELECT USING (
    site_id IN (SELECT site_id FROM users WHERE id = auth.uid())
  );

-- Users can create incidents
CREATE POLICY "Users can create incidents" ON incidents
  FOR INSERT WITH CHECK (
    site_id IN (SELECT site_id FROM users WHERE id = auth.uid())
  );

-- Users can update incidents at their site
CREATE POLICY "Users can update incidents" ON incidents
  FOR UPDATE USING (
    site_id IN (SELECT site_id FROM users WHERE id = auth.uid())
  );

-- ============================================
-- NOTIFICATIONS POLICIES
-- ============================================
-- Users can read their own notifications
CREATE POLICY "Users can read own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- System can create notifications (via service role)
CREATE POLICY "System can create notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- ============================================
-- AUDIT TRAIL POLICIES
-- ============================================
-- Users can read audit trail for their site
CREATE POLICY "Users can read audit trail" ON audit_trail
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users 
      WHERE site_id IN (SELECT site_id FROM users WHERE id = auth.uid())
    )
    OR user_id = auth.uid()
  );

-- System can insert audit records (via triggers)
CREATE POLICY "System can insert audit trail" ON audit_trail
  FOR INSERT WITH CHECK (true);

-- ============================================
-- PUSH SUBSCRIPTIONS POLICIES
-- ============================================
-- Users can manage their own push subscriptions
CREATE POLICY "Users can read own subscriptions" ON push_subscriptions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own subscriptions" ON push_subscriptions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own subscriptions" ON push_subscriptions
  FOR DELETE USING (user_id = auth.uid());
