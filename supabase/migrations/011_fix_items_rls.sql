-- ============================================
-- FIX ITEMS TABLE RLS POLICIES
-- ============================================

-- Drop all existing policies on items table
DROP POLICY IF EXISTS "Users can view items" ON items;
DROP POLICY IF EXISTS "Admins can read all items" ON items;
DROP POLICY IF EXISTS "Admins can insert all items" ON items;
DROP POLICY IF EXISTS "Admins can update all items" ON items;
DROP POLICY IF EXISTS "Admins can delete all items" ON items;

-- Create simple admin policy that allows all access
CREATE POLICY "Admins have full access to items" ON items
  FOR ALL
  USING (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
  )
  WITH CHECK (
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
  );

-- Create policy for regular users to view items
CREATE POLICY "Users can view items" ON items
  FOR SELECT
  USING (
    -- Check if site_id column exists, if not allow all
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'items' AND column_name = 'site_id'
      )
      THEN (
        site_id IS NULL 
        OR site_id IN (SELECT site_id FROM users WHERE id = auth.uid())
      )
      ELSE true
    END
  );
