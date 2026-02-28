# Implementation Status vs Spec - Dashboard Control

## ✅ **What's Working (Matches Spec)**

### 1. **NOW Card - Single Actionable Item**
✅ **CONFIRMED**
- Dashboard shows ONE dominant NOW card
- Only place staff can complete tasks
- Resolver selects based on time + overdue + priority + sort_order
- Large action button ("DO IT", "OPEN CHECKLIST", etc.)
- Shows due_time countdown
- Color-coded urgency (green → amber → yellow → red)

**Location:** `components/staff/NowCard.tsx`

### 2. **Grouped Tasks - Modal with Toggles**
✅ **CONFIRMED**
- NOW card shows group as single entry: "Power Up (4 tasks)"
- Tap opens `GroupChecklist` modal
- Modal has large toggle circles for each microtask
- Completes when all required tasks ticked
- Auto-closes, returns to dashboard
- Resolver selects next NOW

**Location:** `components/staff/GroupChecklist.tsx`

### 3. **Upcoming - Collapsed by Default**
✅ **CONFIRMED**
- Shows 2-4 upcoming tasks
- Informational only (time + label)
- Visually calm, doesn't compete with NOW
- Can expand to show more tasks
- Uses color-coded borders (green/amber/yellow/red)

**Location:** `components/staff/ComingUp.tsx`

### 4. **Completion Rule**
✅ **CONFIRMED**
- Tasks completed ONLY through NOW card action
- Or through task modal opened from NOW
- GroupChecklist modal for grouped tasks
- No completion from other views

---

## ⚠️ **Gaps (Not Yet Implemented)**

### 1. **Expanded Timeline - Read-Only Reference**
❌ **MISSING**

**Spec requires:**
- Full day timeline view (all ~69 tasks)
- Read-only schedule/timetable
- Shows: time, label, small status dot (done/pending)
- NO large tickboxes
- NO completion actions
- Staff CANNOT reorder tasks
- Purpose: reassurance + planning, not execution

**Current state:**
- `ComingUp` component has expand/collapse
- But expanded view still shows task cards (not timeline format)
- Tasks are clickable/interactive (should be read-only)
- No proper timeline/timetable layout

**What needs to be built:**
- New `DayTimeline` component or expanded mode in `ComingUp`
- Timeline layout (vertical list with times)
- Small status indicators (dots/icons)
- Read-only (no actions, no completion)
- Optional: tap task → navigate to detail view (but still no direct completion)

### 2. **Upcoming Expanded View Behavior**
⚠️ **PARTIAL**

**Current:**
- Expand shows more tasks in grid layout
- Tasks are still interactive/clickable
- Visual style same as collapsed (just more items)

**Spec requires:**
- Expanded view should be timeline/reference format
- Read-only (informational only)
- Different visual treatment (timeline vs cards)

---

## 📊 **Summary Table**

| Feature | Status | Location |
|---------|--------|----------|
| NOW card (single action) | ✅ Working | `NowCard.tsx` |
| Grouped tasks modal | ✅ Working | `GroupChecklist.tsx` |
| Upcoming collapsed (2-4 items) | ✅ Working | `ComingUp.tsx` |
| Completion only via NOW | ✅ Working | All components |
| Color-coded urgency | ✅ Working | `NowCard.tsx`, `ComingUp.tsx` |
| Real-time color updates | ✅ Working | 30-second interval |
| **Expanded day timeline** | ❌ Missing | **Needs new component** |
| **Read-only reference view** | ❌ Missing | **Needs implementation** |
| Groups in timeline (single entry) | ⚠️ Partial | Shows in upcoming, needs timeline view |

---

## 🔧 **What Needs to Be Built**

### **DayTimeline Component**

**Purpose:** Read-only reference view of all daily tasks

**Layout:**
```
┌─────────────────────────────────────┐
│ TODAY'S SCHEDULE                    │
├─────────────────────────────────────┤
│ 08:00  ● Opening Setup (5)          │
│ 08:15  ● Check Inventory             │
│ 08:30  ✓ Prepare for Customers      │
│ 10:00  ● Mid-day Stock Check         │
│ 14:00  ○ Begin Closing Procedures   │
│ 16:30  ○ Final Cash Count            │
│ 17:00  ○ Lock Up                     │
└─────────────────────────────────────┘

Legend:
✓ = Completed
● = Current/upcoming (green/amber/yellow)
○ = Pending (gray)
```

**Features:**
- Vertical timeline layout
- Time + task title
- Small status dot (not large checkbox)
- Color-coded by urgency (but subtle)
- Groups shown as single entry with count
- NO action buttons
- NO completion functionality
- Optional: tap → view detail (read-only)

**Integration:**
- Triggered by "View Full Day" button or expanding Upcoming
- Slides up as bottom sheet or full screen
- Close returns to dashboard (NOW card)

---

## ✅ **Conclusion**

**Core dashboard control is working:**
- NOW card is the only action point ✓
- Grouped tasks work correctly ✓
- Upcoming is informational ✓
- Completion only through NOW ✓

**Missing piece:**
- Expanded read-only timeline view for full day visibility

**Recommendation:**
Build `DayTimeline` component to complete the spec.
