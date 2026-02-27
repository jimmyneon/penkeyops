-- ============================================
-- RESOLVER SCHEMA UPDATES
-- Add fields needed for intelligent task resolution
-- ============================================

-- Add linked_group_id to template_items for parallel task groups
ALTER TABLE template_items 
ADD COLUMN IF NOT EXISTS linked_group_id TEXT,
ADD COLUMN IF NOT EXISTS grace_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_required BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS instruction TEXT;

-- Add dependency tracking
CREATE TABLE IF NOT EXISTS task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_item_id UUID REFERENCES template_items(id) ON DELETE CASCADE,
  depends_on_item_id UUID REFERENCES template_items(id) ON DELETE CASCADE,
  unlock_delay_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add task groups metadata
CREATE TABLE IF NOT EXISTS task_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add time phases configuration per site
CREATE TABLE IF NOT EXISTS shift_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  phase_name TEXT NOT NULL, -- 'pre_open', 'opening', 'trading', 'peak', 'closing', 'closed'
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(site_id, phase_name)
);

-- Add task unlock tracking (for timer-based dependencies)
CREATE TABLE IF NOT EXISTS task_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_result_id UUID REFERENCES checklist_results(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  unlocked_by_task_id UUID REFERENCES checklist_results(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for resolver performance
CREATE INDEX IF NOT EXISTS idx_template_items_linked_group ON template_items(linked_group_id) WHERE linked_group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_template_items_due_time ON template_items(due_time) WHERE due_time IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_checklist_results_status ON checklist_results(status);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_item ON task_dependencies(template_item_id);

-- Enable RLS
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_unlocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view task dependencies"
  ON task_dependencies FOR SELECT
  USING (true);

CREATE POLICY "Users can view task groups"
  ON task_groups FOR SELECT
  USING (true);

CREATE POLICY "Users can view shift phases for their site"
  ON shift_phases FOR SELECT
  USING (site_id = get_user_site());

CREATE POLICY "Users can view task unlocks"
  ON task_unlocks FOR SELECT
  USING (true);

CREATE POLICY "Users can create task unlocks"
  ON task_unlocks FOR INSERT
  WITH CHECK (true);

COMMENT ON TABLE task_dependencies IS 'Defines which tasks unlock after others (e.g., warm-up timers)';
COMMENT ON TABLE task_groups IS 'Metadata for linked task groups (parallel work)';
COMMENT ON TABLE shift_phases IS 'Time-based phases that control dashboard behavior';
COMMENT ON TABLE task_unlocks IS 'Tracks when timer-based tasks become available';
