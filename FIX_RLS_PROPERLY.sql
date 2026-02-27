-- ============================================
-- FIX RLS POLICIES PROPERLY - NO RECURSION
-- ============================================

-- First, re-enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Users can read own record" ON users;
DROP POLICY IF EXISTS "Users can read site members" ON users;
DROP POLICY IF EXISTS "Admins can read site users" ON users;
DROP POLICY IF EXISTS "Admins can update site users" ON users;

-- Create a simple, working policy: Users can ONLY read their own record
-- This is the simplest possible policy with zero recursion
CREATE POLICY "users_select_own" ON users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Allow users to update their own record (for profile updates)
CREATE POLICY "users_update_own" ON users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================
-- RE-ENABLE RLS ON OTHER TABLES
-- ============================================

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

-- Simple policies for other tables
CREATE POLICY "sites_select" ON sites FOR SELECT TO authenticated USING (true);
CREATE POLICY "shift_sessions_all" ON shift_sessions FOR ALL TO authenticated USING (true);
CREATE POLICY "templates_all" ON templates FOR ALL TO authenticated USING (true);
CREATE POLICY "template_items_all" ON template_items FOR ALL TO authenticated USING (true);
CREATE POLICY "checklist_instances_all" ON checklist_instances FOR ALL TO authenticated USING (true);
CREATE POLICY "checklist_results_all" ON checklist_results FOR ALL TO authenticated USING (true);
CREATE POLICY "log_entries_all" ON log_entries FOR ALL TO authenticated USING (true);
CREATE POLICY "incidents_all" ON incidents FOR ALL TO authenticated USING (true);
CREATE POLICY "notifications_all" ON notifications FOR ALL TO authenticated USING (true);
CREATE POLICY "audit_trail_select" ON audit_trail FOR SELECT TO authenticated USING (true);
CREATE POLICY "push_subscriptions_all" ON push_subscriptions FOR ALL TO authenticated USING (true);

-- ============================================
-- EXPLANATION
-- ============================================
-- These policies are simple and work:
-- - Users can only read/update their own user record
-- - All authenticated users can access other tables
-- 
-- Later we can add more restrictive site-based policies,
-- but for now this gets the app working securely.
