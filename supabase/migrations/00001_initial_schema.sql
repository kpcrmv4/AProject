-- EnduroRaceManager: Initial Schema
-- 10 tables ตาม blueprint section 4

-- ========================
-- 1. Events: ข้อมูลหลักงานแข่ง
-- ========================
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  race_date DATE NOT NULL,
  registration_opens TIMESTAMPTZ,
  registration_closes TIMESTAMPTZ,
  payment_qr_url TEXT,
  published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_events_slug ON events(slug);
CREATE INDEX idx_events_admin ON events(admin_id);

-- ========================
-- 2. Classes: รุ่นการแข่งขัน
-- ========================
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  fee NUMERIC(10,2) DEFAULT 0,
  number_start INTEGER NOT NULL,
  number_end INTEGER NOT NULL,
  number_format TEXT DEFAULT '000',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_classes_event ON classes(event_id);

-- ========================
-- 3. Checkpoints: จุดจับเวลา
-- ========================
CREATE TABLE checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  access_code TEXT NOT NULL,
  code_expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_checkpoints_event ON checkpoints(event_id);
CREATE INDEX idx_checkpoints_code ON checkpoints(access_code);

-- ========================
-- 4. Class-Checkpoint Mapping
-- ========================
CREATE TABLE class_checkpoints (
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  checkpoint_id UUID NOT NULL REFERENCES checkpoints(id) ON DELETE CASCADE,
  PRIMARY KEY (class_id, checkpoint_id)
);

-- ========================
-- 5. Racers: นักแข่ง
-- ========================
CREATE TABLE racers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  team TEXT,
  bike TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_racers_event ON racers(event_id);

-- ========================
-- 6. Racer-Class Registration
-- ========================
CREATE TABLE racer_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  racer_id UUID NOT NULL REFERENCES racers(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  race_number INTEGER NOT NULL,
  payment_slip_url TEXT,
  confirmed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (class_id, race_number)
);
CREATE INDEX idx_racer_classes_racer ON racer_classes(racer_id);
CREATE INDEX idx_racer_classes_class ON racer_classes(class_id);

-- ========================
-- 7. Timestamps: บันทึกเวลา
-- ========================
CREATE TABLE timestamps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkpoint_id UUID NOT NULL REFERENCES checkpoints(id) ON DELETE CASCADE,
  racer_id UUID NOT NULL REFERENCES racers(id) ON DELETE CASCADE,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (checkpoint_id, racer_id)
);
CREATE INDEX idx_timestamps_checkpoint ON timestamps(checkpoint_id);
CREATE INDEX idx_timestamps_racer ON timestamps(racer_id);

-- ========================
-- 8. Audit Logs: บันทึกทุกการกระทำ (immutable)
-- ========================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id),
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  old_value JSONB,
  new_value JSONB,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_audit_event ON audit_logs(event_id);
CREATE INDEX idx_audit_target ON audit_logs(target_type, target_id);

-- ========================
-- 9. DNF Records
-- ========================
CREATE TABLE dnf_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  racer_id UUID NOT NULL REFERENCES racers(id) ON DELETE CASCADE UNIQUE,
  checkpoint_id UUID REFERENCES checkpoints(id),
  reason TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- 10. Penalties
-- ========================
CREATE TABLE penalties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  racer_id UUID NOT NULL REFERENCES racers(id) ON DELETE CASCADE,
  seconds INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_penalties_racer ON penalties(racer_id);

-- ========================
-- Auto-update updated_at trigger
-- ========================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
