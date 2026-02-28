-- Create example grouped tasks for Opening shift
-- This demonstrates the grouped task feature

-- 1. Create a task group for "Opening Setup"
INSERT INTO task_groups (id, name, description)
VALUES (
  'opening-setup-group',
  'Opening Setup',
  'Initial tasks when arriving to open the site'
)
ON CONFLICT (id) DO NOTHING;

-- 2. Find the Opening Checklist template ID
-- (Replace with actual template_id after running this query)
SELECT id, name FROM templates WHERE name = 'Opening Checklist';

-- 3. Add grouped microtasks to Opening Checklist
-- Replace 'YOUR_OPENING_TEMPLATE_ID' with the actual ID from query 2

-- Example grouped tasks for "Opening Setup":
INSERT INTO template_items (
  template_id,
  title,
  description,
  sort_order,
  priority,
  is_required,
  is_critical,
  linked_group_id,
  due_time
) VALUES
-- Microtask 1: Unlock doors
(
  'YOUR_OPENING_TEMPLATE_ID',
  'Unlock Front Door',
  'Unlock main entrance',
  1,
  'P1',
  true,
  false,
  'opening-setup-group',
  '08:15:00'
),
-- Microtask 2: Turn on lights
(
  'YOUR_OPENING_TEMPLATE_ID',
  'Turn On Lights',
  'Turn on all interior lights',
  2,
  'P1',
  true,
  false,
  'opening-setup-group',
  '08:15:00'
),
-- Microtask 3: Disable alarm
(
  'YOUR_OPENING_TEMPLATE_ID',
  'Disable Alarm System',
  'Enter code and disable alarm',
  3,
  'P1',
  true,
  true,
  'opening-setup-group',
  '08:15:00'
),
-- Microtask 4: Turn on equipment
(
  'YOUR_OPENING_TEMPLATE_ID',
  'Power On Equipment',
  'Turn on computers, POS, etc.',
  4,
  'P1',
  true,
  false,
  'opening-setup-group',
  '08:15:00'
),
-- Microtask 5: Check temperature
(
  'YOUR_OPENING_TEMPLATE_ID',
  'Check HVAC',
  'Verify heating/cooling is working',
  5,
  'P2',
  false,
  false,
  'opening-setup-group',
  '08:15:00'
);

-- 4. Verify the group was created
SELECT 
  tg.name as group_name,
  ti.title as task_title,
  ti.sort_order,
  ti.is_required
FROM template_items ti
JOIN task_groups tg ON tg.id = ti.linked_group_id
WHERE ti.linked_group_id = 'opening-setup-group'
ORDER BY ti.sort_order;

-- INSTRUCTIONS:
-- 1. Run query 2 to get the Opening Checklist template ID
-- 2. Replace 'YOUR_OPENING_TEMPLATE_ID' in the INSERT statements
-- 3. Run the INSERT statements to create the grouped tasks
-- 4. Run query 4 to verify
-- 5. Create a new opening shift session to see the grouped task in action
