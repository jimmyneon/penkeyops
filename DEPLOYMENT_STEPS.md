# Dashboard Resolver - Deployment Steps

## ✅ What's Been Built

### Database Layer
1. **004_resolver_schema.sql** - New tables and columns
2. **005_task_resolver.sql** - Resolver functions
3. **FIX_STUCK_SHIFT.sql** - Fixes current stuck shift

### UI Components (Created)
1. **NowCard.tsx** - 70% screen, dominant action card
2. **ComingUp.tsx** - Small strip showing 2-4 upcoming tasks
3. **TodayStatus.tsx** - Tiny phase indicators
4. **GroupChecklist.tsx** - Modal for linked task groups

### Documentation
1. **DASHBOARD_IMPLEMENTATION.md** - Full implementation plan
2. **DEPLOYMENT_STEPS.md** - This file

## 🚀 Deployment Steps (In Order)

### Step 1: Run Database Migrations
Open Supabase SQL Editor and run these files **in order**:

1. **004_resolver_schema.sql**
   - Adds new columns to `template_items`
   - Creates `task_groups`, `task_dependencies`, `shift_phases`, `task_unlocks` tables
   - Sets up RLS policies

2. **005_task_resolver.sql**
   - Creates `resolve_now_action()` function
   - Creates `get_coming_up_tasks()` function
   - Creates `get_group_tasks()` function
   - Creates `get_current_phase()` function

3. **FIX_STUCK_SHIFT.sql**
   - Fixes your current active shift
   - Creates missing checklist instance and tasks

### Step 2: Regenerate Database Types
After running migrations, regenerate TypeScript types:
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.ts
```

This will fix all the TypeScript errors you're seeing.

### Step 3: Update Sample Data
Run the updated `ADD_SAMPLE_DATA.sql` which will include:
- Task groups (e.g., "opening_prep", "safety_checks")
- Instructions for each task
- `linked_group_id` assignments
- Sample shift phases

### Step 4: Redesign Home Page
The home page (`app/page.tsx`) needs to be completely redesigned to use the new components:
- Remove QuickActions, WhatsNext, ProgressTracker, TaskList
- Add NowCard, ComingUp, TodayStatus
- Add GroupChecklist modal
- Add small "More" button for logs

### Step 5: Test
1. Start a new shift
2. Verify NOW card shows correct task
3. Complete a task, verify resolver updates
4. Test linked group flow
5. Verify Coming Up shows next tasks
6. Check Today Status indicators

## 📋 Current Status

- ✅ Database schema designed
- ✅ Resolver functions created
- ✅ UI components built
- ⏳ Home page redesign (next)
- ⏳ Sample data update (next)
- ⏳ Testing (after deployment)

## ⚠️ Known Issues

### TypeScript Errors (Expected)
All TypeScript errors related to RPC functions are expected until you:
1. Run the migrations
2. Regenerate database types

These errors won't prevent the code from working - they're just type checking issues.

### Lint Warnings
Function hoisting warnings are cosmetic and won't affect functionality.

## 🎯 Next Actions

**For You:**
1. Run the 3 SQL files in Supabase
2. Let me know when done

**For Me:**
1. Redesign home page layout
2. Update sample data with groups
3. Add "More" button for logs
4. Test the complete flow

## 📖 How It Works

### The Resolver
Every time the dashboard loads or a task completes:
1. `resolve_now_action(session_id)` runs
2. Ranks all pending tasks by priority
3. Returns the single best "NOW" action
4. UI renders that action in the NowCard

### Task Groups
When multiple tasks share a `linked_group_id`:
- Resolver may select the GROUP as NOW
- Clicking opens GroupChecklist modal
- Staff complete tasks in any order
- Returns to dashboard when all required tasks done

### Time Awareness
`get_current_phase(site_id)` checks current time against `shift_phases` table to determine behavior (opening, trading, peak, closing).

## 🔧 Troubleshooting

**Q: Dashboard shows "Loading..." forever**
A: Check browser console for errors. Likely the RPC functions haven't been created yet.

**Q: TypeScript errors everywhere**
A: Normal until you regenerate types after running migrations.

**Q: No tasks showing**
A: Run FIX_STUCK_SHIFT.sql to create tasks for your current session.

**Q: "All Done!" shows but tasks exist**
A: Resolver might not be finding tasks. Check that tasks have proper `is_required`, `priority`, etc.
