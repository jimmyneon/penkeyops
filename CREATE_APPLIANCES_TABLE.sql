-- Create temperature_logs table first if it doesn't exist
CREATE TABLE IF NOT EXISTS temperature_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_result_id UUID REFERENCES checklist_results(id) ON DELETE CASCADE,
  temperature DECIMAL(5,2) NOT NULL,
  notes TEXT,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS for temperature_logs
ALTER TABLE temperature_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view temperature logs" ON temperature_logs;
CREATE POLICY "Users can view temperature logs"
  ON temperature_logs
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert temperature logs" ON temperature_logs;
CREATE POLICY "Users can insert temperature logs"
  ON temperature_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create appliances table for managing fridges, freezers, etc.
-- This allows each site to configure their own appliances

CREATE TABLE IF NOT EXISTS appliances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('fridge', 'freezer')),
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_appliances_site_id ON appliances(site_id);
CREATE INDEX IF NOT EXISTS idx_appliances_type ON appliances(type);
CREATE INDEX IF NOT EXISTS idx_appliances_active ON appliances(is_active);

-- Add RLS policies
ALTER TABLE appliances ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view all appliances
DROP POLICY IF EXISTS "Users can view appliances" ON appliances;
CREATE POLICY "Users can view appliances"
  ON appliances
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to manage appliances
DROP POLICY IF EXISTS "Users can manage appliances" ON appliances;
CREATE POLICY "Users can manage appliances"
  ON appliances
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Update temperature_logs to reference appliance_id
ALTER TABLE temperature_logs 
  ADD COLUMN IF NOT EXISTS appliance_id UUID REFERENCES appliances(id) ON DELETE SET NULL;

-- Create index on appliance_id (already has IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_temperature_logs_appliance_id ON temperature_logs(appliance_id);

-- Insert default appliances for existing sites
-- This will create 3 fridges and 3 freezers for each site
INSERT INTO appliances (site_id, name, type, sort_order)
SELECT 
  s.id,
  'Fridge ' || n.num,
  'fridge',
  n.num
FROM sites s
CROSS JOIN (SELECT generate_series(1, 3) AS num) n
WHERE NOT EXISTS (
  SELECT 1 FROM appliances WHERE site_id = s.id AND type = 'fridge'
);

INSERT INTO appliances (site_id, name, type, sort_order)
SELECT 
  s.id,
  'Freezer ' || n.num,
  'freezer',
  n.num + 10
FROM sites s
CROSS JOIN (SELECT generate_series(1, 3) AS num) n
WHERE NOT EXISTS (
  SELECT 1 FROM appliances WHERE site_id = s.id AND type = 'freezer'
);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_appliances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS appliances_updated_at ON appliances;
CREATE TRIGGER appliances_updated_at
  BEFORE UPDATE ON appliances
  FOR EACH ROW
  EXECUTE FUNCTION update_appliances_updated_at();
