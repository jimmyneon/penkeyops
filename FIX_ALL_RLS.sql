-- ============================================
-- FIX ALL RLS POLICIES - COMPLETE FIX
-- ============================================
-- This fixes the 406 error and ensures all tables work

-- Drop all existing policies first
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT schemaname, tablename, policyname 
              FROM pg_policies 
              WHERE schemaname = 'public') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                      r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- Simple working policies for all tables
-- Users table
CREATE POLICY "users_all" ON users FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- All other tables - allow all authenticated users
CREATE POLICY "sites_all" ON sites FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "shift_sessions_all" ON shift_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "templates_all" ON templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "template_items_all" ON template_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "checklist_instances_all" ON checklist_instances FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "checklist_results_all" ON checklist_results FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "log_entries_all" ON log_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "incidents_all" ON incidents FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "notifications_all" ON notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "audit_trail_all" ON audit_trail FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "push_subscriptions_all" ON push_subscriptions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- This is the simplest possible RLS setup that will work
-- Later we can add more restrictive site-based policies
