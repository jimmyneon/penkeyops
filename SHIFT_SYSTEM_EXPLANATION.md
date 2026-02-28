# Shift System - How Tasks Are Loaded

## ✅ System Working Correctly

Your session shows **22 tasks** because it's a **Closing shift** - this is the correct behavior.

---

## 📋 How Shifts Work

### **One Shift Type Per Session**

Each session loads tasks for **only one shift type**:

| Shift Type | Templates Loaded | Task Count |
|------------|------------------|------------|
| **Opening** | Opening Checklist | ~21 tasks |
| **Mid** | Mid Shift Checklist | ~26 tasks |
| **Closing** | Closing Checklist | ~22 tasks |

**Your current session:**
- Shift type: `closing`
- Status: `completed` (true)
- Started: Feb 27, 2026 at 19:12 UTC
- Tasks loaded: 22 (both global + site-specific Closing templates)

---

## 🔢 Total Task Count Across All Shifts

**If you ran all 3 shifts in one day:**
- Opening: 21 tasks
- Mid: 26 tasks
- Closing: 22 tasks
- **Total: ~69 tasks per day**

But each **individual session** only shows tasks for its shift type.

---

## 🎯 Why You See 22 Tasks

1. Session created with `shift_type = 'closing'`
2. Auto-create logic loaded all templates where:
   - `template_type = 'closing'`
   - `is_active = true`
   - `site_id = session.site_id OR site_id IS NULL`
3. Found 2 Closing templates:
   - Global Closing Checklist (21 tasks)
   - Site-specific Closing Checklist (1 task)
4. Total: 22 tasks ✓

---

## 📅 Daily Workflow

**Typical day at a site:**

1. **Morning (Opening shift)**
   - Create session with `shift_type = 'opening'`
   - Loads Opening Checklist (21 tasks)
   - Complete tasks
   - End shift

2. **Afternoon (Mid shift)**
   - Create session with `shift_type = 'mid'`
   - Loads Mid Shift Checklist (26 tasks)
   - Complete tasks
   - End shift

3. **Evening (Closing shift)** ← **Your current session**
   - Create session with `shift_type = 'closing'`
   - Loads Closing Checklist (22 tasks)
   - Complete tasks
   - End shift

**Total tasks completed in day: ~69 tasks across 3 sessions**

---

## 🔧 How Shift Type Is Determined

From `app/page.tsx`:

```typescript
const getShiftType = () => {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'opening'
  if (hour >= 12 && hour < 17) return 'mid'
  return 'closing'
}
```

**Time-based auto-detection:**
- 5am - 12pm → Opening
- 12pm - 5pm → Mid
- 5pm - 5am → Closing

Your session started at 19:12 (7:12 PM) → Closing shift ✓

---

## ✅ Conclusion

**Everything is working correctly.**

- You have 22 tasks because you're in a Closing shift
- Opening (21) and Mid (26) templates are for different shifts
- To see all ~69 tasks, you'd need to work through all 3 shifts in a day
- Each shift session is independent and only loads its own templates

**No bug, no missing tasks - system working as designed.**
