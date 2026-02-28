-- Check if RLS policies allow UPDATES to checklist_results
-- This is likely why task completion isn't saving

-- 1. Check all RLS policies on checklist_results
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'checklist_results';

-- 2. Check if RLS is enabled on the table
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'checklist_results';

-- 3. Test if we can update a task manually
-- Get a pending task ID first
SELECT id, status 
FROM checklist_results 
WHERE status = 'pending' 
LIMIT 1;

-- Try to update it (replace the ID with one from above)
-- UPDATE checklist_results 
-- SET status = 'completed', completed_at = NOW()
-- WHERE id = 'PASTE_ID_HERE';

-- Check if it updated
-- SELECT id, status, completed_at 
-- FROM checklist_results 
-- WHERE id = 'PASTE_ID_HERE';
