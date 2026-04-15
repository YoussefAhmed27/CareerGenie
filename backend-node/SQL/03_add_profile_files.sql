-- 1. Add missing candidate columns
ALTER TABLE candidate
ADD COLUMN IF NOT EXISTS photo_data BYTEA,
ADD COLUMN IF NOT EXISTS photo_mime_type TEXT,
ADD COLUMN IF NOT EXISTS photo_filename TEXT,
ADD COLUMN IF NOT EXISTS cv_data BYTEA,
ADD COLUMN IF NOT EXISTS cv_mime_type TEXT,
ADD COLUMN IF NOT EXISTS cv_filename TEXT,
ADD COLUMN IF NOT EXISTS google_sub VARCHAR(255);

-- 2. Allow Google users (no password)
ALTER TABLE candidate ALTER COLUMN password_hash DROP NOT NULL;

-- 3. Create/Update the Reset Table with EVERYTHING the backend wants
CREATE TABLE IF NOT EXISTS password_reset_token (
    password_reset_token_id SERIAL PRIMARY KEY, 
    candidate_id INT NOT NULL REFERENCES candidate(candidate_id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    used_at TIMESTAMPTZ -- <--- THIS IS THE MISSING PIECE
);

-- 4. Fix for existing tables if the table already existed without the column
ALTER TABLE password_reset_token ADD COLUMN IF NOT EXISTS used_at TIMESTAMPTZ;

-- 5. Index
CREATE INDEX IF NOT EXISTS idx_password_reset_token_candidate_id ON password_reset_token(candidate_id);