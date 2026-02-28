# Shift Type - Internal Tracking Only

## ✅ **Updated Behavior**

**Dashboard shows ALL tasks for the whole day** (~69 tasks total)

Users don't see "shifts" - they just see their daily task list.

---

## 📊 **What Changed**

### **Before:**
- Session loads only templates matching `shift_type`
- Opening shift → 21 tasks
- Mid shift → 26 tasks
- Closing shift → 22 tasks

### **After:**
- Session loads **ALL active templates**
- Every session → ~69 tasks (Opening + Mid + Closing)
- Users see complete daily checklist

---

## 🎯 **What shift_type Is Used For**

**Internal tracking and analytics only:**
- When did they start working? (8am = opening, 10am = mid, 2pm = closing)
- Performance metrics by time of day
- Shift handover reports
- Analytics: "Tasks completed during opening hours"

**NOT used for:**
- ❌ Filtering which tasks appear
- ❌ Hiding tasks from users
- ❌ Separating the dashboard

---

## ⏰ **Shift Times (for tracking)**

Auto-detected when session created:
- **8am - 10am** → `shift_type: 'opening'`
- **10am - 2pm** → `shift_type: 'mid'`
- **2pm - 5pm** → `shift_type: 'closing'`

But all tasks from all templates load regardless.

---

## 📋 **Task Organization**

Tasks are organized by:
1. **sort_order** - Primary flow through the day
2. **due_time** - When each task should be done
3. **priority** - Tie-breaker for overdue tasks

**Example daily flow:**
- 8:00am - Opening Setup (grouped task)
- 8:15am - Check inventory
- 8:30am - Prepare for customers
- 10:00am - Mid-day stock check
- 2:00pm - Begin closing procedures
- 4:30pm - Final cash count
- 5:00pm - Lock up

All visible in one session, ordered by time/priority.

---

## 🔧 **Code Change**

**Old (filtered by shift):**
```typescript
const { data: templates } = await supabase
  .from('templates')
  .select('id')
  .eq('template_type', shiftType)  // ← Filtered here
  .eq('is_active', true)
```

**New (all templates):**
```typescript
const { data: templates } = await supabase
  .from('templates')
  .select('id')
  .eq('is_active', true)  // ← No filter, load all
```

---

## ✅ **Result**

Users see **complete daily checklist** (~69 tasks) regardless of when they start their session.

shift_type recorded for analytics but doesn't affect what tasks appear.
