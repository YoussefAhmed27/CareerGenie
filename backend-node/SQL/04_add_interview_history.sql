CREATE TABLE IF NOT EXISTS interview_session (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id INT NOT NULL REFERENCES candidate(candidate_id) ON DELETE CASCADE,
    job_role VARCHAR(255) NOT NULL,
    interview_mode VARCHAR(50) NOT NULL, 
    overall_score NUMERIC(4, 2),         
    video_object_key VARCHAR(255),       
    feedback_data JSONB,                 
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE INDEX IF NOT EXISTS idx_interview_session_candidate_id ON interview_session(candidate_id);
CREATE INDEX IF NOT EXISTS idx_interview_session_created_at ON interview_session(created_at DESC);