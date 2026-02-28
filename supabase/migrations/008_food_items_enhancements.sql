-- Enhance items table with site-specific data and better tracking
ALTER TABLE items ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES sites(id);
ALTER TABLE items ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE items ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

-- Add index for site filtering
CREATE INDEX IF NOT EXISTS idx_items_site_id ON items(site_id);

-- Update RLS to support site-specific items
DROP POLICY IF EXISTS "Users can view items" ON items;
CREATE POLICY "Users can view items"
  ON items
  FOR SELECT
  TO authenticated
  USING (
    site_id IS NULL OR 
    site_id IN (SELECT get_user_site())
  );

-- Function to increment usage count when item is used
CREATE OR REPLACE FUNCTION increment_item_usage(item_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE items 
  SET 
    usage_count = usage_count + 1,
    last_used_at = NOW()
  WHERE id = item_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search items with autocomplete
CREATE OR REPLACE FUNCTION search_items(search_term TEXT, site_filter UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  name TEXT,
  category TEXT,
  unit TEXT,
  usage_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.name,
    i.category,
    i.unit,
    i.usage_count
  FROM items i
  WHERE 
    i.is_active = true
    AND (site_filter IS NULL OR i.site_id IS NULL OR i.site_id = site_filter)
    AND i.name ILIKE '%' || search_term || '%'
  ORDER BY 
    i.usage_count DESC,
    i.name ASC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
