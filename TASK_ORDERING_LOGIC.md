# Task Ordering Logic

## How Tasks Are Ordered in the NOW Card

The `resolve_now_action` function determines which task appears in the NOW card based on a priority system:

### Priority Order (Highest to Lowest)

1. **Overdue P1 CRITICAL tasks**
   - Tasks marked as critical (is_critical = true)
   - Priority P1
   - Past their due time
   - Ordered by: earliest due time first

2. **Due-soon P1 CRITICAL tasks**
   - Tasks marked as critical
   - Priority P1
   - Due within the next 15 minutes
   - Ordered by: earliest due time first

3. **Linked task groups**
   - Groups of tasks that should be done together
   - At least one task in the group is required
   - Ordered by: critical flag, priority, earliest due time

4. **Required tasks (by due time and priority)**
   - Tasks marked as required (is_required = true)
   - Ordered by:
     1. Critical flag (critical tasks first)
     2. Priority (P1, P2, P3)
     3. Due time (earliest first)
     4. Sort order (manual ordering within template)

5. **Any remaining pending tasks**
   - All other pending tasks
   - Ordered by:
     1. Priority (P1, P2, P3)
     2. Sort order (manual ordering within template)

## Sort Order Field

The `sort_order` field in `template_items` determines the order of tasks within the same priority level:
- **Lower numbers appear first** (0, 1, 2, 3...)
- Start Shift task has sort_order = 0 (first task)
- End of Day task has sort_order = 9999 (last task)
- Other tasks typically use sort_order = 1, 2, 3, etc.

## Coming Up Tasks

The "Coming Up" strip shows upcoming tasks ordered by:
1. Due time (earliest first)
2. Priority
3. Sort order

Limited to 100 tasks (configurable in the query).
