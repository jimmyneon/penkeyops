-- Seed script for Penkey Ops
-- Run this in Supabase SQL Editor after running migrations

-- Create a test site
INSERT INTO sites (id, name, address, timezone) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'Penkey Café - Main', '123 High Street, London', 'Europe/London')
ON CONFLICT (id) DO NOTHING;

-- Create test users (these will be created automatically on first login, but we can pre-create them)
-- Note: Users need to actually log in via magic link to get their auth.users entry created
-- This just creates the profile entries

-- Admin user
INSERT INTO users (id, email, full_name, role, site_id, is_active) VALUES
('admin-user-id-000000000000000000', 'admin@penkeyops.com', 'Admin User', 'admin', '550e8400-e29b-41d4-a716-446655440000', true)
ON CONFLICT (id) DO NOTHING;

-- Staff users
INSERT INTO users (id, email, full_name, role, site_id, is_active) VALUES
('staff-user-id-111111111111111111', 'alice@penkeyops.com', 'Alice Smith', 'staff', '550e8400-e29b-41d4-a716-446655440000', true),
('staff-user-id-222222222222222222', 'bob@penkeyops.com', 'Bob Jones', 'staff', '550e8400-e29b-41d4-a716-446655440000', true),
('staff-user-id-333333333333333333', 'charlie@penkeyops.com', 'Charlie Brown', 'staff', '550e8400-e29b-41d4-a716-446655440000', true)
ON CONFLICT (id) DO NOTHING;

-- Create opening checklist template
INSERT INTO templates (id, site_id, name, description, template_type, created_by, is_active) VALUES
('template-opening-00000000000000', '550e8400-e29b-41d4-a716-446655440000', 'Morning Opening Checklist', 'Daily opening tasks for café', 'opening', 'admin-user-id-000000000000000000', true)
ON CONFLICT (id) DO NOTHING;

-- Opening checklist items
INSERT INTO template_items (template_id, title, description, priority, is_critical, due_time, grace_period_minutes, evidence_type, sort_order) VALUES
('template-opening-00000000000000', 'Unlock front door', 'Unlock and open the main entrance', 'P1', true, '08:00', 0, 'none', 0),
('template-opening-00000000000000', 'Turn on all lights', 'Switch on interior and exterior lighting', 'P1', true, '08:00', 5, 'none', 1),
('template-opening-00000000000000', 'Check fridge temperature', 'Record temperature of main fridge (should be 0-5°C)', 'P1', true, '08:15', 15, 'numeric', 2),
('template-opening-00000000000000', 'Turn on coffee machines', 'Start all espresso machines and grinders', 'P1', true, '08:00', 10, 'none', 3),
('template-opening-00000000000000', 'Check display cabinet', 'Ensure display is clean and stocked', 'P2', false, '08:30', 30, 'photo', 4),
('template-opening-00000000000000', 'Count cash float', 'Verify opening cash float matches expected amount', 'P1', true, '08:00', 0, 'numeric', 5),
('template-opening-00000000000000', 'Check milk delivery', 'Verify milk delivery received and stored correctly', 'P2', false, '08:30', 60, 'note', 6),
('template-opening-00000000000000', 'Wipe down tables', 'Clean all customer tables and chairs', 'P2', false, '08:45', 30, 'none', 7)
ON CONFLICT DO NOTHING;

-- Create closing checklist template
INSERT INTO templates (id, site_id, name, description, template_type, created_by, is_active) VALUES
('template-closing-00000000000000', '550e8400-e29b-41d4-a716-446655440000', 'Evening Closing Checklist', 'Daily closing tasks for café', 'closing', 'admin-user-id-000000000000000000', true)
ON CONFLICT (id) DO NOTHING;

-- Closing checklist items
INSERT INTO template_items (template_id, title, description, priority, is_critical, due_time, grace_period_minutes, evidence_type, sort_order) VALUES
('template-closing-00000000000000', 'Clean coffee machines', 'Full clean and backflush of espresso machines', 'P1', true, '18:00', 30, 'none', 0),
('template-closing-00000000000000', 'Empty and clean grinders', 'Remove beans, clean grinders thoroughly', 'P1', true, '18:00', 30, 'none', 1),
('template-closing-00000000000000', 'Check fridge temperature', 'Record evening fridge temperature', 'P1', true, '18:30', 15, 'numeric', 2),
('template-closing-00000000000000', 'Clean all surfaces', 'Wipe down counters, tables, and equipment', 'P2', false, '18:30', 30, 'none', 3),
('template-closing-00000000000000', 'Mop floors', 'Sweep and mop all floor areas', 'P2', false, '18:45', 30, 'none', 4),
('template-closing-00000000000000', 'Take out trash', 'Empty all bins and take to outside bins', 'P2', false, '19:00', 15, 'none', 5),
('template-closing-00000000000000', 'Count cash and prepare deposit', 'Count till, prepare bank deposit', 'P1', true, '19:00', 0, 'numeric', 6),
('template-closing-00000000000000', 'Turn off all equipment', 'Switch off coffee machines, ovens, etc.', 'P1', true, '19:15', 0, 'none', 7),
('template-closing-00000000000000', 'Turn off lights', 'Switch off all interior lights', 'P1', true, '19:20', 0, 'none', 8),
('template-closing-00000000000000', 'Lock doors and set alarm', 'Secure premises and activate alarm system', 'P1', true, '19:30', 0, 'none', 9)
ON CONFLICT DO NOTHING;

-- Create cleaning checklist template
INSERT INTO templates (id, site_id, name, description, template_type, created_by, is_active) VALUES
('template-cleaning-00000000000000', '550e8400-e29b-41d4-a716-446655440000', 'Deep Clean Checklist', 'Weekly deep cleaning tasks', 'cleaning', 'admin-user-id-000000000000000000', true)
ON CONFLICT (id) DO NOTHING;

-- Cleaning checklist items
INSERT INTO template_items (template_id, title, description, priority, is_critical, due_time, grace_period_minutes, evidence_type, sort_order) VALUES
('template-cleaning-00000000000000', 'Clean behind equipment', 'Move and clean behind coffee machines and fridges', 'P2', false, '14:00', 120, 'photo', 0),
('template-cleaning-00000000000000', 'Deep clean oven', 'Full oven clean including racks', 'P2', false, '14:00', 120, 'none', 1),
('template-cleaning-00000000000000', 'Clean ventilation filters', 'Remove and clean all ventilation filters', 'P2', false, '14:30', 120, 'none', 2),
('template-cleaning-00000000000000', 'Descale coffee machines', 'Run descaling cycle on all machines', 'P1', true, '15:00', 60, 'none', 3),
('template-cleaning-00000000000000', 'Clean windows inside and out', 'Clean all customer-facing windows', 'P3', false, '15:00', 180, 'none', 4)
ON CONFLICT DO NOTHING;

-- Create safety checklist template
INSERT INTO templates (id, site_id, name, description, template_type, created_by, is_active) VALUES
('template-safety-000000000000000', '550e8400-e29b-41d4-a716-446655440000', 'Safety Check Checklist', 'Monthly safety inspection', 'safety', 'admin-user-id-000000000000000000', true)
ON CONFLICT (id) DO NOTHING;

-- Safety checklist items
INSERT INTO template_items (template_id, title, description, priority, is_critical, due_time, grace_period_minutes, evidence_type, sort_order) VALUES
('template-safety-000000000000000', 'Test fire alarm', 'Test fire alarm system and check batteries', 'P1', true, NULL, 0, 'note', 0),
('template-safety-000000000000000', 'Check fire extinguishers', 'Verify all extinguishers are in date and accessible', 'P1', true, NULL, 0, 'photo', 1),
('template-safety-000000000000000', 'Check first aid kit', 'Ensure first aid kit is stocked and in date', 'P1', true, NULL, 0, 'note', 2),
('template-safety-000000000000000', 'Inspect electrical equipment', 'Visual check of all electrical equipment for damage', 'P2', false, NULL, 0, 'note', 3),
('template-safety-000000000000000', 'Check emergency exits', 'Ensure all emergency exits are clear and accessible', 'P1', true, NULL, 0, 'photo', 4),
('template-safety-000000000000000', 'Review accident book', 'Check accident book for any unreported incidents', 'P2', false, NULL, 0, 'note', 5)
ON CONFLICT DO NOTHING;

-- Success message
SELECT 'Database seeded successfully! You can now:
1. Log in with any of the test user emails (admin@penkeyops.com, alice@penkeyops.com, etc.)
2. You will receive a magic link email to complete login
3. Start a shift and the templates will automatically create checklists
4. Test the full workflow!' as message;
