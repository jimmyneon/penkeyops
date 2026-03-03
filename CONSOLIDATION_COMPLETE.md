# ✅ Template Consolidation Complete

The system has been simplified to use a **single daily operations template** instead of splitting tasks across opening/mid/closing templates.

## What Changed

### Before
- 3 templates per site: Opening, Mid (Operational), Closing
- Each template could have "End Day" tasks
- System tried to end shift after each template
- Caused premature endings and stuck states

### After
- 1 template per site: "Daily Operations"
- All tasks in natural order by due_time and sort_order
- Only ONE "End Day" task at the very end
- Clean flow from morning → afternoon → closing

## Migration Steps (Run in Supabase)

### 1. Run Migration 016
```sql
-- In Supabase SQL Editor, run:
\i supabase/migrations/016_consolidate_templates.sql
```

This will:
- Create new "Daily Operations" template for each site
- Copy all tasks from opening/mid/closing templates
- Reorder tasks by due_time naturally
- Remove duplicate "End Day" tasks (keeps only the closing one)
- Deactivate old templates
- Update existing shift_sessions to use 'daily' shift_type
- Update resolver to remove template_type filtering

### 2. Verify the Consolidation
```sql
-- Check new daily template was created
SELECT 
  name,
  template_type,
  is_active,
  (SELECT COUNT(*) FROM template_items WHERE template_id = templates.id) as task_count
FROM templates
ORDER BY is_active DESC, template_type;

-- Should see:
-- Daily Operations | daily | true | [total task count]
-- Opening Checklist | opening | false | [old count]
-- Mid Shift Checklist | mid | false | [old count]
-- Closing Checklist | closing | false | [old count]
```

### 3. Check Task Ordering
```sql
-- Verify tasks are in correct order
SELECT 
  sort_order,
  title,
  due_time,
  priority,
  is_critical,
  is_required
FROM template_items ti
JOIN templates t ON t.id = ti.template_id
WHERE t.template_type = 'daily'
  AND t.is_active = true
ORDER BY sort_order;

-- Tasks should flow naturally from morning to evening
-- Only ONE "End Day" task at the end
```

### 4. Test New Session Creation
```sql
-- Create a test session (or just refresh your browser)
-- The system will automatically create a session with shift_type = 'daily'
-- And instantiate the single Daily Operations template

-- Check it worked:
SELECT 
  ss.id,
  ss.shift_type,
  t.name as template_name,
  t.template_type,
  COUNT(cr.id) as task_count
FROM shift_sessions ss
JOIN checklist_instances ci ON ci.shift_session_id = ss.id
JOIN templates t ON t.id = ci.template_id
LEFT JOIN checklist_results cr ON cr.checklist_instance_id = ci.id
WHERE ss.started_at::DATE = CURRENT_DATE
GROUP BY ss.id, ss.shift_type, t.name, t.template_type;

-- Should see:
-- shift_type = 'daily'
-- template_name = 'Daily Operations'
-- template_type = 'daily'
-- task_count = [all your tasks]
```

## What This Fixes

✅ **No more premature shift endings** - Only one End Day task at the very end
✅ **No more stuck states** - Can't get "0 tasks remaining" but unable to end
✅ **Simpler architecture** - One template, one flow, easy to understand
✅ **Natural task progression** - Tasks flow by time and priority throughout the day
✅ **Resolver works correctly** - No template_type filtering confusion

## Frontend Changes (Already Deployed)

- Session creation now uses `shift_type: 'daily'`
- Loads only active templates (will be single Daily Operations template)
- Removed time-based shift type detection (no longer needed)

## If You Need to Rollback

If something goes wrong, you can reactivate old templates:

```sql
-- Reactivate old templates
UPDATE templates
SET is_active = true
WHERE template_type IN ('opening', 'mid', 'closing');

-- Deactivate daily template
UPDATE templates
SET is_active = false
WHERE template_type = 'daily';
```

But you'll still have the duplicate End Day issue, so better to fix forward.

## Next Steps

1. **Run migration 016** in Supabase
2. **Refresh your browser** to create a new daily session
3. **Test the flow** - tasks should appear in natural order
4. **Verify End Day** - should only appear when all required/critical tasks complete

## Clean Up (Optional)

After confirming everything works, you can delete old templates:

```sql
-- ONLY RUN THIS AFTER CONFIRMING DAILY TEMPLATE WORKS
DELETE FROM templates
WHERE template_type IN ('opening', 'mid', 'closing')
  AND is_active = false;
```

This is permanent, so make sure the daily template is working first!
