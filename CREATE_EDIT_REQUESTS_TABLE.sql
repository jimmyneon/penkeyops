-- Create edit_requests table for task edit approval workflow
CREATE TABLE IF NOT EXISTS edit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES checklist_results(id) ON DELETE CASCADE,
  task_title TEXT NOT NULL,
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_edit_requests_status ON edit_requests(status);
CREATE INDEX IF NOT EXISTS idx_edit_requests_requested_by ON edit_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_edit_requests_task_id ON edit_requests(task_id);
CREATE INDEX IF NOT EXISTS idx_edit_requests_created_at ON edit_requests(created_at DESC);

-- Add RLS policies
ALTER TABLE edit_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own edit requests
DROP POLICY IF EXISTS "Users can view their own edit requests" ON edit_requests;
CREATE POLICY "Users can view their own edit requests"
  ON edit_requests
  FOR SELECT
  TO authenticated
  USING (requested_by = auth.uid());

-- Users can create edit requests
DROP POLICY IF EXISTS "Users can create edit requests" ON edit_requests;
CREATE POLICY "Users can create edit requests"
  ON edit_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (requested_by = auth.uid());

-- Admins can view all edit requests
DROP POLICY IF EXISTS "Admins can view all edit requests" ON edit_requests;
CREATE POLICY "Admins can view all edit requests"
  ON edit_requests
  FOR SELECT
  TO authenticated
  USING (true);

-- Admins can update edit requests (approve/reject)
DROP POLICY IF EXISTS "Admins can update edit requests" ON edit_requests;
CREATE POLICY "Admins can update edit requests"
  ON edit_requests
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_edit_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS edit_requests_updated_at ON edit_requests;
CREATE TRIGGER edit_requests_updated_at
  BEFORE UPDATE ON edit_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_edit_requests_updated_at();
