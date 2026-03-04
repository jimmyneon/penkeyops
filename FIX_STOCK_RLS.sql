-- Fix RLS policies for stock checking tables to allow service role access
-- Run this in Supabase SQL Editor

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can read items" ON items;
DROP POLICY IF EXISTS "Authenticated users can manage items" ON items;
DROP POLICY IF EXISTS "Authenticated users can read stock_sessions" ON stock_sessions;
DROP POLICY IF EXISTS "Authenticated users can manage stock_sessions" ON stock_sessions;
DROP POLICY IF EXISTS "Authenticated users can read stock_counts" ON stock_counts;
DROP POLICY IF EXISTS "Authenticated users can manage stock_counts" ON stock_counts;
DROP POLICY IF EXISTS "Authenticated users can read stock_current" ON stock_current;
DROP POLICY IF EXISTS "Authenticated users can manage stock_current" ON stock_current;
DROP POLICY IF EXISTS "Authenticated users can read stock_movements" ON stock_movements;
DROP POLICY IF EXISTS "Authenticated users can manage stock_movements" ON stock_movements;

-- Items table - allow service role and authenticated users
CREATE POLICY "Allow service role full access to items" ON items
  FOR ALL USING (auth.jwt() IS NULL OR auth.role() = 'authenticated');

-- Stock sessions
CREATE POLICY "Allow service role full access to stock_sessions" ON stock_sessions
  FOR ALL USING (auth.jwt() IS NULL OR auth.role() = 'authenticated');

-- Stock counts
CREATE POLICY "Allow service role full access to stock_counts" ON stock_counts
  FOR ALL USING (auth.jwt() IS NULL OR auth.role() = 'authenticated');

-- Stock current
CREATE POLICY "Allow service role full access to stock_current" ON stock_current
  FOR ALL USING (auth.jwt() IS NULL OR auth.role() = 'authenticated');

-- Stock movements
CREATE POLICY "Allow service role full access to stock_movements" ON stock_movements
  FOR ALL USING (auth.jwt() IS NULL OR auth.role() = 'authenticated');

-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('items', 'stock_sessions', 'stock_counts', 'stock_current', 'stock_movements');
