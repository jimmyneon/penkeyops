# Resolver Flow - Complete Working Example

## The Magic: Simple UI, Complex Background

**What the user sees:** One big card telling them exactly what to do next.

**What's happening behind the scenes:** Intelligent resolver analyzing time, priority, dependencies, and task groups to determine the single best action.

---

## Example: Full Day Flow (8:30am - 5:25pm)

### Scenario: Staff member "Sarah" arrives at 8:25am

---

### 8:25am - Before Shift Starts

**Dashboard shows:**
```
┌─────────────────────────────────────┐
│                                     │
│      Ready to Start?                │
│                                     │
│   Begin your shift to see tasks     │
│                                     │
│      [START SHIFT]                  │
│                                     │
└─────────────────────────────────────┘
```

**Sarah taps START SHIFT**

---

### 8:30am - Shift Started

**Resolver runs:**
```sql
resolve_now_action(session_id)
  ↓
1. Check overdue P1 CRITICAL tasks → None (it's 8:30am, nothing overdue yet)
2. Check due-soon P1 CRITICAL tasks → Found!
   - "Confirm Start of Day" due at 8:30am (NOW)
   - Priority: P1, Critical: true
   ✓ SELECT THIS
```

**Dashboard shows:**
```
┌─────────────────────────────────────┐
│ 🔴 NOW                              │
│ Due now                             │
│                                     │
│ Confirm Start of Day                │
│                                     │
│ Tap to confirm you have arrived     │
│ and are ready to begin opening      │
│                                     │
│      [DO IT] →                      │
└─────────────────────────────────────┘

Coming Up:
[Opening Prep (3 tasks) - 8:35am] [Check Fridge Temps - 8:40am]
```

**Background logic:**
- Resolver found task due at 8:30am
- It's P1 CRITICAL so it takes priority
- Coming Up shows next 2-4 tasks by due time

**Sarah taps DO IT, adds note "Arrived on time, ready to open"**

---

### 8:35am - After Confirming Start

**Resolver runs again:**
```sql
resolve_now_action(session_id)
  ↓
1. Check overdue P1 CRITICAL → None
2. Check due-soon P1 CRITICAL → None (next critical is 8:40am)
3. Check linked groups → Found!
   - Group: "opening_prep"
   - Contains 3 tasks all due at 8:35am:
     * Unlock Front Door (P1, critical)
     * Turn On Lights (P1, critical)
     * Coffee Machine ON (P1, critical)
   - All required, all pending
   ✓ SELECT GROUP
```

**Dashboard shows:**
```
┌─────────────────────────────────────┐
│ 🔴 NOW                              │
│ Due now                             │
│                                     │
│ Opening Prep (3 tasks)              │
│                                     │
│ Get the shop ready to open          │
│                                     │
│      [OPEN CHECKLIST] →             │
└─────────────────────────────────────┘

Coming Up:
[Check Fridge Temps - 8:40am] [Check Use-By Dates - 8:40am]
```

**Background logic:**
- Resolver detected 3 tasks with same `linked_group_id = 'opening_prep'`
- All due at same time (8:35am)
- Instead of showing one task, shows the GROUP
- This is the "parallel work" concept - tasks that naturally happen together

**Sarah taps OPEN CHECKLIST**

---

### 8:35am - Group Checklist Modal

**Modal shows:**
```
┌─────────────────────────────────────┐
│ Opening Prep              [X]       │
│ 1 of 3 required tasks complete      │
├─────────────────────────────────────┤
│                                     │
│ ○ Unlock Front Door                │
│   Unlock front door and turn        │
│   open sign on                      │
│                                     │
│ ○ Turn On Lights                   │
│   Turn on all lights in customer    │
│   areas                             │
│                                     │
│ ○ Coffee Machine ON                │
│   Turn on coffee machine and let    │
│   it warm up                        │
│                                     │
└─────────────────────────────────────┘
```

**Sarah completes tasks in her preferred order:**
1. Taps "Coffee Machine ON" first (wants it warming while she does other tasks)
2. Then "Unlock Front Door"
3. Finally "Turn On Lights"

**Background logic:**
- No enforced order - staff can complete in any sequence
- Each tap updates database: `status = 'completed'`
- Real-time subscription updates the checklist
- When all REQUIRED tasks done, modal auto-closes

**All 3 done → Modal closes, returns to dashboard**

---

### 8:40am - After Opening Prep Complete

**Resolver runs:**
```sql
resolve_now_action(session_id)
  ↓
1. Check overdue P1 CRITICAL → None
2. Check due-soon P1 CRITICAL → Found!
   - Group: "safety_checks" 
   - Contains 2 tasks due at 8:40am:
     * Check Fridge Temps (P1, critical, requires numeric evidence)
     * Check Use-By Dates (P1, critical)
   ✓ SELECT GROUP
```

**Dashboard shows:**
```
┌─────────────────────────────────────┐
│ 🔴 NOW                              │
│ Due now                             │
│                                     │
│ Safety Checks (2 tasks)             │
│                                     │
│ Critical safety and hygiene checks  │
│                                     │
│      [OPEN CHECKLIST] →             │
└─────────────────────────────────────┘

Coming Up:
[Restock Display - 8:50am] [Check Till Float - 8:55am]

Today Status:
Opening ✓ | Safety ⏳ | Closing ○
```

**Background logic:**
- Another linked group detected
- Both tasks are P1 CRITICAL
- One requires numeric evidence (temperature reading)
- Today Status shows Opening phase complete

**Sarah opens checklist, enters fridge temp "3.2°C", checks dates**

---

### 9:00am - Mid-Morning (All Opening Tasks Done)

**Resolver runs:**
```sql
resolve_now_action(session_id)
  ↓
1. Check overdue P1 CRITICAL → None
2. Check due-soon P1 CRITICAL → None (next is 12:00pm)
3. Check linked groups → None pending
4. Check required pending tasks → Found!
   - "Restock Display" (P2, not critical, due 8:50am)
   - NOW OVERDUE by 10 minutes
   ✓ SELECT THIS
```

**Dashboard shows:**
```
┌─────────────────────────────────────┐
│ ⚠️ NOW                              │
│ Overdue by 10 min                   │
│                                     │
│ Restock Display                     │
│                                     │
│ Restock all customer-facing areas   │
│                                     │
│      [DO IT] →                      │
└─────────────────────────────────────┘

Coming Up:
[Check Till Float - 8:55am] [Lunch Temp Check - 12:00pm]

Today Status:
Opening ✓ | Safety ✓ | Closing ○
```

**Background logic:**
- Task is overdue but not critical (P2)
- Resolver still surfaces it as NOW
- Orange warning color (not red like P1 critical)
- Shows "Overdue by X min" instead of countdown

---

### 12:00pm - Lunch Time

**Resolver runs:**
```sql
resolve_now_action(session_id)
  ↓
1. Check overdue P1 CRITICAL → None
2. Check due-soon P1 CRITICAL → Found!
   - "Lunch Temperature Check" due at 12:00pm
   - Priority: P1, Critical: true, Requires numeric evidence
   ✓ SELECT THIS
```

**Dashboard shows:**
```
┌─────────────────────────────────────┐
│ 🔴 NOW                              │
│ Due now                             │
│ CRITICAL                            │
│                                     │
│ Lunch Temperature Check             │
│                                     │
│ Record fridge and freezer temps     │
│                                     │
│      [ENTER TEMP] →                 │
└─────────────────────────────────────┘

Coming Up:
[Restock Shelves - 2:00pm] [Afternoon Temp Check - 3:00pm]
```

**Background logic:**
- P1 CRITICAL task due now
- Button text changes to "ENTER TEMP" because evidence_type = 'numeric'
- Red background for critical urgency
- "CRITICAL" badge shown

---

### 5:00pm - Closing Time Arrives

**Resolver runs:**
```sql
resolve_now_action(session_id)
  ↓
1. Check overdue P1 CRITICAL → None
2. Check due-soon P1 CRITICAL → None
3. Check linked groups → Found!
   - Group: "closing_cleanup"
   - Contains 3 tasks all due at 5:00pm:
     * Clean Tables (P1, critical)
     * Mop Floors (P1, critical)
     * Empty Bins (P1, critical)
   ✓ SELECT GROUP
```

**Dashboard shows:**
```
┌─────────────────────────────────────┐
│ 🔴 NOW                              │
│ Due now                             │
│                                     │
│ Closing Cleanup (3 tasks)           │
│                                     │
│ Clean and secure the premises       │
│                                     │
│      [OPEN CHECKLIST] →             │
└─────────────────────────────────────┘

Coming Up:
[Final Temp Check - 5:10pm] [Cash Up Till - 5:15pm]

Today Status:
Opening ✓ | Safety ✓ | Closing ⏳
```

**Background logic:**
- Closing phase detected (time-aware)
- Linked group for parallel cleanup tasks
- Today Status shows Closing in progress

---

### 5:25pm - Final Task

**Resolver runs:**
```sql
resolve_now_action(session_id)
  ↓
1-4. All other checks → None pending
5. Check any remaining tasks → Found!
   - "Confirm End of Day" (P1, critical, due 5:25pm)
   - Last task in closing template
   ✓ SELECT THIS
```

**Dashboard shows:**
```
┌─────────────────────────────────────┐
│ 🔴 NOW                              │
│ Due now                             │
│ CRITICAL                            │
│                                     │
│ Confirm End of Day                  │
│                                     │
│ Confirm all closing tasks complete  │
│ and you are leaving                 │
│                                     │
│      [DO IT] →                      │
└─────────────────────────────────────┘

Coming Up:
(none)

Today Status:
Opening ✓ | Safety ✓ | Closing ✓
```

**Sarah taps DO IT, adds note "All tasks complete, shop secured"**

---

### 5:26pm - All Tasks Complete

**Resolver runs:**
```sql
resolve_now_action(session_id)
  ↓
1-5. All checks → No pending tasks found
   ✓ RETURN EMPTY (all done)
```

**Dashboard shows:**
```
┌─────────────────────────────────────┐
│                                     │
│         ✓                           │
│                                     │
│      All Done!                      │
│                                     │
│ You've completed all tasks for      │
│ this shift                          │
│                                     │
│    [COMPLETE SHIFT]                 │
│                                     │
└─────────────────────────────────────┘

Today Status:
Opening ✓ | Safety ✓ | Closing ✓
```

**Sarah taps COMPLETE SHIFT → Returns to start screen**

---

## The Complexity Behind Simplicity

### What Sarah Experienced (Simple)
- One card always telling her what to do next
- Clear instructions
- Big obvious buttons
- Automatic progression through the day
- No thinking about what's next

### What the System Did (Complex)

**Every time a task completes:**

1. **Resolver runs** - Analyzes all pending tasks
2. **Time check** - Compares current time to due times
3. **Priority ranking** - Sorts by P1 critical → P1 → P2 → P3
4. **Group detection** - Finds tasks with same `linked_group_id`
5. **Overdue calculation** - Determines if tasks are late
6. **Phase awareness** - Knows it's opening/trading/closing time
7. **Evidence requirements** - Knows which tasks need temps/photos/notes
8. **Real-time updates** - Supabase subscriptions keep everything in sync
9. **UI adaptation** - Button text changes based on task type
10. **Visual urgency** - Colors change for overdue/critical tasks

### The Resolver Priority Logic

```
FOR each task completion:
  
  1. Overdue P1 CRITICAL?
     → Show immediately (red, urgent)
  
  2. Due soon P1 CRITICAL? (within 15 min)
     → Show next (red, critical badge)
  
  3. Linked group with pending required tasks?
     → Show group (opens checklist modal)
  
  4. Any required pending tasks?
     → Show by priority + due time
  
  5. Nothing left?
     → Show "All Done!" completion state
```

### Time-Aware Phases

The system knows what time of day it is:

- **Pre-open (7:00-8:30)** - Reduce noise, only show opening prep
- **Opening (8:30-9:30)** - Surface opening tasks
- **Trading (9:30-16:00)** - Normal operations, routine checks
- **Closing (16:00-17:30)** - Start surfacing closing tasks
- **Closed (17:30-7:00)** - Summary state

### Linked Groups = Parallel Work

Instead of forcing sequential completion:
```
❌ BAD: Must unlock door → THEN lights → THEN coffee
✅ GOOD: Here are 3 opening tasks, do them in any order
```

Groups let staff work naturally while ensuring all required tasks get done.

---

## Summary: The Magic Formula

**Simple UI** = One card, one action, clear instruction

**Complex Background** = 
- Time-based task selection
- Priority ranking (P1/P2/P3)
- Critical task highlighting
- Linked group detection
- Overdue tracking
- Phase awareness
- Evidence requirements
- Real-time updates
- Automatic progression

**Result:** Staff never think about "what's next" - the system thinks for them.
