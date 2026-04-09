CREATE TABLE IF NOT EXISTS refresh_token (
    refresh_token_id SERIAL PRIMARY KEY,
    candidate_id INT NOT NULL REFERENCES candidate(candidate_id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ NULL,
    replaced_by INT NULL REFERENCES refresh_token(refresh_token_id)
);

CREATE INDEX IF NOT EXISTS idx_refresh_token_candidate_id ON refresh_token(candidate_id);
CREATE INDEX IF NOT EXISTS idx_refresh_token_expires_at ON refresh_token(expires_at);