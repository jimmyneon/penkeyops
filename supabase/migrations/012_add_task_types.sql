-- ============================================
-- ADD TASK TYPE SYSTEM
-- Enables different task behaviors: tick, group, data_entry, recurring, incident
-- ============================================

-- Create task_type enum
CREATE TYPE task_type AS ENUM ('tick', 'group', 'data_entry', 'recurring', 'incident');

-- Add task_type column to template_items
ALTER TABLE template_items 
ADD COLUMN task_type task_type DEFAULT 'tick';

-- Add recurring task fields
ALTER TABLE template_items 
ADD COLUMN interval_minutes INTEGER,
ADD COLUMN active_window_start TIME,
ADD COLUMN active_window_end TIME,
ADD COLUMN max_occurrences INTEGER,
ADD COLUMN never_goes_red BOOLEAN DEFAULT false,
ADD COLUMN no_notifications BOOLEAN DEFAULT false;

-- Add check constraint for recurring tasks
ALTER TABLE template_items
ADD CONSTRAINT recurring_fields_check 
CHECK (
  (task_type = 'recurring' AND interval_minutes IS NOT NULL AND active_window_start IS NOT NULL AND active_window_end IS NOT NULL)
  OR task_type != 'recurring'
);

-- Backfill existing data
-- Update grouped tasks
UPDATE template_items 
SET task_type = 'group' 
WHERE linked_group_id IS NOT NULL;

-- Update data entry tasks (those requiring evidence)
UPDATE template_items 
SET task_type = 'data_entry' 
WHERE evidence_type != 'none' AND linked_group_id IS NULL;

-- Update temperature tasks specifically
UPDATE template_items 
SET task_type = 'data_entry'
WHERE (title ILIKE '%temperature%' OR title ILIKE '%temp%' OR description ILIKE '%temperature%')
  AND evidence_type = 'numeric'
  AND linked_group_id IS NULL;

-- Create index for task_type queries
CREATE INDEX idx_template_items_task_type ON template_items(task_type);

-- Add comments
COMMENT ON COLUMN template_items.task_type IS 'Type of task: tick (simple), group (linked microtasks), data_entry (requires evidence), recurring (rhythm tasks), incident (ad-hoc)';
COMMENT ON COLUMN template_items.interval_minutes IS 'For recurring tasks: how often task recurs (e.g., 60 for hourly)';
COMMENT ON COLUMN template_items.active_window_start IS 'For recurring tasks: time when recurring starts (e.g., 08:00)';
COMMENT ON COLUMN template_items.active_window_end IS 'For recurring tasks: time when recurring stops (e.g., 17:00)';
COMMENT ON COLUMN template_items.max_occurrences IS 'For recurring tasks: optional limit on occurrences per day';
COMMENT ON COLUMN template_items.never_goes_red IS 'For recurring tasks: if true, task never shows red/overdue (rhythm tasks)';
COMMENT ON COLUMN template_items.no_notifications IS 'For recurring tasks: if true, no notifications sent for this task';
