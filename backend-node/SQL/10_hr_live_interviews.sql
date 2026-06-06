-- Additive HR live interview room storage.

CREATE TABLE IF NOT EXISTS hr_live_interview_room (
  room_id SERIAL PRIMARY KEY,
  job_candidate_id INT NOT NULL REFERENCES job_candidate(job_candidate_id) ON DELETE CASCADE,
  job_id INT NOT NULL REFERENCES job_opening(job_id) ON DELETE CASCADE,
  workspace_id INT NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'scheduled',
  scheduled_at TIMESTAMP,
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  room_url TEXT,
  whereby_meeting_id TEXT,
  whereby_room_url TEXT,
  whereby_host_room_url TEXT,
  created_by INT REFERENCES hr_user(hr_user_id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_live_room_candidate ON hr_live_interview_room(job_candidate_id);
CREATE INDEX IF NOT EXISTS idx_hr_live_room_token_hash ON hr_live_interview_room(token_hash);
CREATE INDEX IF NOT EXISTS idx_hr_live_room_status ON hr_live_interview_room(status);
