-- ============================================
-- FIX INFINITE RECURSION IN ADMIN RLS POLICIES
-- ============================================
-- The issue: policies that check the users table while querying users table cause recursion
-- Solution: Use auth.jwt() to check role directly from JWT token

-- ============================================
-- USERS - Fix recursion by using JWT
-- ============================================
DROP POLICY IF EXISTS "Admins can read all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;

CREATE POLICY "Admins can read all users" ON users
  FOR SELECT USING (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
    OR auth.uid() = id
  );

CREATE POLICY "Admins can update all users" ON users
  FOR UPDATE USING (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
  );

-- ============================================
-- SITES - Fix recursion
-- ============================================
DROP POLICY IF EXISTS "Admins can read all sites" ON sites;
DROP POLICY IF EXISTS "Admins can update all sites" ON sites;

CREATE POLICY "Admins can read all sites" ON sites
  FOR SELECT USING (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
    OR id IN (SELECT site_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Admins can update all sites" ON sites
  FOR UPDATE USING (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
  );

-- ============================================
-- SHIFT SESSIONS - Fix recursion
-- ============================================
DROP POLICY IF EXISTS "Admins can read all shift sessions" ON shift_sessions;

CREATE POLICY "Admins can read all shift sessions" ON shift_sessions
  FOR SELECT USING (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
    OR site_id IN (SELECT site_id FROM users WHERE id = auth.uid())
  );

-- ============================================
-- TEMPLATES - Fix recursion
-- ============================================
DROP POLICY IF EXISTS "Admins can read all templates" ON templates;
DROP POLICY IF EXISTS "Admins can update all templates" ON templates;
DROP POLICY IF EXISTS "Admins can delete all templates" ON templates;

CREATE POLICY "Admins can read all templates" ON templates
  FOR SELECT USING (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
    OR site_id IN (SELECT site_id FROM users WHERE id = auth.uid())
    OR site_id IS NULL
  );

CREATE POLICY "Admins can update all templates" ON templates
  FOR UPDATE USING (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
  );

CREATE POLICY "Admins can delete all templates" ON templates
  FOR DELETE USING (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
  );

-- ============================================
-- TEMPLATE ITEMS - Fix recursion
-- ============================================
DROP POLICY IF EXISTS "Admins can read all template items" ON template_items;
DROP POLICY IF EXISTS "Admins can insert all template items" ON template_items;
DROP POLICY IF EXISTS "Admins can update all template items" ON template_items;
DROP POLICY IF EXISTS "Admins can delete all template items" ON template_items;

CREATE POLICY "Admins can read all template items" ON template_items
  FOR SELECT USING (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
    OR template_id IN (
      SELECT id FROM templates 
      WHERE site_id IN (SELECT site_id FROM users WHERE id = auth.uid())
      OR site_id IS NULL
    )
  );

CREATE POLICY "Admins can insert all template items" ON template_items
  FOR INSERT WITH CHECK (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
  );

CREATE POLICY "Admins can update all template items" ON template_items
  FOR UPDATE USING (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
  );

CREATE POLICY "Admins can delete all template items" ON template_items
  FOR DELETE USING (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
  );

-- ============================================
-- CHECKLIST INSTANCES - Fix recursion
-- ============================================
DROP POLICY IF EXISTS "Admins can read all checklist instances" ON checklist_instances;

CREATE POLICY "Admins can read all checklist instances" ON checklist_instances
  FOR SELECT USING (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
    OR shift_session_id IN (
      SELECT id FROM shift_sessions 
      WHERE site_id IN (SELECT site_id FROM users WHERE id = auth.uid())
    )
  );

-- ============================================
-- CHECKLIST RESULTS - Fix recursion
-- ============================================
DROP POLICY IF EXISTS "Admins can read all checklist results" ON checklist_results;

CREATE POLICY "Admins can read all checklist results" ON checklist_results
  FOR SELECT USING (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
    OR checklist_instance_id IN (
      SELECT ci.id FROM checklist_instances ci
      JOIN shift_sessions ss ON ss.id = ci.shift_session_id
      WHERE ss.site_id IN (SELECT site_id FROM users WHERE id = auth.uid())
    )
  );

-- ============================================
-- LOG ENTRIES - Fix recursion
-- ============================================
DROP POLICY IF EXISTS "Admins can read all log entries" ON log_entries;

CREATE POLICY "Admins can read all log entries" ON log_entries
  FOR SELECT USING (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
    OR shift_session_id IN (
      SELECT id FROM shift_sessions 
      WHERE site_id IN (SELECT site_id FROM users WHERE id = auth.uid())
    )
  );

-- ============================================
-- INCIDENTS - Fix recursion
-- ============================================
DROP POLICY IF EXISTS "Admins can read all incidents" ON incidents;
DROP POLICY IF EXISTS "Admins can update all incidents" ON incidents;

CREATE POLICY "Admins can read all incidents" ON incidents
  FOR SELECT USING (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
    OR site_id IN (SELECT site_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Admins can update all incidents" ON incidents
  FOR UPDATE USING (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
  );

-- ============================================
-- AUDIT TRAIL - Fix recursion
-- ============================================
DROP POLICY IF EXISTS "Admins can read all audit trail" ON audit_trail;

CREATE POLICY "Admins can read all audit trail" ON audit_trail
  FOR SELECT USING (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
    OR user_id IN (
      SELECT id FROM users 
      WHERE site_id IN (SELECT site_id FROM users WHERE id = auth.uid())
    )
    OR user_id = auth.uid()
  );

-- ============================================
-- ITEMS (Food Items) - Fix recursion
-- ============================================
-- Only update if site_id column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'items' AND column_name = 'site_id'
  ) THEN
    DROP POLICY IF EXISTS "Admins can read all items" ON items;
    DROP POLICY IF EXISTS "Admins can insert all items" ON items;
    DROP POLICY IF EXISTS "Admins can update all items" ON items;
    DROP POLICY IF EXISTS "Admins can delete all items" ON items;

    EXECUTE 'CREATE POLICY "Admins can read all items" ON items
      FOR SELECT USING (
        (auth.jwt() ->> ''user_metadata'')::jsonb ->> ''role'' = ''admin''
        OR site_id IN (SELECT site_id FROM users WHERE id = auth.uid())
        OR site_id IS NULL
      )';

    EXECUTE 'CREATE POLICY "Admins can insert all items" ON items
      FOR INSERT WITH CHECK (
        (auth.jwt() ->> ''user_metadata'')::jsonb ->> ''role'' = ''admin''
      )';

    EXECUTE 'CREATE POLICY "Admins can update all items" ON items
      FOR UPDATE USING (
        (auth.jwt() ->> ''user_metadata'')::jsonb ->> ''role'' = ''admin''
      )';

    EXECUTE 'CREATE POLICY "Admins can delete all items" ON items
      FOR DELETE USING (
        (auth.jwt() ->> ''user_metadata'')::jsonb ->> ''role'' = ''admin''
      )';
  ELSE
    -- If site_id doesn't exist, just give admins full access
    DROP POLICY IF EXISTS "Admins can read all items" ON items;
    DROP POLICY IF EXISTS "Admins can insert all items" ON items;
    DROP POLICY IF EXISTS "Admins can update all items" ON items;
    DROP POLICY IF EXISTS "Admins can delete all items" ON items;

    EXECUTE 'CREATE POLICY "Admins can read all items" ON items
      FOR SELECT USING (
        (auth.jwt() ->> ''user_metadata'')::jsonb ->> ''role'' = ''admin''
        OR true
      )';

    EXECUTE 'CREATE POLICY "Admins can insert all items" ON items
      FOR INSERT WITH CHECK (
        (auth.jwt() ->> ''user_metadata'')::jsonb ->> ''role'' = ''admin''
      )';

    EXECUTE 'CREATE POLICY "Admins can update all items" ON items
      FOR UPDATE USING (
        (auth.jwt() ->> ''user_metadata'')::jsonb ->> ''role'' = ''admin''
      )';

    EXECUTE 'CREATE POLICY "Admins can delete all items" ON items
      FOR DELETE USING (
        (auth.jwt() ->> ''user_metadata'')::jsonb ->> ''role'' = ''admin''
      )';
  END IF;
END $$;
