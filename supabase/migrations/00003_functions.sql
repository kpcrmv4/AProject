-- EnduroRaceManager: Database Functions

-- ========================
-- Auto-assign race number for a class
-- ========================
CREATE OR REPLACE FUNCTION get_next_race_number(p_class_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_start INTEGER;
  v_end INTEGER;
  v_next INTEGER;
BEGIN
  SELECT number_start, number_end INTO v_start, v_end
  FROM classes WHERE id = p_class_id;

  SELECT COALESCE(MAX(race_number), v_start - 1) + 1 INTO v_next
  FROM racer_classes WHERE class_id = p_class_id;

  IF v_next > v_end THEN
    RAISE EXCEPTION 'Race numbers exhausted for this class (max: %)', v_end;
  END IF;

  RETURN v_next;
END;
$$ LANGUAGE plpgsql;

-- ========================
-- Validate staff access code
-- ========================
CREATE OR REPLACE FUNCTION validate_access_code(p_code TEXT)
RETURNS TABLE(checkpoint_id UUID, checkpoint_name TEXT, event_id UUID, event_name TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT cp.id, cp.name, e.id, e.name
  FROM checkpoints cp
  JOIN events e ON cp.event_id = e.id
  WHERE cp.access_code = p_code
    AND cp.code_expires_at >= NOW()
    AND e.published = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================
-- Record timestamp (server time only)
-- ========================
CREATE OR REPLACE FUNCTION record_timestamp(
  p_checkpoint_id UUID,
  p_racer_id UUID,
  p_recorded_by TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO timestamps (checkpoint_id, racer_id, recorded_at, recorded_by)
  VALUES (p_checkpoint_id, p_racer_id, NOW(), p_recorded_by)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================
-- Enable realtime for key tables
-- ========================
ALTER PUBLICATION supabase_realtime ADD TABLE timestamps;
ALTER PUBLICATION supabase_realtime ADD TABLE racers;
ALTER PUBLICATION supabase_realtime ADD TABLE dnf_records;
ALTER PUBLICATION supabase_realtime ADD TABLE penalties;
