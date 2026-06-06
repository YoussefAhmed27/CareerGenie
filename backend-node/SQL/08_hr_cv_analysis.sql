-- Additive storage for HR CV-service ranking results.

ALTER TABLE job_candidate ADD COLUMN IF NOT EXISTS job_match_analysis JSONB NOT NULL DEFAULT '{}'::jsonb;
