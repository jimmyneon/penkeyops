-- Test the create_checklist_from_template function manually
-- Using the current session ID and a closing template

-- First, get a closing template ID
SELECT id, name, template_type 
FROM templates 
WHERE template_type = 'closing' 
AND is_active = true 
LIMIT 1;

-- Then test the function with the current session
-- Replace the template_id with one from the query above
SELECT create_checklist_from_template(
  'edba86cd-e516-4bf0-8380-f4e334412794'::UUID,  -- Current session
  '8f5f97fd-bd5e-44a2-85e5-639ef833ef59'::UUID   -- Closing template with 21 items
);

-- Check if it created the instance
SELECT 
  ci.id as instance_id,
  t.name as template_name,
  ci.created_at
FROM checklist_instances ci
JOIN templates t ON t.id = ci.template_id
WHERE ci.shift_session_id = 'edba86cd-e516-4bf0-8380-f4e334412794';

-- Check if it created the tasks
SELECT 
  COUNT(*) as task_count,
  status
FROM checklist_results cr
JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
WHERE ci.shift_session_id = 'edba86cd-e516-4bf0-8380-f4e334412794'
GROUP BY status;

-- Now test the resolver
SELECT * FROM resolve_now_action('edba86cd-e516-4bf0-8380-f4e334412794');
