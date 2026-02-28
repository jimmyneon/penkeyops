# Real-time Color Changes - How It Works

## Yes, Color Changes Are Real-time!

The task card color changes happen **automatically in real-time** as you get closer to the due time. Here's how:

## The Mechanism

### 1. **No Database Table Needed**
- Color changes are **calculated on the frontend** in real-time
- No database updates required
- Happens automatically every time the component renders

### 2. **Data Source: `template_items` Table**
The `due_time` field comes from the `template_items` table:
```sql
template_items
  ├── id
  ├── title
  ├── due_time          ← This field (TIME type, e.g., '14:30:00')
  ├── priority
  ├── sort_order
  └── ...
```

### 3. **Real-time Calculation (Client-side)**

The `NowCard` component calculates urgency every render:

```typescript
const calculateMinutesUntilDue = (dueTime: string) => {
  const now = new Date()                    // Current time
  const [hours, minutes] = dueTime.split(':').map(Number)
  const dueDate = new Date()
  dueDate.setHours(hours, minutes, 0, 0)
  
  const diffMs = dueDate.getTime() - now.getTime()
  return Math.floor(diffMs / 60000)         // Minutes until due
}

const getUrgencyColor = () => {
  const minutesUntilDue = calculateMinutesUntilDue(nowAction.due_time)
  
  if (nowAction.is_overdue) return 'bg-red-500'
  if (minutesUntilDue < 15) return 'bg-yellow-500 animate-pulse-slow'
  if (minutesUntilDue < 30) return 'bg-amber-500'
  return 'bg-green-500'  // Green - clear, positive, no anxiety
}
```

### 4. **Color Transition Timeline**

**Example: Task due at 14:30**

| Current Time | Minutes Until Due | Color State |
|--------------|-------------------|-------------|
| 13:30        | 60 min            | � Green (on time) |
| 14:00        | 30 min            | � Green (still on track) |
| 14:01        | 29 min            | 🟡 Amber (due soon) |
| 14:16        | 14 min            | 🟡 Yellow + pulse (due very soon) |
| 14:30        | 0 min (overdue)   | 🔴 Red (overdue) |

### 5. **Update Frequency**

The color updates automatically every **30 seconds** via a background timer:

```typescript
useEffect(() => {
  const colorUpdateInterval = setInterval(() => {
    setTick(tick => tick + 1) // Force re-render
  }, 30000) // 30 seconds
  
  return () => clearInterval(colorUpdateInterval)
}, [])
```

The color also updates whenever:
- Task data changes (task completed, new task loaded)
- Database changes trigger Supabase realtime updates
- User interacts with the page

**True real-time** - color changes automatically every 30 seconds without manual refresh.

## Database Tables Involved

1. **`template_items`** - Stores the `due_time` for each task type
2. **`checklist_results`** - Links task instances to sessions (status: pending/completed)
3. **`shift_sessions`** - Current active session

The resolver function (`resolve_now_action`) fetches the task with its `due_time`, and the frontend calculates the color based on current time vs. due time.

## No Polling or Websockets Needed

Since it's a pure calculation (current time vs. stored due time), there's no need for:
- Database polling
- Websocket connections
- Background jobs

The calculation happens instantly on every render using the browser's clock.
