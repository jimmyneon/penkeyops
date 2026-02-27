-- ============================================
-- COMPREHENSIVE CAFE TEST DATA
-- ~50 realistic tasks throughout the day
-- ============================================

-- Clear existing data (order matters - shift_sessions cascades to checklist_results)
DELETE FROM shift_sessions;
DELETE FROM template_items;

-- Get template IDs
DO $$
DECLARE
  v_opening_template_id UUID;
  v_mid_template_id UUID;
  v_closing_template_id UUID;
BEGIN
  SELECT id INTO v_opening_template_id FROM templates WHERE template_type = 'opening' LIMIT 1;
  SELECT id INTO v_mid_template_id FROM templates WHERE template_type = 'mid' LIMIT 1;
  SELECT id INTO v_closing_template_id FROM templates WHERE template_type = 'closing' LIMIT 1;

  -- ============================================
  -- OPENING TASKS (8:00 AM - 9:30 AM)
  -- ============================================
  
  INSERT INTO template_items (template_id, sort_order, title, description, due_time, priority, is_critical, is_required) VALUES
  -- Critical start tasks
  (v_opening_template_id, 1, 'Confirm Start of Day', 'Tap to confirm you have arrived and are ready to begin opening', '08:30:00', 'P1', true, true),
  (v_opening_template_id, 2, 'Unlock Front Door', 'Unlock and secure front entrance', '08:35:00', 'P1', true, true),
  (v_opening_template_id, 3, 'Disable Alarm System', 'Enter code and disable building alarm', '08:35:00', 'P1', true, true),
  
  -- Equipment startup
  (v_opening_template_id, 4, 'Turn On Coffee Machine', 'Power on espresso machine and wait for warm-up', '08:40:00', 'P1', true, true),
  (v_opening_template_id, 5, 'Turn On Grinder', 'Power on coffee grinder', '08:40:00', 'P1', false, true),
  (v_opening_template_id, 6, 'Fill Water Reservoir', 'Check and fill coffee machine water reservoir', '08:45:00', 'P2', false, true),
  (v_opening_template_id, 7, 'Turn On Oven', 'Preheat oven to 180°C for pastries', '08:45:00', 'P1', false, true),
  (v_opening_template_id, 8, 'Turn On Display Fridge', 'Power on front display refrigerator', '08:45:00', 'P2', false, true),
  
  -- Food prep
  (v_opening_template_id, 9, 'Stock Pastry Display', 'Fill display case with fresh pastries from kitchen', '08:50:00', 'P1', false, true),
  (v_opening_template_id, 10, 'Prepare Sandwich Fillings', 'Set up sandwich station with fillings', '08:50:00', 'P2', false, true),
  (v_opening_template_id, 11, 'Stock Milk Fridge', 'Ensure adequate milk supply for the day', '08:55:00', 'P1', false, true),
  (v_opening_template_id, 12, 'Prepare Syrups Station', 'Stock and organize flavor syrups', '08:55:00', 'P2', false, false),
  
  -- Front of house
  (v_opening_template_id, 13, 'Clean Coffee Machine', 'Wipe down and clean espresso machine exterior', '09:00:00', 'P2', false, true),
  (v_opening_template_id, 14, 'Stock Cups and Lids', 'Ensure all cup sizes and lids are stocked', '09:00:00', 'P2', false, true),
  (v_opening_template_id, 15, 'Fill Napkin Dispensers', 'Refill all napkin holders', '09:05:00', 'P3', false, false),
  (v_opening_template_id, 16, 'Wipe Down Tables', 'Clean all customer tables and chairs', '09:05:00', 'P2', false, true),
  (v_opening_template_id, 17, 'Sweep Front Area', 'Sweep entrance and customer seating area', '09:10:00', 'P2', false, true),
  (v_opening_template_id, 18, 'Set Up Till', 'Count float and prepare cash register', '09:15:00', 'P1', true, true),
  (v_opening_template_id, 19, 'Turn On Music', 'Start background music at appropriate volume', '09:20:00', 'P3', false, false),
  (v_opening_template_id, 20, 'Unlock Customer Door', 'Open for business at 9:30 AM', '09:30:00', 'P1', true, true);

  -- ============================================
  -- MID-DAY TASKS (9:30 AM - 4:00 PM)
  -- ============================================
  
  INSERT INTO template_items (template_id, sort_order, title, description, due_time, priority, is_critical, is_required) VALUES
  -- Morning checks (10:00-11:00)
  (v_mid_template_id, 1, 'Morning Temperature Check', 'Record fridge and freezer temperatures', '10:00:00', 'P1', true, true),
  (v_mid_template_id, 2, 'Check Stock Levels', 'Review inventory and note items running low', '10:15:00', 'P2', false, true),
  (v_mid_template_id, 3, 'Wipe Down Tables', 'Clean all customer tables', '10:30:00', 'P2', false, true),
  (v_mid_template_id, 4, 'Restock Pastry Display', 'Refill display with fresh items', '10:45:00', 'P2', false, true),
  (v_mid_template_id, 5, 'Clean Coffee Machine (Mid)', 'Backflush and clean group heads', '11:00:00', 'P1', false, true),
  (v_mid_template_id, 6, 'Refill Milk Fridge', 'Check and restock milk supply', '11:00:00', 'P2', false, true),
  
  -- Pre-lunch prep (11:00-12:00)
  (v_mid_template_id, 7, 'Prepare Lunch Specials', 'Set up daily lunch special ingredients', '11:15:00', 'P1', false, true),
  (v_mid_template_id, 8, 'Restock Sandwich Bar', 'Refill sandwich ingredients', '11:30:00', 'P2', false, true),
  (v_mid_template_id, 9, 'Check Salad Prep', 'Prepare fresh salads for lunch service', '11:45:00', 'P2', false, true),
  (v_mid_template_id, 10, 'Wipe Counters', 'Clean all work surfaces', '12:00:00', 'P2', false, true),
  
  -- Lunch service (12:00-14:00)
  (v_mid_template_id, 11, 'Restock Cups and Lids', 'Refill cup dispensers for lunch rush', '12:15:00', 'P2', false, true),
  (v_mid_template_id, 12, 'Empty Bins (Lunch)', 'Clear bins before lunch rush', '12:30:00', 'P2', false, true),
  (v_mid_template_id, 13, 'Midday Temperature Check', 'Record fridge and freezer temperatures', '13:00:00', 'P1', true, true),
  (v_mid_template_id, 14, 'Restock Pastries (Lunch)', 'Refill pastry display mid-service', '13:15:00', 'P2', false, true),
  (v_mid_template_id, 15, 'Wipe Tables (Lunch)', 'Clear and clean tables during lunch', '13:30:00', 'P2', false, true),
  
  -- Post-lunch cleanup (14:00-15:00)
  (v_mid_template_id, 16, 'Clean Tables (Post-Lunch)', 'Deep clean all tables after lunch rush', '14:00:00', 'P2', false, true),
  (v_mid_template_id, 17, 'Wash Lunch Dishes', 'Clean all lunch service dishes', '14:15:00', 'P1', false, true),
  (v_mid_template_id, 18, 'Restock Cups', 'Refill cup dispensers', '14:30:00', 'P2', false, true),
  (v_mid_template_id, 19, 'Empty All Bins', 'Empty all customer and kitchen bins', '14:30:00', 'P2', false, true),
  (v_mid_template_id, 20, 'Mop Floors', 'Mop customer area and behind counter', '14:45:00', 'P2', false, true),
  
  -- Afternoon tasks (15:00-16:00)
  (v_mid_template_id, 21, 'Restock Milk', 'Check milk levels for afternoon service', '15:00:00', 'P2', false, true),
  (v_mid_template_id, 22, 'Clean Display Fridge', 'Wipe down display fridge glass', '15:15:00', 'P2', false, true),
  (v_mid_template_id, 23, 'Afternoon Temperature Check', 'Record fridge and freezer temperatures', '15:30:00', 'P1', true, true),
  (v_mid_template_id, 24, 'Check Cleaning Schedule', 'Review and complete any scheduled deep cleaning', '15:45:00', 'P2', false, true),
  (v_mid_template_id, 25, 'Prepare for Closing', 'Begin organizing for end of day procedures', '15:55:00', 'P2', false, true);

  -- ============================================
  -- CLOSING TASKS (4:00 PM - 5:00 PM)
  -- All tasks must be completed by 5:00 PM
  -- ============================================
  
  INSERT INTO template_items (template_id, sort_order, title, description, due_time, priority, is_critical, is_required) VALUES
  -- Start closing prep
  (v_closing_template_id, 1, 'Begin Closing Procedures', 'Start closing tasks at 4:00 PM', '16:00:00', 'P1', false, true),
  (v_closing_template_id, 2, 'Store Pastries', 'Wrap and refrigerate remaining pastries', '16:05:00', 'P2', false, true),
  (v_closing_template_id, 3, 'Store Sandwich Fillings', 'Cover and refrigerate all sandwich ingredients', '16:10:00', 'P1', false, true),
  (v_closing_template_id, 4, 'Check Food Waste', 'Record and dispose of expired items', '16:15:00', 'P2', false, true),
  
  -- Cleaning while still open
  (v_closing_template_id, 5, 'Wash All Dishes', 'Clean and put away all dishes and utensils', '16:20:00', 'P1', false, true),
  (v_closing_template_id, 6, 'Clean Counters', 'Wipe down all work surfaces with sanitizer', '16:25:00', 'P1', false, true),
  (v_closing_template_id, 7, 'Empty All Bins', 'Take out all rubbish and recycling', '16:30:00', 'P1', false, true),
  (v_closing_template_id, 8, 'Wipe Display Fridge', 'Clean display fridge interior and exterior', '16:35:00', 'P2', false, true),
  
  -- Equipment shutdown
  (v_closing_template_id, 9, 'Turn Off Coffee Machine', 'Shut down espresso machine properly', '16:40:00', 'P1', false, true),
  (v_closing_template_id, 10, 'Clean Coffee Machine (Close)', 'Deep clean group heads and steam wand', '16:40:00', 'P1', false, true),
  (v_closing_template_id, 11, 'Empty Grinder', 'Remove remaining beans and clean grinder', '16:42:00', 'P2', false, true),
  (v_closing_template_id, 12, 'Turn Off Oven', 'Ensure oven is off and cooling', '16:45:00', 'P1', true, true),
  
  -- Final cleaning
  (v_closing_template_id, 13, 'Clean Tables (Final)', 'Wipe all customer tables and stack chairs', '16:48:00', 'P2', false, true),
  (v_closing_template_id, 14, 'Sweep and Mop', 'Complete floor cleaning throughout cafe', '16:50:00', 'P1', false, true),
  (v_closing_template_id, 15, 'Final Temperature Check', 'Record final fridge and freezer temperatures', '16:52:00', 'P1', true, true),
  
  -- Final checks and close
  (v_closing_template_id, 16, 'Count Till', 'Count cash and prepare banking', '16:54:00', 'P1', true, true),
  (v_closing_template_id, 17, 'Check All Equipment Off', 'Verify all equipment is powered down', '16:56:00', 'P1', true, true),
  (v_closing_template_id, 18, 'Turn Off Lights', 'Switch off all non-essential lighting', '16:57:00', 'P2', false, true),
  (v_closing_template_id, 19, 'Set Alarm', 'Activate building alarm system', '16:58:00', 'P1', true, true),
  (v_closing_template_id, 20, 'Lock Up', 'Secure all doors and exit building', '16:59:00', 'P1', true, true),
  (v_closing_template_id, 21, 'Confirm End of Day', 'Tap to confirm all closing tasks complete', '17:00:00', 'P1', true, true);

END $$;

-- Verify task count
SELECT 
  t.template_type,
  COUNT(*) as task_count
FROM template_items ti
JOIN templates t ON t.id = ti.template_id
GROUP BY t.template_type
ORDER BY t.template_type;

-- Show sample tasks by time
SELECT 
  t.template_type,
  ti.due_time,
  ti.title,
  ti.priority,
  ti.is_critical
FROM template_items ti
JOIN templates t ON t.id = ti.template_id
ORDER BY t.template_type, ti.due_time
LIMIT 20;
