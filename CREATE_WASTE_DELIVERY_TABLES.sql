  -- Create waste_logs table
  CREATE TABLE IF NOT EXISTS waste_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_name TEXT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit TEXT NOT NULL,
    reason TEXT NOT NULL,
    notes TEXT,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    recorded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Add RLS for waste_logs
  ALTER TABLE waste_logs ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "Users can view waste logs" ON waste_logs;
  CREATE POLICY "Users can view waste logs"
    ON waste_logs
    FOR SELECT
    TO authenticated
    USING (true);

  DROP POLICY IF EXISTS "Users can insert waste logs" ON waste_logs;
  CREATE POLICY "Users can insert waste logs"
    ON waste_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

  -- Create delivery_logs table
  CREATE TABLE IF NOT EXISTS delivery_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_name TEXT NOT NULL,
    items_received TEXT[],
    delivery_time TIMESTAMPTZ,
    received_by TEXT,
    temperature_ok BOOLEAN DEFAULT true,
    packaging_ok BOOLEAN DEFAULT true,
    quality_ok BOOLEAN DEFAULT true,
    notes TEXT,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Add RLS for delivery_logs
  ALTER TABLE delivery_logs ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "Users can view delivery logs" ON delivery_logs;
  CREATE POLICY "Users can view delivery logs"
    ON delivery_logs
    FOR SELECT
    TO authenticated
    USING (true);

  DROP POLICY IF EXISTS "Users can insert delivery logs" ON delivery_logs;
  CREATE POLICY "Users can insert delivery logs"
    ON delivery_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

  -- Add indexes
  CREATE INDEX IF NOT EXISTS idx_waste_logs_recorded_at ON waste_logs(recorded_at DESC);
  CREATE INDEX IF NOT EXISTS idx_delivery_logs_recorded_at ON delivery_logs(recorded_at DESC);
