-- ============================================
-- ADD TASK GROUPS AND UPDATE SAMPLE DATA
-- Run this after the main sample data
-- ============================================

-- Insert task groups
INSERT INTO task_groups (id, name, description, icon) VALUES
('opening_prep', 'Front of House Prep', 'Get the front of house ready for service', 'coffee'),
('safety_checks', 'Safety Checks', 'Critical safety and hygiene checks', 'shield'),
('closing_cleanup', 'Closing Cleanup', 'Clean and secure the premises', 'broom')
ON CONFLICT (id) DO NOTHING;

-- Update opening tasks with groups and instructions
UPDATE template_items SET 
  linked_group_id = 'opening_prep',
  instruction = 'Turn on coffee machine and let it warm up',
  is_required = true
WHERE title = 'Coffee Machine ON' AND template_id IN (
  SELECT id FROM templates WHERE template_type = 'opening'
);

UPDATE template_items SET 
  linked_group_id = 'opening_prep',
  instruction = 'Unlock front door and turn open sign on',
  is_required = true
WHERE title = 'Unlock Front Door' AND template_id IN (
  SELECT id FROM templates WHERE template_type = 'opening'
);

UPDATE template_items SET 
  linked_group_id = 'opening_prep',
  instruction = 'Turn on all lights in customer areas',
  is_required = true
WHERE title = 'Turn On Lights' AND template_id IN (
  SELECT id FROM templates WHERE template_type = 'opening'
);

UPDATE template_items SET 
  linked_group_id = 'safety_checks',
  instruction = 'Check all fridges are at safe temperature (below 5°C)',
  is_required = true,
  is_critical = true
WHERE title = 'Check Fridge Temps' AND template_id IN (
  SELECT id FROM templates WHERE template_type = 'opening'
);

UPDATE template_items SET 
  instruction = 'Verify all food items are within use-by dates',
  is_required = true,
  is_critical = true
WHERE title = 'Check Use-By Dates' AND template_id IN (
  SELECT id FROM templates WHERE template_type = 'opening'
);

-- Update mid-shift tasks with instructions
UPDATE template_items SET 
  instruction = 'Record fridge and freezer temperatures',
  is_required = true,
  is_critical = true
WHERE title = 'Temperature Check' AND template_id IN (
  SELECT id FROM templates WHERE template_type = 'mid'
);

UPDATE template_items SET 
  instruction = 'Restock customer-facing areas',
  is_required = false
WHERE title = 'Restock Shelves' AND template_id IN (
  SELECT id FROM templates WHERE template_type = 'mid'
);

-- Update closing tasks with groups and instructions
UPDATE template_items SET 
  linked_group_id = 'closing_cleanup',
  instruction = 'Clean all customer tables and chairs',
  is_required = true
WHERE title = 'Clean Tables' AND template_id IN (
  SELECT id FROM templates WHERE template_type = 'closing'
);

UPDATE template_items SET 
  linked_group_id = 'closing_cleanup',
  instruction = 'Mop all floor areas',
  is_required = true
WHERE title = 'Mop Floors' AND template_id IN (
  SELECT id FROM templates WHERE template_type = 'closing'
);

UPDATE template_items SET 
  linked_group_id = 'closing_cleanup',
  instruction = 'Empty all bins and replace liners',
  is_required = true
WHERE title = 'Empty Bins' AND template_id IN (
  SELECT id FROM templates WHERE template_type = 'closing'
);

UPDATE template_items SET 
  instruction = 'Lock all doors and windows, set alarm',
  is_required = true,
  is_critical = true
WHERE title = 'Lock Up' AND template_id IN (
  SELECT id FROM templates WHERE template_type = 'closing'
);

UPDATE template_items SET 
  instruction = 'Record final temperature readings',
  is_required = true,
  is_critical = true
WHERE title = 'Final Temp Check' AND template_id IN (
  SELECT id FROM templates WHERE template_type = 'closing'
);

-- Add shift phases for a sample site
-- Get the first site ID
DO $$
DECLARE
  v_site_id UUID;
BEGIN
  SELECT id INTO v_site_id FROM sites LIMIT 1;
  
  IF v_site_id IS NOT NULL THEN
    INSERT INTO shift_phases (site_id, phase_name, start_time, end_time) VALUES
    (v_site_id, 'pre_open', '06:00:00', '08:00:00'),
    (v_site_id, 'opening', '08:00:00', '10:00:00'),
    (v_site_id, 'trading', '10:00:00', '15:00:00'),
    (v_site_id, 'peak', '15:00:00', '17:00:00'),
    (v_site_id, 'closing', '17:00:00', '20:00:00'),
    (v_site_id, 'closed', '20:00:00', '06:00:00')
    ON CONFLICT (site_id, phase_name) DO NOTHING;
  END IF;
END $$;

-- Verify the updates
SELECT 
  t.template_type,
  ti.title,
  ti.linked_group_id,
  ti.instruction,
  ti.is_required,
  ti.is_critical,
  ti.priority
FROM template_items ti
JOIN templates t ON t.id = ti.template_id
ORDER BY t.template_type, ti.sort_order;
