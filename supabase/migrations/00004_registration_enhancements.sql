-- EnduroRaceManager: Registration Enhancements
-- Adds racer photo, short UID for public racer links, and racer-photos storage bucket

-- 1. Add columns to racers table
ALTER TABLE racers
  ADD COLUMN photo_url TEXT,
  ADD COLUMN short_uid TEXT UNIQUE;

CREATE UNIQUE INDEX idx_racers_short_uid ON racers(short_uid) WHERE short_uid IS NOT NULL;

-- 2. Create storage bucket for racer photos
INSERT INTO storage.buckets (id, name, public) VALUES ('racer-photos', 'racer-photos', true);

-- Allow public upload and read for racer-photos
CREATE POLICY "public_upload_racer_photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'racer-photos');
CREATE POLICY "public_read_racer_photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'racer-photos');

-- 3. Function to generate unique short UID (8 hex chars)
CREATE OR REPLACE FUNCTION generate_short_uid()
RETURNS TEXT AS $$
DECLARE
  v_uid TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    v_uid := substr(md5(gen_random_uuid()::text), 1, 8);
    SELECT EXISTS(SELECT 1 FROM racers WHERE short_uid = v_uid) INTO v_exists;
    IF NOT v_exists THEN
      RETURN v_uid;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
