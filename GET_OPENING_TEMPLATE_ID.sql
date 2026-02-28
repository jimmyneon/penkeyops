-- Get the Opening Checklist template ID
SELECT 
  id,
  name,
  template_type,
  (SELECT COUNT(*) FROM template_items WHERE template_id = templates.id) as current_task_count
FROM templates 
WHERE name = 'Opening Checklist'
  AND is_active = true;
