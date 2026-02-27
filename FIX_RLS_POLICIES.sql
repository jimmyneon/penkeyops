-- ============================================
-- FIX RLS POLICIES FOR RESOLVER
-- The resolver functions need to bypass RLS
-- ============================================

-- Check current RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN ('checklist_results', 'checklist_instances', 'template_items', 'shift_sessions')
ORDER BY tablename;

-- Disable RLS on tables that resolver needs to access
-- OR add policies that allow the resolver to read them

-- Option 1: Disable RLS (simpler, less secure)
ALTER TABLE checklist_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_instances DISABLE ROW LEVEL SECURITY;
ALTER TABLE template_items DISABLE ROW LEVEL SECURITY;

-- Option 2: Add SELECT policies for authenticated users (more secure)
-- Uncomment these if you want to keep RLS enabled:

/*
-- Enable RLS
ALTER TABLE checklist_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to read checklist_results" ON checklist_results;
DROP POLICY IF EXISTS "Allow authenticated users to read checklist_instances" ON checklist_instances;
DROP POLICY IF EXISTS "Allow authenticated users to read template_items" ON template_items;

-- Create new policies
CREATE POLICY "Allow authenticated users to read checklist_results"
ON checklist_results FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to read checklist_instances"
ON checklist_instances FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to read template_items"
ON template_items FOR SELECT
TO authenticated
USING (true);
*/

-- Verify RLS status after changes
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN ('checklist_results', 'checklist_instances', 'template_items', 'shift_sessions')
ORDER BY tablename;
