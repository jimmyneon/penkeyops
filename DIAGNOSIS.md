# Task Completion Issues - Diagnosis

## Problem 1: Only 24 Tasks Instead of 72

**Possible Causes:**
1. Templates in database only have 24 items total
2. Only 1 template is active (others are `is_active = false`)
3. Template instantiation is only loading one template
4. Some templates failed to instantiate

**Check:** Run `CHECK_TASK_COUNT.sql` to see:
- Total template_items count
- How many templates are active
- How many tasks instantiated for today's session

## Problem 2: Task Completions Reset on Refresh

**The Code Flow:**
1. User clicks task → `UPDATE checklist_results SET status = 'completed'` (line 400-406 in NowCard.tsx)
2. Update succeeds (logs show "Task marked complete successfully")
3. User refreshes browser
4. Tasks appear as pending again

**Possible Causes:**

### A) New Session Created on Each Refresh
The `autoCreateSession` function (page.tsx lines 42-91) runs on every page load:
- Checks if `activeSession` exists for today
- If no active session → creates new one
- **If it's creating a NEW session each time**, that would explain why tasks reset

**The Hook Query:**
```typescript
// From useShiftSession hook
.eq('is_complete', false)
.gte('started_at', today.toISOString())
```

**Issue:** If the session's `started_at` is being set to a timestamp, not just a date, then:
- Session created at 6:00pm has `started_at = '2026-03-03T18:00:00'`
- Query checks `started_at >= '2026-03-03T00:00:00'` ✓ (matches)
- BUT if session gets marked complete or something changes `started_at`...
- OR if multiple sessions exist for today, it might pick the wrong one

### B) Browser Cache Issue
- Hard refresh needed (Cmd+Shift+R on Mac)
- Service worker caching old data

### C) Database Update Failing Silently
- RLS policies blocking updates
- Transaction rollback
- But logs show success, so unlikely

## Most Likely Issue: Session ID Changing

Look at the console logs from the user:
```
[Log] Loading NOW action for session: "1d805ada-b8af-40b4-9a60-daa3d04d202d"
...
[Log] Loading NOW action for session: "be8ee0d8-2cda-4156-898c-8b4363bb565c"
```

**THE SESSION ID CHANGED!** 

From `1d805ada...` to `be8ee0d8...` - this means a NEW session was created, which would have all fresh pending tasks.

## Solution

Need to check:
1. Why is a new session being created?
2. Is the old session being marked complete incorrectly?
3. Is `useShiftSession` hook returning the wrong session?

**Next Steps:**
1. Run `CHECK_TASK_COUNT.sql` to see session details
2. Check what's triggering new session creation
3. Verify session completion logic
