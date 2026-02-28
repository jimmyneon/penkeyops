-- Check the current session that the browser is using
-- Session ID from browser: edba86cd-e516-4bf0-8380-f4e334412794

-- 1. Check if this session exists
SELECT 
  id,
  shift_type,
  started_at,
  is_complete,
  site_id
FROM shift_sessions 
WHERE id = 'edba86cd-e516-4bf0-8380-f4e334412794';

-- 2. Check if it has checklist instances
SELECT 
  ci.id as instance_id,
  t.name as template_name,
  t.template_type,
  ci.created_at
FROM checklist_instances ci
JOIN templates t ON t.id = ci.template_id
WHERE ci.shift_session_id = 'edba86cd-e516-4bf0-8380-f4e334412794';

-- 3. Check if it has any tasks
SELECT 
  cr.id,
  ti.title,
  cr.status,
  ti.due_time
FROM checklist_results cr
JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
JOIN template_items ti ON ti.id = cr.template_item_id
WHERE ci.shift_session_id = 'edba86cd-e516-4bf0-8380-f4e334412794'
ORDER BY ti.due_time ASC NULLS LAST;

-- 4. Test resolver directly with this session
SELECT * FROM resolve_now_action('edba86cd-e516-4bf0-8380-f4e334412794');
