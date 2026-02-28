-- Create "Start Shift" task as the first task of every shift
-- This should be the very first task shown in the NOW card

DO $$
DECLARE
  v_opening_template_id UUID;
  v_mid_template_id UUID;
  v_closing_template_id UUID;
BEGIN
  -- Get template IDs
  SELECT id INTO v_opening_template_id FROM templates WHERE name = 'Opening Checklist' LIMIT 1;
  SELECT id INTO v_mid_template_id FROM templates WHERE name = 'Mid Shift Checklist' LIMIT 1;
  SELECT id INTO v_closing_template_id FROM templates WHERE name = 'Closing Checklist' LIMIT 1;

  -- Add Start Shift task to opening template (very first task, sort_order 0)
  IF v_opening_template_id IS NOT NULL THEN
    INSERT INTO template_items (
      template_id,
      title,
      instruction,
      due_time,
      grace_period_minutes,
      priority,
      is_critical,
      sort_order
    ) VALUES (
      v_opening_template_id,
      'Start Shift',
      'Confirm you have arrived and are ready to begin your shift',
      '08:30:00'::TIME,
      30,
      'P1'::priority_level,
      true,
      0  -- First task
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- Add Start Shift task to mid template
  IF v_mid_template_id IS NOT NULL THEN
    INSERT INTO template_items (
      template_id,
      title,
      instruction,
      due_time,
      grace_period_minutes,
      priority,
      is_critical,
      sort_order
    ) VALUES (
      v_mid_template_id,
      'Start Shift',
      'Confirm you have arrived and are ready to begin your shift',
      '14:00:00'::TIME,
      30,
      'P1'::priority_level,
      true,
      0  -- First task
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- Add Start Shift task to closing template
  IF v_closing_template_id IS NOT NULL THEN
    INSERT INTO template_items (
      template_id,
      title,
      instruction,
      due_time,
      grace_period_minutes,
      priority,
      is_critical,
      sort_order
    ) VALUES (
      v_closing_template_id,
      'Start Shift',
      'Confirm you have arrived and are ready to begin your shift',
      '16:00:00'::TIME,
      30,
      'P1'::priority_level,
      true,
      0  -- First task
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RAISE NOTICE 'Start Shift tasks created successfully';
END $$;
