-- Check if items table exists and has RLS enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'items';

-- Check existing policies on items table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'items';

-- Check if items table has any data
SELECT COUNT(*) as total_items FROM items;

-- Check if items table has site_id column
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'items';
