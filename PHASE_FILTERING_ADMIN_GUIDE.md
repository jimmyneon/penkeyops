# Phase-Based Task Filtering - Admin Configuration Guide

## Overview
**Option C Implementation**: Mixed approach using template types + due_time ranges + admin-configurable phase settings.

This system controls which tasks appear in the NOW card based on the current time of day, preventing morning tasks from showing in the afternoon and vice versa.

---

## How It Works

### 1. **Phase Detection**
The system automatically detects the current phase based on time:
- `get_current_phase(site_id)` checks `shift_phases` table
- Returns phase name (e.g., 'opening', 'trading', 'closing')

### 2. **Template Type Filtering**
Each phase has an array of allowed template types:
- **Pre-open**: `['opening']` - Only opening tasks
- **Opening**: `['opening', 'mid']` - Opening + operational tasks
- **Trading**: `['mid', 'safety']` - Operational + safety tasks
- **Peak**: `['mid', 'closing']` - Operational + closing prep
- **Closing**: `['closing']` - Only closing tasks

### 3. **Critical Task Override**
**P1 CRITICAL tasks ALWAYS show** regardless of phase:
- Overdue P1 CRITICAL tasks (Priority 1)
- Due-soon P1 CRITICAL tasks within 15 minutes (Priority 2)

This ensures urgent tasks are never hidden.

### 4. **Phase-Filtered Tasks**
Non-critical tasks are filtered by current phase (Priority 3-5):
- Linked groups
- Required tasks
- Remaining pending tasks

---

## Database Schema

### `shift_phases` Table
```sql
CREATE TABLE shift_phases (
  id UUID PRIMARY KEY,
  site_id UUID REFERENCES sites(id),
  phase_name TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  allowed_template_types TEXT[] DEFAULT '{}',
  UNIQUE(site_id, phase_name)
);
```

### Example Configuration
```sql
-- Morning phase (8:30am - 10:00am)
INSERT INTO shift_phases (site_id, phase_name, start_time, end_time, allowed_template_types)
VALUES (
  'your-site-id',
  'opening',
  '08:30:00',
  '10:00:00',
  ARRAY['opening', 'mid']
);

-- Operational phase (10:00am - 2:00pm)
INSERT INTO shift_phases (site_id, phase_name, start_time, end_time, allowed_template_types)
VALUES (
  'your-site-id',
  'trading',
  '10:00:00',
  '14:00:00',
  ARRAY['mid', 'safety']
);

-- Closing phase (2:00pm - 5:30pm)
INSERT INTO shift_phases (site_id, phase_name, start_time, end_time, allowed_template_types)
VALUES (
  'your-site-id',
  'closing',
  '14:00:00',
  '17:30:00',
  ARRAY['closing']
);
```

---

## Admin UI Requirements

### Phase Management Page
Admins should be able to configure:

1. **Phase Time Ranges**
   - Phase name (dropdown: pre_open, opening, trading, peak, closing, closed)
   - Start time (time picker)
   - End time (time picker)

2. **Allowed Template Types**
   - Multi-select checkboxes:
     - [ ] Opening tasks
     - [ ] Mid-shift tasks
     - [ ] Closing tasks
     - [ ] Safety tasks
     - [ ] Cleaning tasks

3. **Visual Timeline**
   - Show phases on a 24-hour timeline
   - Color-coded blocks for each phase
   - Drag to adjust times
   - Click to edit allowed types

### Template Configuration
When creating/editing templates:

1. **Template Type** (required)
   - Dropdown: Opening / Mid / Closing / Safety / Cleaning
   - This determines which phases the template's tasks can appear in

2. **Task Due Times** (optional)
   - Time picker for each task
   - Used for priority ordering within allowed phases

---

## Example Scenarios

### Scenario 1: Morning (9:00am)
**Current Phase**: `opening`  
**Allowed Types**: `['opening', 'mid']`

**NOW Card Shows**:
- ✅ Opening tasks (e.g., "Unlock doors", "Turn on lights")
- ✅ Mid-shift tasks with early due times (e.g., "Check fridge temp")
- ❌ Closing tasks (hidden until 2pm)

### Scenario 2: Afternoon (3:00pm)
**Current Phase**: `closing`  
**Allowed Types**: `['closing']`

**NOW Card Shows**:
- ❌ Opening tasks (already completed or hidden)
- ❌ Mid-shift tasks (hidden)
- ✅ Closing tasks (e.g., "Clean machines", "Cash up")

### Scenario 3: Critical Override (Any Time)
**Overdue P1 CRITICAL task exists**

**NOW Card Shows**:
- ✅ The overdue critical task (ALWAYS, regardless of phase)
- Phase filtering ignored for critical tasks

---

## Migration Applied

**File**: `007_phase_based_filtering.sql`

**Changes**:
1. Added `allowed_template_types` column to `shift_phases`
2. Set sensible defaults for existing phases
3. Updated `resolve_now_action()` to filter by phase + template type
4. Preserved critical task override logic

**To Apply**:
```bash
# Run migration
supabase db push

# Or manually
psql -d your_database -f supabase/migrations/007_phase_based_filtering.sql
```

---

## Coming Up Strip Behavior

**Coming Up is NOT filtered by phase** - it shows all pending tasks for the entire day.

This allows staff to see what's coming later, even if those tasks aren't actionable yet.

**Example at 9:00am**:
- NOW card: Opening task (phase-filtered)
- Coming Up: Shows mid-shift tasks (11am), closing tasks (5pm), etc.

---

## Testing Phase Filtering

### 1. Check Current Phase
```sql
SELECT get_current_phase('your-site-id');
-- Returns: 'opening' or 'trading' or 'closing'
```

### 2. Check Allowed Types
```sql
SELECT phase_name, start_time, end_time, allowed_template_types
FROM shift_phases
WHERE site_id = 'your-site-id'
ORDER BY start_time;
```

### 3. Test Resolver
```sql
SELECT * FROM resolve_now_action('your-session-id');
-- Should only return tasks matching current phase's allowed types
```

### 4. Verify Template Types
```sql
SELECT t.template_type, ti.title, ti.due_time
FROM template_items ti
JOIN templates t ON t.id = ti.template_id
ORDER BY t.template_type, ti.due_time;
```

---

## Admin Configuration Workflow

### Initial Setup (Per Site)
1. **Define Phases**
   - Create time ranges for your site's operational phases
   - Example: Opening (8:30-10am), Trading (10am-2pm), Closing (2-5:30pm)

2. **Map Template Types**
   - For each phase, select which template types are allowed
   - Use checkboxes for intuitive multi-select

3. **Create Templates**
   - Assign correct template_type when creating checklists
   - Opening tasks → template_type: 'opening'
   - Mid-shift tasks → template_type: 'mid'
   - Closing tasks → template_type: 'closing'

4. **Set Task Due Times**
   - Add due_time to tasks for priority ordering
   - Tasks without due_time still appear but lower priority

### Ongoing Management
- Adjust phase times seasonally (e.g., summer vs winter hours)
- Modify allowed types if workflow changes
- Add new template types as needed (e.g., 'deep_clean', 'stocktake')

---

## Best Practices

1. **Keep Phases Simple**
   - 3-4 phases per day is optimal
   - Too many phases = complex configuration

2. **Use Template Types Consistently**
   - Opening = Pre-service setup
   - Mid = During-service operations
   - Closing = Post-service shutdown

3. **Mark Critical Tasks Appropriately**
   - P1 CRITICAL = Must be done immediately
   - These bypass phase filtering

4. **Test After Changes**
   - Check resolver at different times of day
   - Verify tasks appear in correct phases

5. **Document Site-Specific Rules**
   - Each site may have different phase times
   - Keep notes on why certain types are allowed in each phase

---

## Future Admin UI Mockup

```
┌─────────────────────────────────────────────────────────┐
│ Phase Configuration - Penkey Café Brighton             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Timeline View:                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 8:30 ──── Opening ──── 10:00 ──── Trading ──── 14:00│ │
│ │        [Orange]              [Blue]                  │ │
│ │ 14:00 ──── Closing ──── 17:30                       │ │
│ │        [Purple]                                      │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Edit Phase: Opening (8:30am - 10:00am)                 │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Start Time: [08:30] ▼   End Time: [10:00] ▼        │ │
│ │                                                      │ │
│ │ Allowed Task Types:                                 │ │
│ │ ☑ Opening tasks                                     │ │
│ │ ☑ Mid-shift tasks                                   │ │
│ │ ☐ Closing tasks                                     │ │
│ │ ☐ Safety tasks                                      │ │
│ │ ☐ Cleaning tasks                                    │ │
│ │                                                      │ │
│ │ [Save Changes]  [Cancel]                            │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## Summary

✅ **Phase-based filtering implemented** (Option C)  
✅ **Template types + time ranges** work together  
✅ **Critical tasks always show** (safety first)  
✅ **Admin-configurable** via `shift_phases` table  
✅ **Coming Up unfiltered** (full day visibility)  
✅ **Sensible defaults** provided for common phases  

**Next Step**: Build admin UI for phase configuration in the admin panel.
