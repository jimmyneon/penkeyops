    -- Create items table for autocomplete suggestions in waste logs
    CREATE TABLE IF NOT EXISTS items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL UNIQUE,
      category TEXT,
      unit TEXT DEFAULT 'kg',
      usage_count INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Add indexes
    CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);
    CREATE INDEX IF NOT EXISTS idx_items_usage_count ON items(usage_count DESC);
    CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);

    -- Add RLS policies
    ALTER TABLE items ENABLE ROW LEVEL SECURITY;

    -- Users can view items
    DROP POLICY IF EXISTS "Users can view items" ON items;
    CREATE POLICY "Users can view items"
      ON items
      FOR SELECT
      TO authenticated
      USING (true);

    -- Users can insert items (auto-add new items when logging waste)
    DROP POLICY IF EXISTS "Users can insert items" ON items;
    CREATE POLICY "Users can insert items"
      ON items
      FOR INSERT
      TO authenticated
      WITH CHECK (true);

    -- Users can update usage count
    DROP POLICY IF EXISTS "Users can update items" ON items;
    CREATE POLICY "Users can update items"
      ON items
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);

    -- Insert common cafe items
    INSERT INTO items (name, category, unit) VALUES
      ('Milk', 'Dairy', 'L'),
      ('Bread', 'Bakery', 'loaf'),
      ('Eggs', 'Dairy', 'dozen'),
      ('Butter', 'Dairy', 'kg'),
      ('Cheese', 'Dairy', 'kg'),
      ('Tomatoes', 'Produce', 'kg'),
      ('Lettuce', 'Produce', 'head'),
      ('Onions', 'Produce', 'kg'),
      ('Potatoes', 'Produce', 'kg'),
      ('Chicken', 'Meat', 'kg'),
      ('Bacon', 'Meat', 'kg'),
      ('Sausages', 'Meat', 'kg'),
      ('Coffee Beans', 'Beverage', 'kg'),
      ('Tea Bags', 'Beverage', 'box'),
      ('Sugar', 'Pantry', 'kg'),
      ('Flour', 'Pantry', 'kg'),
      ('Pasta', 'Pantry', 'kg'),
      ('Rice', 'Pantry', 'kg')
    ON CONFLICT (name) DO NOTHING;

    -- Add trigger to update updated_at
    CREATE OR REPLACE FUNCTION update_items_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS items_updated_at ON items;
    CREATE TRIGGER items_updated_at
      BEFORE UPDATE ON items
      FOR EACH ROW
      EXECUTE FUNCTION update_items_updated_at();
