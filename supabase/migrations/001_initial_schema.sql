-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('staff', 'admin');
CREATE TYPE priority_level AS ENUM ('P1', 'P2', 'P3');
CREATE TYPE evidence_type AS ENUM ('none', 'note', 'numeric', 'photo');
CREATE TYPE task_status AS ENUM ('pending', 'completed', 'blocked', 'skipped');

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'staff',
  site_id UUID,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SITES TABLE
-- ============================================
CREATE TABLE sites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key to users after sites is created
ALTER TABLE users ADD CONSTRAINT fk_users_site 
  FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE SET NULL;

-- ============================================
-- SHIFT SESSIONS TABLE
-- ============================================
CREATE TABLE shift_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  started_by UUID NOT NULL REFERENCES users(id),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_by UUID REFERENCES users(id),
  completed_at TIMESTAMPTZ,
  shift_type TEXT NOT NULL, -- 'opening', 'closing', 'mid'
  notes TEXT,
  is_complete BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TEMPLATES TABLE
-- ============================================
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT NOT NULL, -- 'opening', 'closing', 'cleaning', 'safety', etc.
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TEMPLATE ITEMS TABLE
-- ============================================
CREATE TABLE template_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority priority_level NOT NULL DEFAULT 'P2',
  is_critical BOOLEAN DEFAULT false,
  due_time TIME, -- Time of day when due
  grace_period_minutes INTEGER DEFAULT 0,
  evidence_type evidence_type DEFAULT 'none',
  depends_on UUID REFERENCES template_items(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}', -- For flexible additional data
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CHECKLIST INSTANCES TABLE
-- ============================================
CREATE TABLE checklist_instances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shift_session_id UUID NOT NULL REFERENCES shift_sessions(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES templates(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CHECKLIST RESULTS TABLE
-- ============================================
CREATE TABLE checklist_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  checklist_instance_id UUID NOT NULL REFERENCES checklist_instances(id) ON DELETE CASCADE,
  template_item_id UUID NOT NULL REFERENCES template_items(id),
  completed_by UUID REFERENCES users(id),
  completed_at TIMESTAMPTZ,
  status task_status DEFAULT 'pending',
  evidence_text TEXT,
  evidence_numeric DECIMAL(10,2),
  evidence_photo_url TEXT,
  blocked_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- LOG ENTRIES TABLE (Temperature, Safety, etc.)
-- ============================================
CREATE TABLE log_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shift_session_id UUID NOT NULL REFERENCES shift_sessions(id) ON DELETE CASCADE,
  log_type TEXT NOT NULL, -- 'fridge_temp', 'hot_holding', 'probe_calibration', 'waste', 'delivery'
  recorded_by UUID NOT NULL REFERENCES users(id),
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  data JSONB NOT NULL, -- Flexible storage for different log types
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INCIDENTS TABLE
-- ============================================
CREATE TABLE incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  shift_session_id UUID REFERENCES shift_sessions(id) ON DELETE SET NULL,
  reported_by UUID NOT NULL REFERENCES users(id),
  reported_at TIMESTAMPTZ DEFAULT NOW(),
  incident_type TEXT NOT NULL, -- 'equipment_failure', 'supplier_issue', 'safety', 'other'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT, -- 'low', 'medium', 'high', 'critical'
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  is_resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL, -- 'task_reminder', 'task_overdue', 'incident', 'system'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_id UUID, -- ID of related entity (task, incident, etc.)
  is_read BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AUDIT TRAIL TABLE
-- ============================================
CREATE TABLE audit_trail (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'create', 'update', 'delete', 'complete', etc.
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PUSH SUBSCRIPTIONS TABLE
-- ============================================
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_users_site ON users(site_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_shift_sessions_site ON shift_sessions(site_id);
CREATE INDEX idx_shift_sessions_started_at ON shift_sessions(started_at);
CREATE INDEX idx_templates_site ON templates(site_id);
CREATE INDEX idx_templates_type ON templates(template_type);
CREATE INDEX idx_template_items_template ON template_items(template_id);
CREATE INDEX idx_checklist_instances_session ON checklist_instances(shift_session_id);
CREATE INDEX idx_checklist_results_instance ON checklist_results(checklist_instance_id);
CREATE INDEX idx_checklist_results_status ON checklist_results(status);
CREATE INDEX idx_log_entries_session ON log_entries(shift_session_id);
CREATE INDEX idx_log_entries_type ON log_entries(log_type);
CREATE INDEX idx_incidents_site ON incidents(site_id);
CREATE INDEX idx_incidents_resolved ON incidents(is_resolved);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);
CREATE INDEX idx_audit_trail_user ON audit_trail(user_id);
CREATE INDEX idx_audit_trail_table ON audit_trail(table_name, record_id);

-- ============================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sites_updated_at BEFORE UPDATE ON sites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shift_sessions_updated_at BEFORE UPDATE ON shift_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_template_items_updated_at BEFORE UPDATE ON template_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_checklist_results_updated_at BEFORE UPDATE ON checklist_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON incidents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
