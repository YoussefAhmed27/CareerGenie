-- HR User table (separate from candidate)
CREATE TABLE IF NOT EXISTS hr_user (
    hr_user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    domain VARCHAR(150) NOT NULL, -- extracted from email e.g. "techcorp.com"
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMP
);

-- Add domain column to workspace for auto-grouping
ALTER TABLE workspace ADD COLUMN IF NOT EXISTS domain VARCHAR(150);
ALTER TABLE workspace ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);

-- Change workspace_member to reference hr_user instead of candidate
-- Drop old FK and add new one
ALTER TABLE workspace_member DROP CONSTRAINT IF EXISTS workspace_member_candidate_id_fkey;
ALTER TABLE workspace_member RENAME COLUMN candidate_id TO hr_user_id;
ALTER TABLE workspace_member ADD CONSTRAINT workspace_member_hr_user_id_fkey
    FOREIGN KEY (hr_user_id) REFERENCES hr_user(hr_user_id) ON DELETE CASCADE;

-- Refresh tokens for hr users
CREATE TABLE IF NOT EXISTS hr_refresh_token (
    hr_refresh_token_id SERIAL PRIMARY KEY,
    hr_user_id INT NOT NULL REFERENCES hr_user(hr_user_id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ NULL
);

-- Change workspace.created_by to reference hr_user
ALTER TABLE workspace DROP CONSTRAINT IF EXISTS workspace_created_by_fkey;
ALTER TABLE workspace ADD CONSTRAINT workspace_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES hr_user(hr_user_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_hr_user_email ON hr_user(email);
CREATE INDEX IF NOT EXISTS idx_hr_user_domain ON hr_user(domain);
CREATE INDEX IF NOT EXISTS idx_workspace_domain ON workspace(domain);
CREATE INDEX IF NOT EXISTS idx_workspace_member_hr_user ON workspace_member(hr_user_id);
CREATE INDEX IF NOT EXISTS idx_hr_refresh_token_user ON hr_refresh_token(hr_user_id);
