-- ============================================
-- UPDATE SAMPLE DATA FOR RESOLVER SYSTEM
-- 8:30am start, 5pm close
-- Confirm start/end of day tasks
-- ============================================

-- First, clear existing data in correct order to avoid foreign key violations
-- Delete shift sessions (this cascades to checklist_instances and checklist_results)
DELETE FROM shift_sessions;

-- Now safe to delete template items
DELETE FROM template_items;

-- Get template IDs
DO $$
DECLARE
  v_opening_template_id UUID;
  v_mid_template_id UUID;
  v_closing_template_id UUID;
BEGIN
  -- Get template IDs
  SELECT id INTO v_opening_template_id FROM templates WHERE template_type = 'opening' LIMIT 1;
  SELECT id INTO v_mid_template_id FROM templates WHERE template_type = 'mid' LIMIT 1;
  SELECT id INTO v_closing_template_id FROM templates WHERE template_type = 'closing' LIMIT 1;

  -- ============================================
  -- OPENING TASKS (8:30am start)
  -- ============================================
  
  -- Confirm Start of Day (FIRST TASK)
  INSERT INTO template_items (
    template_id, title, description, priority, is_critical, due_time, sort_order,
    evidence_type, instruction, is_required, linked_group_id
  ) VALUES (
    v_opening_template_id,
    'Confirm Start of Day',
    'Confirm you are starting your shift and ready to open',
    'P1'::priority_level,
    true,
    '08:30:00',
    1,
    'note',
    'Tap to confirm you have arrived and are ready to begin opening',
    true,
    NULL
  );

  -- Opening Prep Group
  INSERT INTO template_items (
    template_id, title, description, priority, is_critical, due_time, sort_order,
    evidence_type, instruction, is_required, linked_group_id
  ) VALUES 
  (
    v_opening_template_id,
    'Unlock Front Door',
    'Unlock and open the front entrance',
    'P1'::priority_level,
    true,
    '08:35:00',
    2,
    NULL,
    'Unlock front door and turn open sign on',
    true,
    'opening_prep'
  ),
  (
    v_opening_template_id,
    'Turn On Lights',
    'Turn on all customer area lights',
    'P1'::priority_level,
    true,
    '08:35:00',
    3,
    NULL,
    'Turn on all lights in customer areas',
    true,
    'opening_prep'
  ),
  (
    v_opening_template_id,
    'Coffee Machine ON',
    'Start the coffee machine',
    'P1'::priority_level,
    true,
    '08:35:00',
    4,
    NULL,
    'Turn on coffee machine and let it warm up',
    true,
    'opening_prep'
  );

  -- Safety Checks Group
  INSERT INTO template_items (
    template_id, title, description, priority, is_critical, due_time, sort_order,
    evidence_type, instruction, is_required, linked_group_id
  ) VALUES 
  (
    v_opening_template_id,
    'Check Fridge Temps',
    'Verify all fridges are at safe temperature',
    'P1'::priority_level,
    true,
    '08:40:00',
    5,
    'numeric',
    'Check all fridges are at safe temperature (below 5°C)',
    true,
    'safety_checks'
  ),
  (
    v_opening_template_id,
    'Check Use-By Dates',
    'Verify all food is within date',
    'P1'::priority_level,
    true,
    '08:40:00',
    6,
    NULL,
    'Verify all food items are within use-by dates',
    true,
    'safety_checks'
  );

  -- Additional opening tasks
  INSERT INTO template_items (
    template_id, title, description, priority, is_critical, due_time, sort_order,
    evidence_type, instruction, is_required, linked_group_id
  ) VALUES 
  (
    v_opening_template_id,
    'Restock Display',
    'Restock customer-facing displays',
    'P2'::priority_level,
    false,
    '08:50:00',
    7,
    NULL,
    'Restock all customer-facing areas',
    false,
    NULL
  ),
  (
    v_opening_template_id,
    'Check Till Float',
    'Verify cash float is correct',
    'P1'::priority_level,
    true,
    '08:55:00',
    8,
    'numeric',
    'Count and confirm till float amount',
    true,
    NULL
  );

  -- ============================================
  -- MID SHIFT TASKS (during day)
  -- ============================================
  
  INSERT INTO template_items (
    template_id, title, description, priority, is_critical, due_time, sort_order,
    evidence_type, instruction, is_required, linked_group_id
  ) VALUES 
  (
    v_mid_template_id,
    'Lunch Temperature Check',
    'Record fridge and freezer temperatures',
    'P1'::priority_level,
    true,
    '12:00:00',
    1,
    'numeric',
    'Record fridge and freezer temperatures',
    true,
    NULL
  ),
  (
    v_mid_template_id,
    'Afternoon Temperature Check',
    'Record fridge and freezer temperatures',
    'P1'::priority_level,
    true,
    '15:00:00',
    2,
    'numeric',
    'Record fridge and freezer temperatures',
    true,
    NULL
  ),
  (
    v_mid_template_id,
    'Restock Shelves',
    'Restock customer areas as needed',
    'P2'::priority_level,
    false,
    '14:00:00',
    3,
    NULL,
    'Restock customer-facing areas',
    false,
    NULL
  );

  -- ============================================
  -- CLOSING TASKS (5pm close)
  -- ============================================
  
  -- Closing Cleanup Group
  INSERT INTO template_items (
    template_id, title, description, priority, is_critical, due_time, sort_order,
    evidence_type, instruction, is_required, linked_group_id
  ) VALUES 
  (
    v_closing_template_id,
    'Clean Tables',
    'Clean all customer tables and chairs',
    'P1'::priority_level,
    true,
    '17:00:00',
    1,
    NULL,
    'Clean all customer tables and chairs',
    true,
    'closing_cleanup'
  ),
  (
    v_closing_template_id,
    'Mop Floors',
    'Mop all floor areas',
    'P1'::priority_level,
    true,
    '17:00:00',
    2,
    NULL,
    'Mop all floor areas',
    true,
    'closing_cleanup'
  ),
  (
    v_closing_template_id,
    'Empty Bins',
    'Empty all bins and replace liners',
    'P1'::priority_level,
    true,
    '17:00:00',
    3,
    NULL,
    'Empty all bins and replace liners',
    true,
    'closing_cleanup'
  );

  -- Final tasks
  INSERT INTO template_items (
    template_id, title, description, priority, is_critical, due_time, sort_order,
    evidence_type, instruction, is_required, linked_group_id
  ) VALUES 
  (
    v_closing_template_id,
    'Final Temp Check',
    'Record final temperature readings',
    'P1'::priority_level,
    true,
    '17:10:00',
    4,
    'numeric',
    'Record final temperature readings',
    true,
    NULL
  ),
  (
    v_closing_template_id,
    'Cash Up Till',
    'Count and record till takings',
    'P1'::priority_level,
    true,
    '17:15:00',
    5,
    'numeric',
    'Count till and record total takings',
    true,
    NULL
  ),
  (
    v_closing_template_id,
    'Lock Up',
    'Lock all doors and windows, set alarm',
    'P1'::priority_level,
    true,
    '17:20:00',
    6,
    NULL,
    'Lock all doors and windows, set alarm',
    true,
    NULL
  ),
  (
    v_closing_template_id,
    'Confirm End of Day',
    'Confirm you have completed all closing tasks',
    'P1'::priority_level,
    true,
    '17:25:00',
    7,
    'note',
    'Confirm all closing tasks complete and you are leaving',
    true,
    NULL
  );

END $$;

-- Insert task groups if they don't exist
INSERT INTO task_groups (id, name, description) VALUES
('opening_prep', 'Opening Prep', 'Get the shop ready to open'),
('safety_checks', 'Safety Checks', 'Critical safety and hygiene checks'),
('closing_cleanup', 'Closing Cleanup', 'Clean and secure the premises')
ON CONFLICT (id) DO NOTHING;

-- Add shift phases for the site
DO $$
DECLARE
  v_site_id UUID;
BEGIN
  SELECT id INTO v_site_id FROM sites LIMIT 1;
  
  IF v_site_id IS NOT NULL THEN
    DELETE FROM shift_phases WHERE site_id = v_site_id;
    
    INSERT INTO shift_phases (site_id, phase_name, start_time, end_time) VALUES
    (v_site_id, 'pre_open', '07:00:00', '08:30:00'),
    (v_site_id, 'opening', '08:30:00', '09:30:00'),
    (v_site_id, 'trading', '09:30:00', '16:00:00'),
    (v_site_id, 'closing', '16:00:00', '17:30:00'),
    (v_site_id, 'closed', '17:30:00', '07:00:00');
  END IF;
END $$;

-- Verify the data
SELECT 
  t.template_type,
  ti.sort_order,
  ti.title,
  ti.due_time,
  ti.priority,
  ti.is_critical,
  ti.is_required,
  ti.linked_group_id,
  ti.instruction
FROM template_items ti
JOIN templates t ON t.id = ti.template_id
ORDER BY t.template_type, ti.sort_order;
