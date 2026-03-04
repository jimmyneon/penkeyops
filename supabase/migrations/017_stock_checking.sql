-- Stock Checking System Migration
-- Creates tables for inventory management with two-bucket system (freezer + service)

-- Drop existing tables if they exist (in reverse dependency order)
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS stock_current CASCADE;
DROP TABLE IF EXISTS stock_counts CASCADE;
DROP TABLE IF EXISTS stock_sessions CASCADE;
DROP TABLE IF EXISTS items CASCADE;

-- Items table: master list of stock items
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  location TEXT NOT NULL CHECK (location IN ('freezer', 'fridge', 'dry')),
  unit TEXT NOT NULL,
  supplier TEXT,
  active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  
  -- Admin planning fields
  service_par_tomorrow INTEGER DEFAULT 0,
  order_par INTEGER DEFAULT 0,
  freezer_low_threshold INTEGER DEFAULT 0,
  service_low_threshold INTEGER DEFAULT 0,
  bulk_trigger_level INTEGER DEFAULT 0,
  batch_yield INTEGER DEFAULT 0,
  pull_timing TEXT DEFAULT 'morning' CHECK (pull_timing IN ('night_before', 'morning')),
  is_freezer_item BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on item_id for foreign key references
CREATE UNIQUE INDEX idx_items_item_id ON items(item_id);

-- Stock sessions: tracks each stock check session
CREATE TABLE stock_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  site_id UUID REFERENCES sites(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'printed', 'scanned', 'applied', 'archived')),
  notes TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stock counts: parsed counts from each session
CREATE TABLE stock_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL REFERENCES stock_sessions(session_id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES items(item_id) ON DELETE CASCADE,
  freezer_count INTEGER,
  service_count INTEGER,
  source TEXT DEFAULT 'scan' CHECK (source IN ('scan', 'manual')),
  confidence DECIMAL(3,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, item_id)
);

-- Stock current: source of truth for current stock levels
CREATE TABLE stock_current (
  item_id TEXT PRIMARY KEY REFERENCES items(item_id) ON DELETE CASCADE,
  freezer_count INTEGER DEFAULT 0,
  service_count INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stock movements: logs transfers between buckets
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  session_id TEXT REFERENCES stock_sessions(session_id),
  item_id TEXT NOT NULL REFERENCES items(item_id),
  from_bucket TEXT NOT NULL CHECK (from_bucket IN ('freezer', 'service')),
  to_bucket TEXT NOT NULL CHECK (to_bucket IN ('freezer', 'service')),
  qty INTEGER NOT NULL,
  note TEXT
);

-- Indexes for performance
CREATE INDEX idx_items_active ON items(active) WHERE active = true;
CREATE INDEX idx_items_sort_order ON items(sort_order);
CREATE INDEX idx_stock_sessions_status ON stock_sessions(status);
CREATE INDEX idx_stock_sessions_created_at ON stock_sessions(created_at DESC);
CREATE INDEX idx_stock_counts_session ON stock_counts(session_id);
CREATE INDEX idx_stock_movements_session ON stock_movements(session_id);
CREATE INDEX idx_stock_movements_item ON stock_movements(item_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stock_sessions_updated_at BEFORE UPDATE ON stock_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stock_current_updated_at BEFORE UPDATE ON stock_current
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies (simple: authenticated users only)
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_current ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read items" ON items
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage items" ON items
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read stock_sessions" ON stock_sessions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage stock_sessions" ON stock_sessions
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read stock_counts" ON stock_counts
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage stock_counts" ON stock_counts
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read stock_current" ON stock_current
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage stock_current" ON stock_current
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read stock_movements" ON stock_movements
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage stock_movements" ON stock_movements
  FOR ALL USING (auth.role() = 'authenticated');

-- Seed some example items
INSERT INTO items (item_id, name, location, unit, supplier, is_freezer_item, service_par_tomorrow, order_par, freezer_low_threshold, pull_timing, batch_yield, sort_order) VALUES
  ('FRZ_HOG_PORK_PORT', 'Hog Roast Pork Portions', 'freezer', 'portions', 'butcher', true, 20, 50, 10, 'night_before', 12, 1),
  ('FRZ_BACON_PACKS', 'Bacon Packs', 'freezer', 'packs', 'butcher', true, 5, 15, 3, 'morning', 6, 2),
  ('SVC_MILK_BOTTLES', 'Milk Bottles', 'fridge', 'bottles', 'dairy', false, 12, 20, 5, 'morning', 0, 3),
  ('SVC_BREAD_LOAVES', 'Bread Loaves', 'fridge', 'loaves', 'bakery', false, 8, 15, 3, 'morning', 0, 4),
  ('DRY_COFFEE_BAGS', 'Coffee Bags', 'dry', 'bags', 'coffee_supplier', false, 5, 10, 2, 'morning', 0, 5);

COMMENT ON TABLE items IS 'Master list of stock items with par levels and configuration';
COMMENT ON TABLE stock_sessions IS 'Tracks each stock check session from creation to completion';
COMMENT ON TABLE stock_counts IS 'Parsed counts from scanned sheets for each session';
COMMENT ON TABLE stock_current IS 'Current source of truth for stock levels (freezer + service buckets)';
COMMENT ON TABLE stock_movements IS 'Audit log of transfers between freezer and service buckets';
