# End-of-Day Scoring System

## Overview
Simple, deterministic scoring system (0-100) that appears **only when staff tap "End Shift"**. No live scoring during the day.

## Scoring Logic

### Starting Score
- All shifts start at **100 points**
- Penalties are subtracted based on task completion timing

### Task Status Rules

**Green (On Time)**
- `completed_at <= due_time`
- No penalty

**Amber (Grace Period)**
- `completed_at > due_time AND completed_at <= due_time + grace_minutes`
- Small penalty based on priority

**Red (Late/Missed)**
- `completed_at > due_time + grace_minutes` OR task not completed
- Larger penalty based on priority

**Blocked Tasks**
- Treated as Amber with reduced penalty
- Encourages honest reporting of issues

### Penalty Structure

| Priority | Status | Penalty |
|----------|--------|---------|
| P1 Critical | Amber | -5 |
| P1 Critical | Red/Missed | -15 |
| P2 | Amber | -2 |
| P2 | Red/Missed | -5 |
| P3 | Amber | -1 |
| P3 | Red/Missed | -2 |
| Blocked (any) | - | -1 to -3 |

Score is clamped to 0-100 range.

## Score Bands

- **90-100**: Smooth shift
- **75-89**: Needs attention
- **<75**: Risky day

## UI Display

### Summary Card Shows:
1. **Shift Score** (large, color-coded)
2. **Task Breakdown**
   - Green count (on time)
   - Amber count (grace period)
   - Red count (late/missed)
3. **Status Indicators**
   - Opening: ✓/⚠️/❌
   - Safety Logs: ✓/⚠️/❌
   - Closing: ✓/⚠️/❌
4. **Items Needing Attention** (max 5)
   - Shows late/missed tasks with details
   - Includes due time and completion time

### Actions
- **Review Tasks**: Close modal, return to dashboard
- **End Shift**: Confirm and complete shift

## Database Functions

### `calculate_shift_score(p_session_id UUID)`
Returns:
- `total_score`: 0-100
- `green_count`: Tasks completed on time
- `amber_count`: Tasks in grace period
- `red_count`: Tasks late/missed
- `total_tasks`: Total tasks with due times
- `penalties`: JSONB array of penalty details

### `get_end_of_day_summary(p_session_id UUID)`
Returns complete summary including:
- Score and counts
- Opening/Safety/Closing status
- Top 5 late tasks
- Shift label (Smooth/Needs attention/Risky)

## Key Constraints

✅ **No live scoring** - Only shown at end of shift
✅ **Deterministic** - Pure rule-based calculation
✅ **No gamification** - No points, badges, or leaderboards
✅ **Professional tone** - Adult, calm, informative
✅ **Encourages honesty** - Blocked tasks get smaller penalties

## Implementation Files

- **Database**: `/supabase/migrations/006_end_of_day_scoring.sql`
- **UI Component**: `/components/staff/EndOfDayModal.tsx`
- **Integration**: `/app/page.tsx` (lines 271-292)

## Usage

1. Staff complete their shift tasks throughout the day
2. When ready to end shift, tap "END SHIFT" button
3. System calculates score based on task completion timing
4. Modal displays summary with score and details
5. Staff can review or confirm shift end

## Design Principles

- **Minimal and calm** - No aggressive colors or animations
- **Informative** - Shows what needs attention
- **Fair** - Penalties match task importance
- **Honest** - Blocked tasks don't get harsh penalties
- **Professional** - Adult tone, no childish gamification
