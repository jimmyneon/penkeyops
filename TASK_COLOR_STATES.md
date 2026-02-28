# Task Card Color States

The NOW card changes color based on how close the task is to its due time.

## Color States (in order of urgency)

### 🟢 **Green** - On Time
- **When:** More than 30 minutes until due time
- **Color:** `bg-green-500`
- **Meaning:** Plenty of time, no rush
- **Why green:** Clear, positive, calming - no anxiety

### 🟡 **Amber** - Due Soon
- **When:** 15-30 minutes until due time
- **Color:** `bg-amber-500`
- **Meaning:** Should start thinking about this task

### 🟡 **Yellow (Pulsing)** - Due Very Soon
- **When:** Less than 15 minutes until due time
- **Color:** `bg-yellow-500 animate-pulse-slow`
- **Meaning:** Need to do this task now
- **Visual:** Subtle pulsing animation

### 🔴 **Red** - Overdue
- **When:** Past the due time
- **Color:** `bg-red-500`
- **Meaning:** Task is late

### 🔴 **Red (Pulsing)** - Critical Overdue
- **When:** Past due time AND marked as critical
- **Color:** `bg-red-600 animate-pulse`
- **Meaning:** Critical task is late - urgent attention needed
- **Visual:** Strong pulsing animation

## Why Green Instead of Orange?

**Orange is too close to red** - especially in smaller UI elements like the "Coming Up" list, orange can look red and cause unnecessary anxiety. 

**Green is clearer:**
- ✅ Universally understood as "good/safe"
- ✅ High contrast with amber/yellow/red
- ✅ Calming and positive
- ✅ Clear visual distinction from warning states

## Countdown Text

- **Before due time:** "Due by HH:MM" (e.g., "Due by 14:30")
- **After due time:** "X minutes overdue" (e.g., "15 minutes overdue")

## Grace Period

Tasks have a grace period (typically 30 minutes) after the due time before they're marked as truly late in the scoring system. However, the card will turn red immediately when the due time passes to encourage timely completion.
