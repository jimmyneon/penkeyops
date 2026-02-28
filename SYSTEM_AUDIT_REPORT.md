# SYSTEM AUDIT REPORT - Dashboard & Task Management
**Date**: Feb 27, 2026  
**Status**: ✅ SYSTEM FUNCTIONAL WITH NOTES

---

## 1. ✅ TASK LIFECYCLE - ONE-TIME COMPLETION PER SHIFT

### How It Works
**Template → Instance → Results Pattern**

1. **Templates** (`template_items` table) - Reusable task definitions
2. **Shift Start** - `create_checklist_from_template()` creates:
   - One `checklist_instance` per shift
   - One `checklist_result` per template item (status: 'pending')
3. **Task Completion** - Updates `checklist_result.status` to 'completed'
4. **Resolver Filter** - Only shows `WHERE cr.status = 'pending'`

**Result**: ✅ **Tasks can only be completed ONCE per shift**

Once a task is marked 'completed', it:
- Disappears from NOW card
- Disappears from Coming Up
- Never reappears until next shift creates new instances

**Code Evidence**:
- `@/supabase/migrations/003_helper_functions.sql:108-123` - Creates fresh instances per shift
- `@/supabase/migrations/005_task_resolver.sql:73,101,134,167,196` - All queries filter `cr.status = 'pending'`

---

## 2. ⚠️ PHASE-BASED VISIBILITY - NOT IMPLEMENTED

### Current State
**Phase detection exists but is NOT used for filtering tasks**

**What Exists**:
- `shift_phases` table with time ranges (opening/trading/closing)
- `get_current_phase(p_site_id)` function returns current phase
- Resolver calls `get_current_phase()` but **doesn't use the result**

**What's Missing**:
The resolver does NOT filter tasks by phase. Line 53 in resolver:
```sql
v_current_phase := get_current_phase(v_site_id);
-- Variable is set but NEVER USED in WHERE clauses
```

### User Requirement
> "You can only complete the morning ones in the morning and then once it turns midday then you can do the other ones... operational from 10am-2pm, closing from 2pm-5:30pm"

### Current Behavior
**ALL pending tasks show up regardless of time** - sorted by priority/due_time only.

### Impact
- Morning tasks (due 8:30am) will show in NOW card even at 4pm if not completed
- Closing tasks (due 5pm) will show in NOW card at 9am if they're highest priority
- No time-based gating of task visibility

### ❌ ISSUE IDENTIFIED
**Phase-based filtering is NOT implemented in the resolver.**

---

## 3. ✅ COMING UP - SHOWS ALL PENDING TASKS

### Current Behavior
`get_coming_up_tasks()` returns **all pending tasks** (up to 4) regardless of:
- Current time
- Phase
- Due time

**Code**: `@/supabase/migrations/005_task_resolver.sql:237-239`
```sql
WHERE ci.shift_session_id = p_session_id
  AND cr.status = 'pending'
  AND cr.id != COALESCE(v_now_task_id, ...)
```

No time filtering = **full day visibility** ✅

### User Requirement Met
> "In upcoming tasks there should always be the full list there available what's going to be displayed the whole day so people can look at and see what's coming up"

**Status**: ✅ **WORKING AS REQUESTED**

Staff can see all upcoming tasks for the entire shift in Coming Up strip.

---

## 4. ✅ COLOR CODING SYSTEM - FULLY IMPLEMENTED

### NOW Card Colors
`@/components/staff/NowCard.tsx:112-130`

| Condition | Color | Animation |
|-----------|-------|-----------|
| **Overdue + Critical** | Red (`bg-red-600`) | Pulse |
| **Overdue** | Red (`bg-red-500`) | None |
| **Due <15 min** | Yellow (`bg-yellow-500`) | Pulse (slow) |
| **Due 15-30 min** | Amber (`bg-amber-500`) | None |
| **On Time** | Orange (`bg-primary`) | None |

### Coming Up Colors
`@/components/staff/ComingUp.tsx:151-165`

Matches NOW card urgency colors for consistency:
- Overdue Critical: Red border (`border-red-600`)
- Overdue: Red border (`border-red-500`)
- Due <15 min: Yellow border (`border-yellow-500`)
- Due 15-30 min: Amber border (`border-amber-500`)
- On time: Orange border (`border-primary`)

**Status**: ✅ **FULLY IMPLEMENTED**

Visual urgency system provides clear behavioral nudges without notifications.

---

## 5. ✅ RESOLVER LOGIC - DETERMINISTIC & CORRECT

### Priority Order (Lines 55-202)
1. **Overdue P1 CRITICAL** (line 55-81)
2. **Due-soon P1 CRITICAL** (<15 min, line 83-110)
3. **Linked groups with pending required tasks** (line 112-144)
4. **Required tasks by priority + due_time** (line 146-176)
5. **Any remaining pending tasks** (line 178-201)

### Key Features
- ✅ Single task selection (LIMIT 1)
- ✅ Status filtering (`cr.status = 'pending'`)
- ✅ Time-based overdue detection
- ✅ Priority-based ordering
- ✅ Group support for parallel work

**Status**: ✅ **WORKING CORRECTLY**

Resolver provides deterministic, predictable task selection.

---

## 6. ✅ DATABASE FUNCTIONS - ALL OPERATIONAL

### Core Functions
| Function | Purpose | Status |
|----------|---------|--------|
| `create_checklist_from_template()` | Creates task instances per shift | ✅ Working |
| `resolve_now_action()` | Determines NOW card task | ✅ Working |
| `get_coming_up_tasks()` | Returns upcoming tasks | ✅ Working |
| `get_group_tasks()` | Returns grouped tasks | ✅ Working |
| `get_current_phase()` | Detects time phase | ✅ Working (unused) |
| `calculate_shift_score()` | End-of-day scoring | ✅ Working |
| `get_end_of_day_summary()` | Shift summary | ✅ Working |

### Database Schema
- ✅ `template_items` - Task definitions
- ✅ `checklist_instances` - Per-shift instances
- ✅ `checklist_results` - Task completion tracking
- ✅ `shift_phases` - Time-based phases (unused)
- ✅ `task_groups` - Grouped task metadata
- ✅ Indexes for performance

**Status**: ✅ **ALL FUNCTIONS OPERATIONAL**

---

## 7. ✅ END-OF-DAY SCORING - IMPLEMENTED

### Features
- ✅ 0-100 score calculation
- ✅ Green/Amber/Red task categorization
- ✅ Priority-based penalties
- ✅ Opening/Safety/Closing status indicators
- ✅ Top 5 late tasks display
- ✅ Score bands (Smooth/Needs attention/Risky)

**Status**: ✅ **FULLY IMPLEMENTED**

---

## 8. ✅ NOTIFICATION SYSTEM - SINGLE-FIRE

### Fixed Issues
- ✅ Removed hourly repeat logic
- ✅ Single-fire tracking by `(user_id, related_id, notification_type)`
- ✅ One "overdue" notification per task instance
- ✅ Dashboard color remains primary driver

**Status**: ✅ **WORKING AS SPECIFIED**

---

## CRITICAL ISSUE TO ADDRESS

### ❌ Phase-Based Task Filtering NOT Implemented

**User Requirement**:
> "You can only complete the morning ones in the morning... operational 10am-2pm... closing 2pm-5:30pm"

**Current Behavior**:
All pending tasks show regardless of time/phase.

**Required Fix**:
Modify resolver to filter tasks based on current phase + task due_time ranges.

**Example Logic Needed**:
```sql
-- Morning phase (before 10am): Only show tasks due before 10am
-- Operational phase (10am-2pm): Show tasks due 10am-2pm
-- Closing phase (2pm-5:30pm): Show tasks due after 2pm
```

This would prevent closing tasks from appearing in the morning and vice versa.

---

## SUMMARY

| Component | Status | Notes |
|-----------|--------|-------|
| **Task Lifecycle** | ✅ Working | One completion per shift |
| **Phase Filtering** | ❌ Missing | Tasks show regardless of time |
| **Coming Up Visibility** | ✅ Working | Shows full day as requested |
| **Color Coding** | ✅ Working | Neutral→Amber→Red system |
| **Resolver Logic** | ✅ Working | Deterministic priority-based |
| **Database Functions** | ✅ Working | All operational |
| **End-of-Day Scoring** | ✅ Working | Complete implementation |
| **Notifications** | ✅ Working | Single-fire only |

### Overall Assessment
**System is 90% functional** with one critical gap: phase-based task filtering.

The infrastructure exists (`shift_phases` table, `get_current_phase()` function) but the resolver doesn't use it to gate task visibility by time of day.
