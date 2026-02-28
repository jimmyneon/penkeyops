-- Check which templates should be loaded and why they're missing
-- Session: d94f747e-2bc0-474a-8d44-f07c5a530e59

-- 1. Check session details
SELECT 
  id,
  shift_type,
  started_at,
  is_complete,
  site_id
FROM shift_sessions
WHERE id = 'd94f747e-2bc0-474a-8d44-f07c5a530e59';

-- 2. Check which templates exist for this shift type
SELECT 
  id,
  name,
  template_type,
  is_active,
  site_id
FROM templates
WHERE template_type = 'closing'  -- Replace with actual shift_type from query 1
  AND is_active = true
ORDER BY name;

-- 3. Check which checklist instances were created for this session
SELECT 
  ci.id as instance_id,
  t.name as template_name,
  t.template_type,
  COUNT(cr.id) as task_count
FROM checklist_instances ci
JOIN templates t ON t.id = ci.template_id
LEFT JOIN checklist_results cr ON cr.checklist_instance_id = ci.id
WHERE ci.shift_session_id = 'd94f747e-2bc0-474a-8d44-f07c5a530e59'
GROUP BY ci.id, t.name, t.template_type
ORDER BY t.name;

-- 4. Check all available templates (to see what's missing)
SELECT 
  name,
  template_type,
  is_active,
  site_id,
  (SELECT COUNT(*) FROM template_items WHERE template_id = templates.id) as item_count
FROM templates
WHERE is_active = true
ORDER BY template_type, name;
