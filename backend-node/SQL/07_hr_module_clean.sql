-- Clean additive HR module schema for local demo.
-- Safe to run multiple times. No DROP, TRUNCATE, or table renames.

CREATE TABLE IF NOT EXISTS hr_user (
  hr_user_id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  domain VARCHAR(255) NOT NULL,
  position VARCHAR(100),
  is_workspace_owner BOOLEAN NOT NULL DEFAULT false,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE hr_user ADD COLUMN IF NOT EXISTS position VARCHAR(100);
ALTER TABLE hr_user ADD COLUMN IF NOT EXISTS is_workspace_owner BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE hr_user ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;
ALTER TABLE hr_user ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS workspace (
  workspace_id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  created_by INT NOT NULL REFERENCES hr_user(hr_user_id) ON DELETE CASCADE,
  domain VARCHAR(255),
  company_name VARCHAR(150),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE workspace ADD COLUMN IF NOT EXISTS domain VARCHAR(255);
ALTER TABLE workspace ADD COLUMN IF NOT EXISTS company_name VARCHAR(150);
ALTER TABLE workspace ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS workspace_member (
  workspace_id INT NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  hr_user_id INT NOT NULL REFERENCES hr_user(hr_user_id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'Member',
  joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, hr_user_id)
);

ALTER TABLE workspace_member ADD COLUMN IF NOT EXISTS role VARCHAR(50) NOT NULL DEFAULT 'Member';
ALTER TABLE workspace_member ADD COLUMN IF NOT EXISTS joined_at TIMESTAMP NOT NULL DEFAULT NOW();
ALTER TABLE workspace_member ADD COLUMN IF NOT EXISTS hr_user_id INT;

CREATE TABLE IF NOT EXISTS workspace_invite (
  invite_id SERIAL PRIMARY KEY,
  workspace_id INT NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  position VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'Member',
  token_hash TEXT UNIQUE,
  invitation_url TEXT,
  expires_at TIMESTAMP,
  accepted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE workspace_invite ADD COLUMN IF NOT EXISTS token_hash TEXT UNIQUE;
ALTER TABLE workspace_invite ADD COLUMN IF NOT EXISTS invitation_url TEXT;
ALTER TABLE workspace_invite ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;
ALTER TABLE workspace_invite ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_workspace_invite_token_hash ON workspace_invite(token_hash);

CREATE TABLE IF NOT EXISTS job_opening (
  job_id SERIAL PRIMARY KEY,
  workspace_id INT NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
  title VARCHAR(150) NOT NULL,
  department VARCHAR(100),
  type VARCHAR(50),
  description TEXT,
  requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
  status VARCHAR(50) NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE job_opening ADD COLUMN IF NOT EXISTS department VARCHAR(100);
ALTER TABLE job_opening ADD COLUMN IF NOT EXISTS type VARCHAR(50);
ALTER TABLE job_opening ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE job_opening ADD COLUMN IF NOT EXISTS requirements JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE job_opening ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'Active';
ALTER TABLE job_opening ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW();
ALTER TABLE job_opening ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS job_candidate (
  job_candidate_id SERIAL PRIMARY KEY,
  job_id INT NOT NULL REFERENCES job_opening(job_id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(255),
  score NUMERIC(5,2),
  status VARCHAR(50) NOT NULL DEFAULT 'Review',
  stage VARCHAR(50) NOT NULL DEFAULT 'CV Screen',
  source VARCHAR(100) NOT NULL DEFAULT 'Direct',
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  cv_filename TEXT,
  cv_text TEXT,
  cv_analysis JSONB NOT NULL DEFAULT '{}'::jsonb,
  job_match_analysis JSONB NOT NULL DEFAULT '{}'::jsonb,
  job_alignment_score NUMERIC(5,2),
  overall_cv_score NUMERIC(5,2),
  ranking_summary TEXT,
  shortlist_reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE job_candidate ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE job_candidate ADD COLUMN IF NOT EXISTS score NUMERIC(5,2);
ALTER TABLE job_candidate ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'Review';
ALTER TABLE job_candidate ADD COLUMN IF NOT EXISTS stage VARCHAR(50) NOT NULL DEFAULT 'CV Screen';
ALTER TABLE job_candidate ADD COLUMN IF NOT EXISTS source VARCHAR(100) NOT NULL DEFAULT 'Direct';
ALTER TABLE job_candidate ADD COLUMN IF NOT EXISTS metrics JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE job_candidate ADD COLUMN IF NOT EXISTS cv_filename TEXT;
ALTER TABLE job_candidate ADD COLUMN IF NOT EXISTS cv_text TEXT;
ALTER TABLE job_candidate ADD COLUMN IF NOT EXISTS cv_analysis JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE job_candidate ADD COLUMN IF NOT EXISTS job_match_analysis JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE job_candidate ADD COLUMN IF NOT EXISTS job_alignment_score NUMERIC(5,2);
ALTER TABLE job_candidate ADD COLUMN IF NOT EXISTS overall_cv_score NUMERIC(5,2);
ALTER TABLE job_candidate ADD COLUMN IF NOT EXISTS ranking_summary TEXT;
ALTER TABLE job_candidate ADD COLUMN IF NOT EXISTS shortlist_reason TEXT;
ALTER TABLE job_candidate ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW();
ALTER TABLE job_candidate ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS hr_refresh_token (
  hr_refresh_token_id SERIAL PRIMARY KEY,
  hr_user_id INT NOT NULL REFERENCES hr_user(hr_user_id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_user_domain ON hr_user(domain);
CREATE INDEX IF NOT EXISTS idx_workspace_domain ON workspace(domain);
CREATE INDEX IF NOT EXISTS idx_workspace_member_hr_user ON workspace_member(hr_user_id);
CREATE INDEX IF NOT EXISTS idx_job_opening_workspace ON job_opening(workspace_id);
CREATE INDEX IF NOT EXISTS idx_job_candidate_job ON job_candidate(job_id);
CREATE INDEX IF NOT EXISTS idx_hr_refresh_token_user ON hr_refresh_token(hr_user_id);
