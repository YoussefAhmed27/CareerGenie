DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO admin;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE candidate (
    candidate_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(50),
    country VARCHAR(80),
    years_of_experience INT CHECK (years_of_experience >= 0),
    desired_role VARCHAR(120),
    profile_headline VARCHAR(200),
    bio_summary TEXT,
    linkedin_url TEXT,
    portfolio_url TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMP
);

ALTER TABLE candidate ADD COLUMN current_role VARCHAR(120);

CREATE TABLE subscription (
    subscription_id SERIAL PRIMARY KEY,
    candidate_id INT NOT NULL REFERENCES candidate(candidate_id) ON DELETE CASCADE,
    plan_name VARCHAR(80) NOT NULL,
    price_per_month NUMERIC(10,2) NOT NULL DEFAULT 0,
    start_date DATE,
    end_date DATE,
    status VARCHAR(40) NOT NULL DEFAULT 'ACTIVE'
);

CREATE TABLE cv_document (
    cv_id SERIAL PRIMARY KEY,
    candidate_id INT NOT NULL REFERENCES candidate(candidate_id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    source_type VARCHAR(80),
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    ats_score INT CHECK (ats_score IS NULL OR (ats_score >= 0 AND ats_score <= 100)),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE practice_session (
    practice_session_id SERIAL PRIMARY KEY,
    candidate_id INT NOT NULL REFERENCES candidate(candidate_id) ON DELETE CASCADE,
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMP,
    mode VARCHAR(60),
    status VARCHAR(40) NOT NULL DEFAULT 'ACTIVE',
    recording_url TEXT,
    transcript_text TEXT,
    language VARCHAR(40)
);

CREATE TABLE practice_feedback (
    feedback_id SERIAL PRIMARY KEY,
    practice_session_id INT NOT NULL UNIQUE REFERENCES practice_session(practice_session_id) ON DELETE CASCADE,
    overall_score INT CHECK (overall_score IS NULL OR (overall_score >= 0 AND overall_score <= 100)),
    technical_score INT CHECK (technical_score IS NULL OR (technical_score >= 0 AND technical_score <= 100)),
    communication_score INT CHECK (communication_score IS NULL OR (communication_score >= 0 AND communication_score <= 100)),
    confidence_score INT CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 100)),
    summary_text TEXT,
    recommendations_text TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE refresh_token (
    refresh_token_id SERIAL PRIMARY KEY,
    candidate_id INT NOT NULL REFERENCES candidate(candidate_id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ NULL,
    replaced_by INT NULL REFERENCES refresh_token(refresh_token_id)
);

CREATE INDEX idx_candidate_email ON candidate(email);
CREATE INDEX idx_practice_session_candidate ON practice_session(candidate_id);
CREATE INDEX idx_cv_candidate ON cv_document(candidate_id);

CREATE INDEX idx_refresh_token_candidate_id ON refresh_token(candidate_id);
CREATE INDEX idx_refresh_token_expires_at ON refresh_token(expires_at);