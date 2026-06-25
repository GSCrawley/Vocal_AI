CREATE TABLE user_baseline_snapshot (
  snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  audio_processor_job_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  tier TEXT NOT NULL DEFAULT 'singing',
  result_json JSONB,
  vocal_range_json JSONB,
  metrics_json JSONB,
  voice_type TEXT,
  lowest_note_midi INT,
  highest_note_midi INT,
  comfortable_low_midi INT,
  comfortable_high_midi INT,
  recommended_key_midi INT,
  quality_flag TEXT,
  completed_at TIMESTAMPTZ,
  audio_deleted_at TIMESTAMPTZ,
  CONSTRAINT user_baseline_snapshot_unique_user_tier UNIQUE (user_id, tier)
);

CREATE INDEX user_baseline_snapshot_user_tier
  ON user_baseline_snapshot (user_id, tier, completed_at DESC);

ALTER TABLE user_baseline_snapshot ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_baseline_snapshot_select
  ON user_baseline_snapshot FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY user_baseline_snapshot_insert
  ON user_baseline_snapshot FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_baseline_snapshot_update
  ON user_baseline_snapshot FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE VIEW baseline_context_view AS
SELECT *
FROM user_baseline_snapshot s
WHERE s.status = 'complete' AND s.tier = 'singing'
ORDER BY s.completed_at DESC;

-- We don't have user_profiles yet, let's see if we should create it or alter it

-- For user_profiles, create it if it doesn't exist, else alter it
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS baseline_snapshot_id UUID REFERENCES user_baseline_snapshot(snapshot_id),
  ADD COLUMN IF NOT EXISTS baseline_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS recommended_starting_key_midi SMALLINT,
  ADD COLUMN IF NOT EXISTS voice_type TEXT;
