-- ============================================
-- FIX EXISTING TASKS AFTER MIGRATION
-- Ensure all existing template_items have proper task_type values
-- ============================================

-- Update any NULL task_type values to 'tick' (default)
UPDATE template_items
SET task_type = 'tick'
WHERE task_type IS NULL;

-- Update tasks with evidence requirements to 'data_entry'
UPDATE template_items
SET task_type = 'data_entry'
WHERE task_type = 'tick'
  AND evidence_type != 'none';

-- Update tasks with linked groups to 'group'
UPDATE template_items
SET task_type = 'group'
WHERE task_type = 'tick'
  AND linked_group_id IS NOT NULL;

-- Ensure never_goes_red and no_notifications have default values
-- IMPORTANT: never_goes_red should ONLY be true for recurring rhythm tasks
-- All other tasks (tick, data_entry, group) should go red when overdue
UPDATE template_items
SET never_goes_red = false
WHERE never_goes_red IS NULL OR task_type != 'recurring';

UPDATE template_items
SET no_notifications = false
WHERE no_notifications IS NULL;

-- Verify the updates
SELECT 
  task_type,
  COUNT(*) as count,
  COUNT(CASE WHEN never_goes_red IS NULL THEN 1 END) as null_never_goes_red,
  COUNT(CASE WHEN no_notifications IS NULL THEN 1 END) as null_no_notifications
FROM template_items
GROUP BY task_type;
