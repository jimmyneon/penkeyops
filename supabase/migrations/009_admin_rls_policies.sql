-- ============================================
-- ADMIN RLS POLICIES - Allow admins to access ALL data
-- ============================================

-- Drop existing restrictive admin policies and replace with broader ones

-- ============================================
-- USERS - Admins can see and manage ALL users
-- ============================================
DROP POLICY IF EXISTS "Admins can update site users" ON users;
CREATE POLICY "Admins can read all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all users" ON users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- ============================================
-- SITES - Admins can see and manage ALL sites
-- ============================================
DROP POLICY IF EXISTS "Admins can update own site" ON sites;
CREATE POLICY "Admins can read all sites" ON sites
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all sites" ON sites
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- ============================================
-- SHIFT SESSIONS - Admins can see ALL sessions
-- ============================================
CREATE POLICY "Admins can read all shift sessions" ON shift_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- ============================================
-- TEMPLATES - Admins can manage ALL templates
-- ============================================
DROP POLICY IF EXISTS "Admins can update templates" ON templates;
DROP POLICY IF EXISTS "Admins can delete templates" ON templates;

CREATE POLICY "Admins can read all templates" ON templates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all templates" ON templates
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete all templates" ON templates
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- ============================================
-- TEMPLATE ITEMS - Admins can manage ALL template items
-- ============================================
DROP POLICY IF EXISTS "Admins can insert template items" ON template_items;
DROP POLICY IF EXISTS "Admins can update template items" ON template_items;
DROP POLICY IF EXISTS "Admins can delete template items" ON template_items;

CREATE POLICY "Admins can read all template items" ON template_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert all template items" ON template_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all template items" ON template_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete all template items" ON template_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- ============================================
-- CHECKLIST INSTANCES - Admins can see ALL instances
-- ============================================
CREATE POLICY "Admins can read all checklist instances" ON checklist_instances
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- ============================================
-- CHECKLIST RESULTS - Admins can see ALL results
-- ============================================
CREATE POLICY "Admins can read all checklist results" ON checklist_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- ============================================
-- LOG ENTRIES - Admins can see ALL logs
-- ============================================
CREATE POLICY "Admins can read all log entries" ON log_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- ============================================
-- INCIDENTS - Admins can see and manage ALL incidents
-- ============================================
CREATE POLICY "Admins can read all incidents" ON incidents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all incidents" ON incidents
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- ============================================
-- AUDIT TRAIL - Admins can see ALL audit records
-- ============================================
CREATE POLICY "Admins can read all audit trail" ON audit_trail
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- ============================================
-- ITEMS (Food Items) - Admins can manage ALL items
-- ============================================
CREATE POLICY "Admins can read all items" ON items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert all items" ON items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all items" ON items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete all items" ON items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );
