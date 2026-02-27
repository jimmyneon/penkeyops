-- ============================================
-- DEBUG RESOLVER - Test with your actual session ID
-- ============================================

-- Test the resolver with your session ID
SELECT * FROM resolve_now_action('a977f875-85a1-4c82-8822-51c0fa9f972b');

-- Check what tasks should be found
SELECT 
  cr.id as task_id,
  ti.title,
  ti.due_time,
  ti.priority,
  ti.is_critical,
  ti.is_required,
  ti.linked_group_id,
  CURRENT_TIME as current_time,
  CASE 
    WHEN ti.due_time IS NOT NULL AND ti.due_time < CURRENT_TIME THEN true 
    ELSE false 
  END as is_overdue
FROM checklist_results cr
JOIN checklist_instances ci ON ci.id = cr.checklist_instance_id
JOIN template_items ti ON ti.id = cr.template_item_id
WHERE ci.shift_session_id = 'a977f875-85a1-4c82-8822-51c0fa9f972b'
  AND cr.status = 'pending'
ORDER BY 
  ti.is_critical DESC,
  ti.priority ASC,
  ti.due_time ASC NULLS LAST,
  ti.sort_order ASC;
