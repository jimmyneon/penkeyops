-- Add sample checklist templates and tasks for testing
-- IMPORTANT: First get your user ID by running: SELECT id FROM auth.users LIMIT 1;
-- Then replace 'YOUR_USER_ID' below with that ID

-- Create Opening Shift Template
INSERT INTO templates (site_id, name, template_type, is_active, description, created_by)
SELECT 
  NULL,
  name,
  template_type,
  is_active,
  description,
  (SELECT id FROM auth.users LIMIT 1) -- Uses first user in system
FROM (VALUES 
  ('Opening Checklist', 'opening', true, 'Standard opening procedures'),
  ('Mid Shift Checklist', 'mid', true, 'Mid-shift maintenance tasks'),
  ('Closing Checklist', 'closing', true, 'End of day closing procedures')
) AS t(name, template_type, is_active, description)
ON CONFLICT DO NOTHING;

-- Get template IDs (you'll need to run this and note the IDs)
-- Then add template items

-- Opening Tasks (Priority levels: P1 = Critical, P2 = Important, P3 = Standard)
INSERT INTO template_items (template_id, title, description, priority, is_critical, due_time, evidence_type, sort_order)
SELECT 
  t.id,
  item.title,
  item.description,
  item.priority::priority_level,
  item.is_critical,
  item.due_time::time,
  item.evidence_type::evidence_type,
  item.sort_order
FROM templates t
CROSS JOIN (
  VALUES 
    ('Unlock doors and disarm alarm', 'Ensure premises are secure and ready', 'P1', true, '07:00:00', 'none', 1),
    ('Turn on all lights and equipment', 'Coffee machines, ovens, fridges', 'P1', true, '07:05:00', 'none', 2),
    ('Check fridge temperatures', 'All fridges must be 0-5°C', 'P1', true, '07:15:00', 'numeric', 3),
    ('Check stock levels', 'Verify adequate stock for service', 'P2', false, '07:30:00', 'note', 4),
    ('Prepare till and cash float', 'Count float and verify amount', 'P1', true, '07:20:00', 'numeric', 5),
    ('Clean and sanitize prep areas', 'All surfaces must be clean', 'P2', false, '07:45:00', 'none', 6),
    ('Check coffee machine calibration', 'Ensure proper extraction', 'P2', false, '07:25:00', 'none', 7),
    ('Set up customer seating area', 'Tables, chairs, condiments', 'P3', false, '07:40:00', 'none', 8)
) AS item(title, description, priority, is_critical, due_time, evidence_type, sort_order)
WHERE t.template_type = 'opening';

-- Mid Shift Tasks
INSERT INTO template_items (template_id, title, description, priority, is_critical, due_time, evidence_type, sort_order)
SELECT 
  t.id,
  item.title,
  item.description,
  item.priority::priority_level,
  item.is_critical,
  item.due_time::time,
  item.evidence_type::evidence_type,
  item.sort_order
FROM templates t
CROSS JOIN (
  VALUES 
    ('Check fridge temperatures', 'Verify all fridges 0-5°C', 'P1', true, '14:30:00', 'numeric', 1),
    ('Restock customer areas', 'Milk, sugar, napkins, cups', 'P2', false, '15:00:00', 'none', 2),
    ('Clean coffee equipment', 'Grinders, steam wands, drip trays', 'P2', false, '15:30:00', 'none', 3),
    ('Check waste bins', 'Empty if over 75% full', 'P3', false, '16:00:00', 'none', 4),
    ('Wipe down tables and surfaces', 'Customer and prep areas', 'P2', false, '14:45:00', 'none', 5)
) AS item(title, description, priority, is_critical, due_time, evidence_type, sort_order)
WHERE t.template_type = 'mid';

-- Closing Tasks
INSERT INTO template_items (template_id, title, description, priority, is_critical, due_time, evidence_type, sort_order)
SELECT 
  t.id,
  item.title,
  item.description,
  item.priority::priority_level,
  item.is_critical,
  item.due_time::time,
  item.evidence_type::evidence_type,
  item.sort_order
FROM templates t
CROSS JOIN (
  VALUES 
    ('Cash up and reconcile till', 'Count cash and verify against sales', 'P1', true, '18:30:00', 'numeric', 1),
    ('Clean all equipment thoroughly', 'Coffee machines, grinders, ovens', 'P1', true, '19:00:00', 'none', 2),
    ('Check and record fridge temps', 'Final temp check before close', 'P1', true, '18:45:00', 'numeric', 3),
    ('Empty all waste bins', 'Take out all rubbish and recycling', 'P2', false, '18:50:00', 'none', 4),
    ('Mop floors', 'All customer and prep areas', 'P2', false, '19:10:00', 'none', 5),
    ('Secure all food items', 'Cover, date, and store properly', 'P1', true, '18:40:00', 'none', 6),
    ('Turn off all equipment', 'Except fridges and freezers', 'P1', true, '19:20:00', 'none', 7),
    ('Lock doors and set alarm', 'Final security check', 'P1', true, '19:30:00', 'none', 8)
) AS item(title, description, priority, is_critical, due_time, evidence_type, sort_order)
WHERE t.template_type = 'closing';

-- To create actual checklist instances for a shift session:
-- Run this AFTER starting a shift, replacing SESSION_ID with the actual shift_session.id

/*
-- Get the shift session ID first, then run:
INSERT INTO checklist_instances (shift_session_id, template_id, created_by)
SELECT 
  'SESSION_ID'::uuid,
  t.id,
  'USER_ID'::uuid
FROM templates t
WHERE t.template_type = 'opening' -- or 'mid' or 'closing' based on shift type
  AND t.is_active = true;

-- Then create checklist results for each template item:
INSERT INTO checklist_results (checklist_instance_id, template_item_id, status)
SELECT 
  ci.id,
  ti.id,
  'pending'
FROM checklist_instances ci
JOIN template_items ti ON ti.template_id = ci.template_id
WHERE ci.shift_session_id = 'SESSION_ID'::uuid
ORDER BY ti.display_order;
*/
