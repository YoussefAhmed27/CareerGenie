-- Additive HR AI interview invitation/result storage.

CREATE TABLE IF NOT EXISTS hr_ai_interview_invitation (
  invitation_id SERIAL PRIMARY KEY,
  job_candidate_id INT NOT NULL REFERENCES job_candidate(job_candidate_id) ON DELETE CASCADE,
  job_id INT NOT NULL REFERENCES job_opening(job_id) ON DELETE CASCADE,
  workspace_id INT NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'pending',
  interview_mode VARCHAR(50) NOT NULL DEFAULT 'comprehensive',
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  ai_session_id TEXT,
  invitation_url TEXT,
  created_by INT REFERENCES hr_user(hr_user_id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  expires_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hr_ai_interview_result (
  result_id SERIAL PRIMARY KEY,
  invitation_id INT NOT NULL UNIQUE REFERENCES hr_ai_interview_invitation(invitation_id) ON DELETE CASCADE,
  job_candidate_id INT NOT NULL REFERENCES job_candidate(job_candidate_id) ON DELETE CASCADE,
  job_id INT NOT NULL REFERENCES job_opening(job_id) ON DELETE CASCADE,
  workspace_id INT NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  ai_session_id TEXT,
  interview_mode VARCHAR(50),
  overall_score NUMERIC(5,2),
  video_object_key TEXT,
  feedback_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_ai_invitation_candidate ON hr_ai_interview_invitation(job_candidate_id);
CREATE INDEX IF NOT EXISTS idx_hr_ai_invitation_token_hash ON hr_ai_interview_invitation(token_hash);
CREATE INDEX IF NOT EXISTS idx_hr_ai_result_candidate ON hr_ai_interview_result(job_candidate_id);
