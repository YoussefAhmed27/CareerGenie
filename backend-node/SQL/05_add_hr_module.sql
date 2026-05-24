-- HR Module Schema

CREATE TABLE IF NOT EXISTS workspace (
    workspace_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_by INT NOT NULL REFERENCES candidate(candidate_id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workspace_member (
    workspace_id INT NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
    candidate_id INT NOT NULL REFERENCES candidate(candidate_id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'Member', -- e.g., 'Admin', 'Member'
    joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (workspace_id, candidate_id)
);

CREATE TABLE IF NOT EXISTS job_opening (
    job_id SERIAL PRIMARY KEY,
    workspace_id INT NOT NULL REFERENCES workspace(workspace_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    department VARCHAR(100),
    type VARCHAR(50), -- e.g., 'Remote', 'Hybrid', 'On-site'
    description TEXT,
    requirements JSONB DEFAULT '[]',
    status VARCHAR(50) NOT NULL DEFAULT 'Active', -- e.g., 'Active', 'Draft', 'Closed'
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS job_candidate (
    job_candidate_id SERIAL PRIMARY KEY,
    job_id INT NOT NULL REFERENCES job_opening(job_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    score INT CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
    status VARCHAR(50) NOT NULL DEFAULT 'Review', -- 'Review', 'Recommended', 'Rejected', 'Hired'
    stage VARCHAR(50) NOT NULL DEFAULT 'CV Screen', -- 'CV Screen', 'AI Interview', 'Live Interview'
    source VARCHAR(100) DEFAULT 'Direct',
    metrics JSONB DEFAULT '{}', -- Store tech, comm, culture, confidence scores
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workspace_member_candidate ON workspace_member(candidate_id);
CREATE INDEX idx_job_opening_workspace ON job_opening(workspace_id);
CREATE INDEX idx_job_candidate_job ON job_candidate(job_id);
