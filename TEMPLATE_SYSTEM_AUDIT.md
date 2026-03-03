# Template System Audit & Recommendations

## Current System Architecture

### How It Works Now

**Templates are split by "shift type":**
- `opening` template → Morning tasks (8:30am - 9:30am)
- `mid` template → Operational/afternoon tasks (9:30am - 4pm)
- `closing` template → End of day tasks (4pm - 5:30pm)

**The Problem:**
1. Each template can have its own "End Day" task
2. Templates are tied to `shift_sessions` which have a `shift_type` field
3. The system tries to end the shift after each template completes
4. This creates **premature shift endings** when you finish one template but still have tasks in another

### Why This Exists

Looking at the migrations, this was designed for:
- **Phase-based filtering** (migration 007): Different tasks show up at different times of day
- **Shift handovers**: Originally designed for multiple shifts per day (morning crew → evening crew)
- **Template reusability**: Same template could be used for different shift types

### What's Actually Happening

**Your Current Flow:**
1. Staff starts shift → creates ONE `shift_session`
2. System instantiates ALL templates (opening, mid, closing)
3. Tasks from all templates are active simultaneously
4. When opening tasks complete → system sees "End Day" in opening template → tries to end shift
5. But mid/closing tasks still pending → `can_end_day()` returns false
6. You get stuck: "0 remaining tasks" (because End Day is excluded) but can't end

## The Core Issue

**You don't need multiple templates per shift.**

You have ONE continuous shift from open to close. The template system is creating artificial boundaries that don't match your operational reality.

## Recommended Solution

### Option 1: Single Template Per Site (RECOMMENDED)

**Simplify to ONE template:**
- Remove `opening`, `mid`, `closing` distinction
- One "Daily Operations" template with all tasks in `sort_order`
- Tasks naturally flow from morning → afternoon → closing
- Only ONE "End Day" task at the very end

**Benefits:**
- No premature shift endings
- Simpler to understand and maintain
- Tasks flow naturally by time/priority
- Resolver works as designed

**Migration Required:**
```sql
-- Consolidate all templates into one per site
-- Keep task ordering via sort_order and due_time
-- Remove template_type dependency from resolver
```

### Option 2: Keep Templates, Fix End Day Logic

**Keep current structure but:**
- Remove "End Day" tasks from individual templates
- Add ONE system-level "End Day" action (not in any template)
- `can_end_day()` checks ALL templates are complete
- Resolver only shows End Day when ALL templates done

**Benefits:**
- Preserves template organization
- Fixes the stuck state issue
- Allows phase-based filtering to work

**Drawbacks:**
- More complex logic
- Still have artificial shift boundaries
- Harder to maintain

### Option 3: Templates as Categories (MIDDLE GROUND)

**Reframe templates as task categories:**
- Templates become "Opening Tasks", "Operational Tasks", "Closing Tasks"
- All instantiated at shift start
- No "End Day" in templates
- ONE system "End Day" action after all categories complete
- Tasks show based on time + priority (not template type)

**Benefits:**
- Organizational clarity (tasks grouped logically)
- No premature endings
- Simpler than current system
- More flexible than single template

## Immediate Fix Needed

**Right now, you need to:**

1. **Run the migration:**
```bash
# In Supabase SQL Editor
\i supabase/migrations/015_fix_resolver_ordering.sql
```

This creates the `can_end_day()` function that's currently 404ing.

2. **Remove duplicate "End Day" tasks:**
```sql
-- Find all End Day tasks
SELECT t.name, t.template_type, ti.title, ti.sort_order
FROM template_items ti
JOIN templates t ON t.id = ti.template_id
WHERE ti.title ILIKE '%end%day%' OR ti.title ILIKE '%confirm%end%';

-- Keep only ONE End Day task (in closing template)
-- Delete others
DELETE FROM template_items
WHERE id IN (
  SELECT ti.id
  FROM template_items ti
  JOIN templates t ON t.id = ti.template_id
  WHERE (ti.title ILIKE '%end%day%' OR ti.title ILIKE '%confirm%end%')
    AND t.template_type != 'closing'
);
```

3. **Verify shift_session doesn't auto-complete:**
```sql
-- Check if any logic auto-completes sessions
SELECT * FROM shift_sessions 
WHERE started_at::DATE = CURRENT_DATE
ORDER BY started_at DESC;
```

## Long-Term Recommendation

**Simplify to Option 1: Single Template**

The template splitting is adding complexity without clear benefit. Your operation is:
- One shift per day
- Continuous flow from open to close
- Tasks naturally ordered by time

You don't need artificial template boundaries. The resolver already handles:
- Time-based ordering (due_time)
- Priority bands (P1/P2/P3)
- Critical flags
- Stable sort_order

**Next Steps:**
1. Run migration 015 (fixes immediate issue)
2. Remove duplicate End Day tasks
3. Test current flow
4. Plan template consolidation for cleaner long-term solution

## Questions to Answer

Before consolidating, clarify:
1. **Do you ever have multiple shifts per day?** (morning crew → evening crew)
2. **Do different staff handle different parts of the day?**
3. **Do you need to track completion of "opening" vs "closing" separately?**
4. **Is there value in seeing tasks grouped by opening/operational/closing?**

If all answers are "no", then **single template is the way forward**.
