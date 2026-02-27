# Dashboard Resolver Implementation Plan

## Overview
Transform dashboard from menu-based to resolver-based "shift controller" that acts like a sat-nav.

## Database Changes (Created)

### New Tables
1. **task_groups** - Metadata for linked task groups
2. **task_dependencies** - Timer/dependency unlocks
3. **shift_phases** - Time-based phase configuration
4. **task_unlocks** - Tracks when tasks become available

### New Columns on template_items
- `linked_group_id` - Groups tasks that happen together
- `grace_minutes` - Grace period before overdue
- `is_required` - Required vs optional tasks
- `instruction` - One-line instruction for NOW card

### New Functions
- `resolve_now_action(session_id)` - Core resolver
- `get_coming_up_tasks(session_id, limit)` - Next 2-4 items
- `get_group_tasks(session_id, group_id)` - Group checklist
- `get_current_phase(site_id)` - Time-aware phase detection

## UI Components to Build

### 1. NowCard Component (70% screen)
- Large dominant card
- Task/Group title
- One-line instruction
- Due-by time + countdown OR "Overdue by X mins"
- One big action button ("START" / "DO IT" / "ENTER TEMP")
- Visual urgency indicators (red for overdue P1 critical)

### 2. ComingUp Component (small strip)
- Horizontal scroll of 2-4 upcoming items
- Show title + due time only
- Calm, informational
- No interaction (just awareness)

### 3. TodayStatus Component (tiny)
- Minimal phase indicators: Opening ✓ / Safety ✓ / Closing ⏳
- Single line, compact

### 4. GroupChecklist Component (modal/page)
- Opens when NOW is a group
- Simple list of big check buttons
- Complete in any order
- Shows required vs optional
- Returns to dashboard when group complete

### 5. More Button (secondary)
- Small, quiet button
- Opens logs/records (existing components)
- Not prominent

## Page Redesign

### Remove
- ❌ QuickActions grid
- ❌ WhatsNext component (replaced by NowCard)
- ❌ ProgressTracker (replaced by TodayStatus)
- ❌ Full TaskList on home
- ❌ Any tab bars

### New Layout
```
┌─────────────────────────────────┐
│  Active Shift Header (compact)  │
├─────────────────────────────────┤
│                                 │
│         NOW CARD (70%)          │
│     [Big dominant action]       │
│                                 │
├─────────────────────────────────┤
│  Coming Up: [→→→→] (scroll)     │
├─────────────────────────────────┤
│  Opening ✓ Safety ✓ Closing ⏳  │
├─────────────────────────────────┤
│          [More] button          │
└─────────────────────────────────┘
```

## Implementation Steps

1. ✅ Create database migrations
2. ✅ Create resolver functions
3. ⏳ Build NowCard component
4. ⏳ Build ComingUp component
5. ⏳ Build TodayStatus component
6. ⏳ Build GroupChecklist component
7. ⏳ Redesign home page layout
8. ⏳ Add sample data with groups
9. ⏳ Test resolver scenarios
10. ⏳ Add timer/dependency system

## Sample Data Needed

Update ADD_SAMPLE_DATA.sql to include:
- Task groups (e.g., "Front of House Prep")
- Instructions for each task
- linked_group_id assignments
- Shift phases configuration
- Example dependencies (coffee machine warm-up)

## Testing Scenarios

1. No shift started → Shows "START OPENING" as NOW
2. Overdue P1 critical → Shows as NOW with red urgency
3. Linked group ready → Shows group as NOW
4. All tasks complete → Shows completion state
5. Time-based phase changes → Dashboard adapts
6. Timer dependency → Task unlocks after delay
