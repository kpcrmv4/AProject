-- EnduroRaceManager: Row Level Security Policies

-- Enable RLS on all tables
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE racers ENABLE ROW LEVEL SECURITY;
ALTER TABLE racer_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE timestamps ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE dnf_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE penalties ENABLE ROW LEVEL SECURITY;

-- ========================
-- Events Policies
-- ========================
-- Admin: full access to own events
CREATE POLICY "admin_events_select" ON events
  FOR SELECT USING (admin_id = auth.uid());
CREATE POLICY "admin_events_insert" ON events
  FOR INSERT WITH CHECK (admin_id = auth.uid());
CREATE POLICY "admin_events_update" ON events
  FOR UPDATE USING (admin_id = auth.uid());
CREATE POLICY "admin_events_delete" ON events
  FOR DELETE USING (admin_id = auth.uid());
-- Public: read published events
CREATE POLICY "public_events_select" ON events
  FOR SELECT USING (published = true);

-- ========================
-- Classes Policies
-- ========================
-- Admin: manage classes of own events
CREATE POLICY "admin_classes_all" ON classes
  FOR ALL USING (
    event_id IN (SELECT id FROM events WHERE admin_id = auth.uid())
  );
-- Public: read classes of published events
CREATE POLICY "public_classes_select" ON classes
  FOR SELECT USING (
    event_id IN (SELECT id FROM events WHERE published = true)
  );

-- ========================
-- Checkpoints Policies
-- ========================
-- Admin: manage checkpoints of own events
CREATE POLICY "admin_checkpoints_all" ON checkpoints
  FOR ALL USING (
    event_id IN (SELECT id FROM events WHERE admin_id = auth.uid())
  );
-- Service role handles staff access (validated in API)

-- ========================
-- Class-Checkpoints Policies
-- ========================
CREATE POLICY "admin_class_checkpoints_all" ON class_checkpoints
  FOR ALL USING (
    class_id IN (
      SELECT c.id FROM classes c
      JOIN events e ON c.event_id = e.id
      WHERE e.admin_id = auth.uid()
    )
  );
CREATE POLICY "public_class_checkpoints_select" ON class_checkpoints
  FOR SELECT USING (
    class_id IN (
      SELECT c.id FROM classes c
      JOIN events e ON c.event_id = e.id
      WHERE e.published = true
    )
  );

-- ========================
-- Racers Policies
-- ========================
-- Admin: read racers of own events
CREATE POLICY "admin_racers_all" ON racers
  FOR ALL USING (
    event_id IN (SELECT id FROM events WHERE admin_id = auth.uid())
  );
-- Public: insert (registration) to published events
CREATE POLICY "public_racers_insert" ON racers
  FOR INSERT WITH CHECK (
    event_id IN (SELECT id FROM events WHERE published = true)
  );
-- Public: read racers of published events (for results)
CREATE POLICY "public_racers_select" ON racers
  FOR SELECT USING (
    event_id IN (SELECT id FROM events WHERE published = true)
  );

-- ========================
-- Racer-Classes Policies
-- ========================
CREATE POLICY "admin_racer_classes_all" ON racer_classes
  FOR ALL USING (
    racer_id IN (
      SELECT r.id FROM racers r
      JOIN events e ON r.event_id = e.id
      WHERE e.admin_id = auth.uid()
    )
  );
CREATE POLICY "public_racer_classes_insert" ON racer_classes
  FOR INSERT WITH CHECK (
    class_id IN (
      SELECT c.id FROM classes c
      JOIN events e ON c.event_id = e.id
      WHERE e.published = true
    )
  );
CREATE POLICY "public_racer_classes_select" ON racer_classes
  FOR SELECT USING (
    racer_id IN (
      SELECT r.id FROM racers r
      JOIN events e ON r.event_id = e.id
      WHERE e.published = true
    )
  );

-- ========================
-- Timestamps Policies
-- ========================
-- Admin: full access to timestamps of own events
CREATE POLICY "admin_timestamps_all" ON timestamps
  FOR ALL USING (
    checkpoint_id IN (
      SELECT cp.id FROM checkpoints cp
      JOIN events e ON cp.event_id = e.id
      WHERE e.admin_id = auth.uid()
    )
  );
-- Public: read timestamps of published events (for results)
CREATE POLICY "public_timestamps_select" ON timestamps
  FOR SELECT USING (
    checkpoint_id IN (
      SELECT cp.id FROM checkpoints cp
      JOIN events e ON cp.event_id = e.id
      WHERE e.published = true
    )
  );
-- Staff timestamps handled via service role key in API

-- ========================
-- Audit Logs Policies (read-only for admin)
-- ========================
CREATE POLICY "admin_audit_select" ON audit_logs
  FOR SELECT USING (
    event_id IN (SELECT id FROM events WHERE admin_id = auth.uid())
  );
-- Insert via service role only (from API)

-- ========================
-- DNF Records Policies
-- ========================
CREATE POLICY "admin_dnf_all" ON dnf_records
  FOR ALL USING (
    racer_id IN (
      SELECT r.id FROM racers r
      JOIN events e ON r.event_id = e.id
      WHERE e.admin_id = auth.uid()
    )
  );
CREATE POLICY "public_dnf_select" ON dnf_records
  FOR SELECT USING (
    racer_id IN (
      SELECT r.id FROM racers r
      JOIN events e ON r.event_id = e.id
      WHERE e.published = true
    )
  );

-- ========================
-- Penalties Policies
-- ========================
CREATE POLICY "admin_penalties_all" ON penalties
  FOR ALL USING (
    racer_id IN (
      SELECT r.id FROM racers r
      JOIN events e ON r.event_id = e.id
      WHERE e.admin_id = auth.uid()
    )
  );
CREATE POLICY "public_penalties_select" ON penalties
  FOR SELECT USING (
    racer_id IN (
      SELECT r.id FROM racers r
      JOIN events e ON r.event_id = e.id
      WHERE e.published = true
    )
  );

-- ========================
-- Storage Policies (payment slips, QR codes)
-- ========================
-- Create storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-slips', 'payment-slips', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('event-assets', 'event-assets', true);

-- Allow public upload to payment-slips
CREATE POLICY "public_upload_slips" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'payment-slips');
CREATE POLICY "public_read_slips" ON storage.objects
  FOR SELECT USING (bucket_id IN ('payment-slips', 'event-assets'));
CREATE POLICY "admin_manage_assets" ON storage.objects
  FOR ALL USING (bucket_id = 'event-assets' AND auth.uid() IS NOT NULL);
