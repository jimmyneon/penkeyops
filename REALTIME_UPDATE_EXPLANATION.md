# Real-Time Updates - How It Works

## ✅ **Current Implementation**

### **30-Second Client-Side Polling**

Both `NowCard` and `ComingUp` components force a re-render every 30 seconds:

```typescript
const [, setTick] = useState(0)
useEffect(() => {
  const colorUpdateInterval = setInterval(() => {
    setTick(tick => tick + 1)
  }, 30000) // 30 seconds
  
  return () => clearInterval(colorUpdateInterval)
}, [])
```

**How it works:**
1. Component calculates colors based on current browser time
2. Every 30 seconds, `setTick` triggers a re-render
3. Colors recalculate using new current time
4. UI updates to show new colors (green → amber → yellow → red)

**No database needed** - colors are calculated client-side from:
- Current time (browser)
- Task `due_time` (from database, loaded once)
- Time difference calculation

---

## 🎨 **Color Calculation**

```typescript
const getUrgencyColor = () => {
  const minutesUntilDue = calculateMinutesUntilDue(nowAction.due_time)
  
  if (nowAction.is_overdue) return 'bg-red-500'
  if (minutesUntilDue < 15) return 'bg-yellow-500 animate-pulse-slow'
  if (minutesUntilDue < 30) return 'bg-amber-500'
  return 'bg-green-500'
}

const calculateMinutesUntilDue = (dueTime: string) => {
  const now = new Date()
  const [hours, minutes] = dueTime.split(':').map(Number)
  const due = new Date()
  due.setHours(hours, minutes, 0, 0)
  
  return Math.floor((due.getTime() - now.getTime()) / 60000)
}
```

**Timeline:**
- 30+ minutes until due → Green
- 15-30 minutes until due → Amber
- <15 minutes until due → Yellow (pulsing)
- Past due time → Red

---

## 🔄 **Alternative: Supabase Realtime**

**Why we're NOT using it for colors:**

Supabase Realtime is for database changes (task completion, new tasks, etc.).

Colors change based on **time passing**, not database changes. The `due_time` in the database doesn't change - only the current time changes.

**What we DO use Supabase Realtime for:**
- Task completion (status changes)
- New tasks added
- Task updates

```typescript
const channel = supabase
  .channel('upcoming_updates')
  .on('postgres_changes', { 
    event: '*', 
    schema: 'public', 
    table: 'checklist_results' 
  }, () => {
    loadUpcoming() // Reload tasks when database changes
  })
  .subscribe()
```

---

## ⚡ **Why 30 Seconds?**

**Balance between:**
- ✅ Responsive enough (colors update within 30s)
- ✅ Low performance impact (not every second)
- ✅ Battery friendly (mobile devices)
- ✅ No server load (client-side calculation)

**Could be faster:**
- 10 seconds = more responsive, slightly higher battery use
- 60 seconds = less responsive, lower battery use

30 seconds is a good middle ground for task urgency updates.

---

## 🧪 **Testing Real-Time Updates**

**To verify it's working:**

1. Find a task with yellow color (due in <15 min)
2. Wait 30 seconds without refreshing
3. Color should update if time threshold crossed
4. Check browser console for any errors

**Example:**
- 14:00 - Task due at 14:15 (15 min) → Amber
- 14:01 - Still amber (14 min left)
- **Wait 30 seconds** (automatic re-render)
- 14:01:30 - Should now be Yellow (<15 min)

---

## ✅ **Summary**

**Real-time color updates:**
- ✅ Client-side calculation (no database polling)
- ✅ 30-second re-render interval
- ✅ No Supabase Realtime needed for colors
- ✅ Low performance impact
- ✅ Works offline (uses browser time)

**Supabase Realtime used for:**
- Task completion events
- New tasks added
- Database changes

Both systems work together for a responsive dashboard.
