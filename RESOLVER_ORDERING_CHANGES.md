# Resolver Ordering Changes - Migration 015

## Summary
Fixed resolver ordering for stable, predictable behavior as requested. The system now has deterministic ordering that doesn't reshuffle chaotically, and Opening/Closing are properly positioned.

## Key Changes

### 1. Stable Overdue Ordering (Priority Bands + sort_order)
**Problem**: Tasks were being sorted by `overdue_minutes`, causing constant reshuffling as tasks got more overdue.

**Solution**: Overdue tasks now use priority bands with stable `sort_order` within each band:
- **Band 1**: Overdue P1 CRITICAL → sorted by `sort_order`
- **Band 2**: Overdue P1 → sorted by `sort_order`
- **Band 3**: Overdue P2 → sorted by `sort_order`
- **Band 4**: Overdue P3 → sorted by `sort_order`

This means if tasks 5, 7, and 12 are all overdue P2, they will always appear in order 5 → 7 → 12, regardless of how many minutes overdue they are.

### 2. Start Opening - Forced First
**Problem**: Opening tasks competed with other tasks in the resolver.

**Solution**: 
- New system action type: `'start_opening'`
- Resolver checks if `shift_session.started_at IS NULL`
- If session not started, returns Start Opening action immediately
- UI shows dedicated Start Opening card with 🌅 icon
- Clicking "START OPENING" button marks session as started
- Then normal task flow begins

### 3. End Day - Conditional System Action
**Problem**: "End Day" task appeared in resolver and could jump ahead of other tasks.

**Solution**:
- **Removed from resolver entirely** - all queries filter out tasks with title containing "end day" or "confirm end"
- New `can_end_day(session_id)` function checks if all required/critical tasks are complete
- UI checks this function after every task update
- Shows **End Day button** only when `can_end_day() = true`
- Shows **"Almost There"** message with incomplete count if tasks remain

### 4. End Day Requirements
The `can_end_day()` function returns `true` when:
- All `is_required = true` tasks are completed (excluding End Day itself)
- All `is_critical = true` tasks are completed (excluding End Day itself)

## Files Changed

### Migration: `supabase/migrations/015_fix_resolver_ordering.sql`
- Creates `can_end_day(p_session_id UUID)` function
- Replaces `resolve_now_action()` with new stable ordering logic
- Adds session started check for Start Opening
- Excludes End Day from all resolver queries

### UI: `components/staff/NowCard.tsx`
- Added `EndDayStatus` interface
- Added `endDayStatus` state
- Added `checkEndDayStatus()` function
- Handles `'start_opening'` action type
- Shows End Day button when `can_end_day = true`
- Shows incomplete task count when `can_end_day = false`

## Testing Checklist

### Before Running Migration
1. Note current resolver behavior with overdue tasks
2. Check if End Day appears mid-shift

### After Running Migration
1. **Start Opening**:
   - [ ] Create new session (don't start it)
   - [ ] Dashboard should show "Start Opening" card
   - [ ] Click "START OPENING" button
   - [ ] First actual task should appear

2. **Stable Overdue Ordering**:
   - [ ] Let multiple tasks become overdue
   - [ ] Note the order they appear
   - [ ] Wait 10+ minutes
   - [ ] Order should remain stable (not reshuffle)

3. **End Day Positioning**:
   - [ ] Complete all tasks except End Day
   - [ ] End Day should NOT appear in NOW card
   - [ ] Should show "Almost There" or "Ready to End Day"
   - [ ] Complete remaining required/critical tasks
   - [ ] Should show "Ready to End Day" button
   - [ ] Click "END DAY" button
   - [ ] Should trigger end of shift flow

4. **Priority Bands**:
   - [ ] Create mix of P1, P2, P3 tasks with different due times
   - [ ] Let them all become overdue
   - [ ] Verify order: P1 CRITICAL → P1 → P2 → P3
   - [ ] Within each band, verify sort_order is respected

## Migration Instructions

Run in Supabase SQL Editor:
```sql
-- Run this migration
\i supabase/migrations/015_fix_resolver_ordering.sql
```

Or via Supabase CLI:
```bash
supabase db push
```

## Rollback (if needed)

If issues occur, you can rollback by running the previous resolver version:
```sql
-- Restore from migration 013
\i supabase/migrations/013_recurring_task_spawning.sql
```

## Notes

- **Never_goes_red tasks** (recurring rhythm tasks) are still excluded from overdue bands
- **End Day tasks** are identified by title matching `%end%day%` or `%confirm%end%`
- **Sort_order** is the primary driver for normal flow (95% of time)
- **Priority** is only used for tie-breaking when tasks are overdue or due at same time
- **Start Opening** only appears when `started_at IS NULL` on the session
- **End Day** requirements can be adjusted by modifying `can_end_day()` function
