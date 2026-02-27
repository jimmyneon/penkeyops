# PENKEY OPS DASHBOARD - SYSTEM AUDIT
**Date:** Feb 27, 2026  
**Status:** Implementation Review

---

## 🎯 ORIGINAL SPECIFICATIONS

### Core Concept
- **Shift Controller** (like sat-nav) - not a menu
- ONE dominant "NOW" task at a time
- Ultra-simple: staff just press buttons when tasks are done
- No manual shift management - auto-detect and start
- Tasks can be completed EARLY - due times are deadlines, not start times

### Task Flow Logic
1. **Show ALL pending tasks** - don't hide based on time
2. **Tasks can be completed early** - no waiting for due time
3. **Overdue = visual warning** - red, logged, reminders
4. **Priority sorting:**
   - Overdue + Critical (P1) = highest urgency
   - Critical tasks
   - Priority (P1 > P2 > P3)
   - Sort order

### Visual Design
- **On time:** Normal orange (Penkey primary #FF6B35)
- **Due soon:** Amber/yellow warning
- **Overdue:** Red, possibly pulsing for critical
- **Complete:** Dark teal
- Clean, minimal, soft shadows (no harsh borders)

### Layout (70/30 split)
- **NOW Card (70%):** Single dominant task, big button
- **Coming Up strip (30%):** 2-4 upcoming tasks
- **No clutter:** No tabs, no grid tiles, no persistent headers

---

## ✅ CURRENT IMPLEMENTATION

### 1. Auto-Start Shift ✅
**File:** `app/page.tsx`
- Detects no active session on page load
- Auto-creates shift based on time:
  - Before 9 AM → Opening
  - 9 AM - 4 PM → Mid
  - After 4 PM → Closing
- Creates checklist from template automatically
- Shows "Starting your shift..." spinner
- **Status:** ✅ IMPLEMENTED

### 2. Resolver Function ✅
**File:** `FIX_RESOLVER_SHOW_ALL_TASKS.sql`
- Returns first pending task regardless of time
- Calculates `is_overdue` and `overdue_minutes`
- Sorting priority:
  1. Overdue critical tasks
  2. All critical tasks
  3. Priority (P1, P2, P3)
  4. Sort order
- **Status:** ✅ IMPLEMENTED (needs to be run)

### 3. Coming Up Function ✅
**File:** `FIX_COMING_UP_SHOW_ALL.sql`
- Shows next 4 pending tasks (skips NOW task)
- No time filtering - all tasks visible
- Same sorting as resolver
- **Status:** ✅ IMPLEMENTED (needs to be run)

### 4. Task Completion ✅
**File:** `components/staff/NowCard.tsx`
- Inline completion - no redirect
- Updates status to 'completed'
- Automatically loads next task
- Group tasks open modal checklist
- **Status:** ✅ IMPLEMENTED

### 5. End of Day Logic ✅
**File:** `components/staff/NowCard.tsx`
- Shows "All Done!" when no pending tasks
- END SHIFT button only after 5 PM
- Before 5 PM: "Shift can be ended after 5 PM"
- **Status:** ✅ IMPLEMENTED

### 6. Test Data ✅
**File:** `COMPREHENSIVE_CAFE_DATA.sql`
- 66 realistic cafe tasks
- Opening (20), Mid-day (25), Closing (21)
- All tasks 8:30 AM - 5:00 PM
- **Status:** ✅ IMPLEMENTED

---

## ⚠️ GAPS - NEEDS IMPLEMENTATION

### 1. Visual Urgency Indicators ❌
**Current:** Only basic overdue red background  
**Needed:**
- **Normal (on time):** Orange background
- **Due soon (15-30 min):** Amber/yellow background
- **Overdue:** Red background
- **Critical + Overdue:** Red + pulsing animation
- **Due time countdown:** Show "Due in 15 minutes" vs "27 minutes overdue"

**Fix Required:** Update `NowCard.tsx` color logic

### 2. Coming Up Visual Updates ❌
**Current:** Static display  
**Needed:**
- Color coding for urgency
- Update when NOW task completes
- Show due times clearly

**Fix Required:** Update `ComingUp.tsx` styling

### 3. Overdue Logging ❌
**Current:** Overdue status calculated but not logged  
**Needed:**
- Log when task completed late
- Record overdue_minutes in database
- Audit trail for compliance

**Fix Required:** Add logging to task completion

---

## 📊 SYSTEM FLOW DIAGRAM

```
User Opens App
    ↓
Auto-Start Shift (based on time)
    ↓
Create Checklist from Template
    ↓
Resolver: Get First Pending Task
    ↓
┌─────────────────────────────────────┐
│  NOW CARD (70% screen)              │
│  ┌───────────────────────────────┐  │
│  │ 🔴 OVERDUE (if late)          │  │
│  │ 🟡 DUE SOON (if <30 min)      │  │
│  │ 🟠 ON TIME (normal)            │  │
│  │                                │  │
│  │ Task Title                     │  │
│  │ Instructions                   │  │
│  │ Due: 10:00 AM (in 15 min)     │  │
│  │                                │  │
│  │ [DO IT] ← Big button           │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  COMING UP (30% screen)             │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │
│  │Task2│ │Task3│ │Task4│ │Task5│   │
│  │10:15│ │10:30│ │11:00│ │11:15│   │
│  └─────┘ └─────┘ └─────┘ └─────┘   │
└─────────────────────────────────────┘
    ↓
User Clicks [DO IT]
    ↓
Task Marked Complete
    ↓
Resolver: Get Next Task
    ↓
(Loop back to NOW CARD)
    ↓
All Tasks Complete + After 5 PM
    ↓
[END SHIFT] button appears
    ↓
Shift Completed
```

---

## 🎨 COLOR CODING SPECIFICATION

### Task Urgency States

| State | Time Condition | Background | Text | Border | Animation |
|-------|---------------|------------|------|--------|-----------|
| **On Time** | Due time > 30 min away | Orange (#FF6B35) | White | None | None |
| **Due Soon** | Due time 15-30 min away | Amber (#FFA500) | White | None | None |
| **Very Soon** | Due time < 15 min | Yellow (#FFD700) | Dark | None | Subtle pulse |
| **Overdue** | Past due time | Red (#DC2626) | White | None | None |
| **Critical Overdue** | Past due + is_critical | Red (#DC2626) | White | None | **Strong pulse** |
| **Complete** | Status = completed | Dark Teal (#0F766E) | White | None | None |

### Priority Indicators
- **P1 Critical:** Badge with "CRITICAL" label
- **P1:** No special badge (sorted first)
- **P2:** Standard display
- **P3:** Lighter text (lower priority)

---

## 📋 IMPLEMENTATION CHECKLIST

### ✅ Completed
- [x] Auto-start shift on page load
- [x] Remove START SHIFT button
- [x] Resolver function (show all tasks)
- [x] Coming Up function (show all tasks)
- [x] Inline task completion
- [x] End of day logic (after 5 PM)
- [x] 66 comprehensive test tasks
- [x] Basic overdue detection

### ❌ Remaining
- [ ] Visual urgency indicators (amber/yellow/red)
- [ ] Pulsing animation for critical overdue
- [ ] Due time countdown display
- [ ] Coming Up color coding
- [ ] Overdue completion logging
- [ ] Real-time Coming Up updates

---

## 🔧 NEXT ACTIONS

1. **Run SQL files:**
   - `FIX_RESOLVER_SHOW_ALL_TASKS.sql`
   - `FIX_COMING_UP_SHOW_ALL.sql`

2. **Update NowCard.tsx:**
   - Add urgency color logic
   - Add pulsing animation for critical overdue
   - Show countdown timer

3. **Update ComingUp.tsx:**
   - Add color coding
   - Ensure real-time updates

4. **Test complete flow:**
   - Verify all 66 tasks appear
   - Complete tasks early
   - Verify overdue warnings
   - Test end of day

---

## 📝 ALIGNMENT WITH SPECIFICATIONS

| Requirement | Status | Notes |
|-------------|--------|-------|
| Auto-start shift | ✅ | Working |
| No manual buttons | ✅ | START SHIFT removed |
| Show all tasks immediately | ✅ | After SQL update |
| Tasks completable early | ✅ | No time filtering |
| Overdue visual warning | ⚠️ | Basic red, needs enhancement |
| Color coding urgency | ❌ | Needs amber/yellow states |
| Pulsing for critical | ❌ | Needs animation |
| Simple one-task focus | ✅ | NOW card dominant |
| Coming Up strip | ✅ | Shows next 4 tasks |
| End after 5 PM only | ✅ | Working |
| 66 realistic tasks | ✅ | Comprehensive data |

**Overall Alignment: 75%**  
**Core functionality complete, visual enhancements needed**
