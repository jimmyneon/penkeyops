-- Create End of Day task that appears at 5pm and goes red at 5:30pm
-- This should be the final task of every shift

DO $$
DECLARE
  v_template_id UUID;
  v_site_id UUID;
  v_admin_id UUID;
BEGIN
  -- Get a site (assuming you have at least one)
  SELECT id INTO v_site_id FROM sites LIMIT 1;
  
  -- Get an admin user for created_by
  SELECT id INTO v_admin_id FROM users WHERE role = 'admin' LIMIT 1;
  
  -- If no admin, use any user
  IF v_admin_id IS NULL THEN
    SELECT id INTO v_admin_id FROM users LIMIT 1;
  END IF;
  
  -- Get or create a closing template
  SELECT id INTO v_template_id 
  FROM templates 
  WHERE name = 'Closing Checklist' 
  AND site_id = v_site_id
  LIMIT 1;
  
  IF v_template_id IS NULL THEN
    INSERT INTO templates (site_id, name, description, template_type, is_active, created_by)
    VALUES (v_site_id, 'Closing Checklist', 'End of day closing tasks', 'closing', true, v_admin_id)
    RETURNING id INTO v_template_id;
  END IF;
  
  -- Check if End of Day task already exists
  IF NOT EXISTS (
    SELECT 1 FROM template_items 
    WHERE template_id = v_template_id 
    AND title = 'End of Day'
  ) THEN
    -- Create the End of Day task
    INSERT INTO template_items (
      template_id,
      title,
      description,
      due_time,
      grace_period_minutes,
      priority,
      is_critical,
      evidence_type,
      sort_order
    ) VALUES (
      v_template_id,
      'End of Day',
      'Complete your shift and review the day''s performance. This can only be done after 5:00 PM.',
      '17:00:00'::TIME,  -- Due at 5:00 PM
      30,                 -- 30 minute grace period (goes red at 5:30 PM)
      'P3',              -- Low priority so it comes last
      false,             -- Not critical
      'none',            -- No evidence needed
      9999               -- Very high sort order so it's always last
    );
    
    RAISE NOTICE 'End of Day task created successfully';
  ELSE
    RAISE NOTICE 'End of Day task already exists';
  END IF;
END $$;
