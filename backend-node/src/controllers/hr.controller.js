const pool = require("../db");

// ─── WORKSPACE ──────────────────────────────────────────────────────────────

exports.getOrCreateWorkspace = async (req, res, next) => {
  const hrUserId = req.hrUser.id;
  try {
    let result = await pool.query(
      `SELECT w.* FROM workspace w
       JOIN workspace_member wm ON w.workspace_id = wm.workspace_id
       WHERE wm.hr_user_id = $1
       ORDER BY w.created_at ASC LIMIT 1`,
      [hrUserId]
    );

    if (result.rows.length === 0) {
      const name = req.body.name || "My Workspace";
      const ws = await pool.query(
        `INSERT INTO workspace (name, created_by) VALUES ($1, $2) RETURNING *`,
        [name, hrUserId]
      );
      const wsId = ws.rows[0].workspace_id;
      await pool.query(
        `INSERT INTO workspace_member (workspace_id, hr_user_id, role) VALUES ($1, $2, 'Admin')`,
        [wsId, hrUserId]
      );
      result = await pool.query(`SELECT * FROM workspace WHERE workspace_id = $1`, [wsId]);
    }

    const workspace = result.rows[0];
    const members = await pool.query(
      `SELECT h.hr_user_id, h.full_name, h.email, wm.role
       FROM workspace_member wm
       JOIN hr_user h ON h.hr_user_id = wm.hr_user_id
       WHERE wm.workspace_id = $1`,
      [workspace.workspace_id]
    );
    res.json({ workspace, members: members.rows });
  } catch (err) {
    next(err);
  }
};

exports.joinWorkspace = async (req, res, next) => {
  const hrUserId = req.hrUser.id;
  const { workspace_id } = req.body;
  try {
    const existing = await pool.query(
      `SELECT 1 FROM workspace_member WHERE workspace_id = $1 AND hr_user_id = $2`,
      [workspace_id, hrUserId]
    );
    if (existing.rows.length > 0) return res.json({ message: "Already a member" });
    await pool.query(
      `INSERT INTO workspace_member (workspace_id, hr_user_id, role) VALUES ($1, $2, 'Member')`,
      [workspace_id, hrUserId]
    );
    res.json({ message: "Joined workspace successfully" });
  } catch (err) {
    next(err);
  }
};

exports.removeMember = async (req, res, next) => {
  const { workspace_id, member_id } = req.params;
  try {
    await pool.query(
      `DELETE FROM workspace_member WHERE workspace_id = $1 AND hr_user_id = $2`,
      [workspace_id, member_id]
    );
    res.json({ message: "Member removed" });
  } catch (err) {
    next(err);
  }
};

// ─── JOBS ────────────────────────────────────────────────────────────────────

exports.getJobs = async (req, res, next) => {
  const hrUserId = req.hrUser.id;
  try {
    const ws = await pool.query(
      `SELECT w.workspace_id FROM workspace w
       JOIN workspace_member wm ON w.workspace_id = wm.workspace_id
       WHERE wm.hr_user_id = $1 LIMIT 1`,
      [hrUserId]
    );
    if (ws.rows.length === 0) return res.json([]);
    const workspaceId = ws.rows[0].workspace_id;

    const jobs = await pool.query(
      `SELECT j.*,
         (SELECT COUNT(*) FROM job_candidate jc WHERE jc.job_id = j.job_id) AS candidates,
         (SELECT COUNT(*) FROM job_candidate jc WHERE jc.job_id = j.job_id AND jc.stage != 'CV Screen') AS screened
       FROM job_opening j
       WHERE j.workspace_id = $1
       ORDER BY j.created_at DESC`,
      [workspaceId]
    );
    res.json(jobs.rows);
  } catch (err) {
    next(err);
  }
};

exports.createJob = async (req, res, next) => {
  const hrUserId = req.hrUser.id;
  const { title, department, type, description, requirements } = req.body;
  try {
    const ws = await pool.query(
      `SELECT w.workspace_id FROM workspace w
       JOIN workspace_member wm ON w.workspace_id = wm.workspace_id
       WHERE wm.hr_user_id = $1 LIMIT 1`,
      [hrUserId]
    );
    if (ws.rows.length === 0) return res.status(400).json({ error: "No workspace found." });
    const workspaceId = ws.rows[0].workspace_id;

    const result = await pool.query(
      `INSERT INTO job_opening (workspace_id, title, department, type, description, requirements, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'Active') RETURNING *`,
      [workspaceId, title, department, type, description, JSON.stringify(requirements || [])]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.updateJobStatus = async (req, res, next) => {
  const { job_id } = req.params;
  const { status } = req.body;
  try {
    const result = await pool.query(
      `UPDATE job_opening SET status = $1 WHERE job_id = $2 RETURNING *`,
      [status, job_id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.deleteJob = async (req, res, next) => {
  const { job_id } = req.params;
  try {
    await pool.query(`DELETE FROM job_opening WHERE job_id = $1`, [job_id]);
    res.json({ message: "Job deleted" });
  } catch (err) {
    next(err);
  }
};

// ─── CANDIDATES ──────────────────────────────────────────────────────────────

exports.getCandidates = async (req, res, next) => {
  const { job_id } = req.params;
  try {
    const result = await pool.query(
      `SELECT * FROM job_candidate WHERE job_id = $1 ORDER BY score DESC NULLS LAST`,
      [job_id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

exports.addCandidate = async (req, res, next) => {
  const { job_id } = req.params;
  const { name, email, score, status, stage, source, metrics } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO job_candidate (job_id, name, email, score, status, stage, source, metrics)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [job_id, name, email, score, status || 'Review', stage || 'CV Screen', source || 'Direct', JSON.stringify(metrics || {})]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.updateCandidate = async (req, res, next) => {
  const { job_candidate_id } = req.params;
  const { status, stage, score, metrics } = req.body;
  try {
    const result = await pool.query(
      `UPDATE job_candidate SET status = COALESCE($1, status), stage = COALESCE($2, stage),
       score = COALESCE($3, score), metrics = COALESCE($4, metrics)
       WHERE job_candidate_id = $5 RETURNING *`,
      [status, stage, score, metrics ? JSON.stringify(metrics) : null, job_candidate_id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.deleteCandidate = async (req, res, next) => {
  const { job_candidate_id } = req.params;
  try {
    await pool.query(`DELETE FROM job_candidate WHERE job_candidate_id = $1`, [job_candidate_id]);
    res.json({ message: "Candidate removed" });
  } catch (err) {
    next(err);
  }
};

exports.hireCandidate = async (req, res, next) => {
  const { job_candidate_id } = req.params;
  try {
    const candidate = await pool.query(
      `UPDATE job_candidate SET status = 'Hired', stage = 'Hired'
       WHERE job_candidate_id = $1 RETURNING *`,
      [job_candidate_id]
    );
    await pool.query(
      `UPDATE job_opening SET status = 'Closed' WHERE job_id = $1`,
      [candidate.rows[0].job_id]
    );
    res.json(candidate.rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.scheduleAIInterview = async (req, res, next) => {
  const { job_candidate_id } = req.params;
  const { start_time, end_time } = req.body;
  try {
    const result = await pool.query(
      `UPDATE job_candidate SET stage = 'AI Interview', status = 'In Progress'
       WHERE job_candidate_id = $1 RETURNING *`,
      [job_candidate_id]
    );
    res.json({
      message: "AI Interview scheduled.",
      candidate: result.rows[0],
      window: { start_time, end_time }
    });
  } catch (err) {
    next(err);
  }
};

// ─── DASHBOARD STATS ─────────────────────────────────────────────────────────

exports.getDashboardStats = async (req, res, next) => {
  const hrUserId = req.hrUser.id;
  try {
    const ws = await pool.query(
      `SELECT w.workspace_id FROM workspace w
       JOIN workspace_member wm ON w.workspace_id = wm.workspace_id
       WHERE wm.hr_user_id = $1 LIMIT 1`,
      [hrUserId]
    );
    if (ws.rows.length === 0) return res.json({ activeJobs: 0, totalCandidates: 0, scheduledInterviews: 0 });
    const workspaceId = ws.rows[0].workspace_id;

    const stats = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM job_opening WHERE workspace_id = $1 AND status = 'Active') AS "activeJobs",
         (SELECT COUNT(*) FROM job_candidate jc JOIN job_opening j ON j.job_id = jc.job_id WHERE j.workspace_id = $1) AS "totalCandidates",
         (SELECT COUNT(*) FROM job_candidate jc JOIN job_opening j ON j.job_id = jc.job_id WHERE j.workspace_id = $1 AND jc.stage = 'AI Interview') AS "scheduledInterviews"`,
      [workspaceId]
    );
    res.json(stats.rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.uploadCVs = async (req, res, next) => {
  const { job_id } = req.params;
  const files = req.files || [];

  if (files.length === 0) {
    return res.status(400).json({ error: "No CV files uploaded." });
  }

  try {
    const jobRes = await pool.query(
      `SELECT title, workspace_id FROM job_opening WHERE job_id = $1`,
      [job_id]
    );
    if (jobRes.rows.length === 0) {
      return res.status(404).json({ error: "Job opening not found." });
    }
    const job = jobRes.rows[0];

    const addedCandidates = [];

    for (const file of files) {
      let filename = file.originalname;
      let namePart = filename.substring(0, filename.lastIndexOf('.')) || filename;
      namePart = namePart
        .replace(/[_-]/g, " ")
        .replace(/\b(cv|resume|cover|letter|2025|2026|final|draft|update)\b/gi, "")
        .trim();
      
      if (!namePart) namePart = "Applicant " + Math.floor(Math.random() * 1000);
      
      const cleanName = namePart
        .split(/\s+/)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");

      const emailLocal = cleanName.toLowerCase().replace(/\s+/g, ".");
      const email = `${emailLocal}@example.com`;

      const metrics = {
        filename: filename
      };

      const result = await pool.query(
        `INSERT INTO job_candidate (job_id, name, email, score, status, stage, source, metrics)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [
          job_id,
          cleanName,
          email,
          null, // score is null (no auto-screen/rank)
          'Review', // status is Review
          'CV Screen', // stage is CV Screen
          'CV Upload',
          JSON.stringify(metrics)
        ]
      );
      addedCandidates.push(result.rows[0]);
    }

    res.status(201).json({
      message: `${files.length} CVs successfully uploaded.`,
      candidates: addedCandidates
    });
  } catch (err) {
    next(err);
  }
};

exports.inviteMember = async (req, res, next) => {
  const { workspace_id } = req.params;
  const { full_name, email, position, role } = req.body;

  if (!full_name || !email || !position) {
    return res.status(400).json({ error: "Full name, email, and position are required." });
  }

  try {
    const isAuthorized = await pool.query(
      `SELECT 1 FROM workspace w
       LEFT JOIN workspace_member wm ON w.workspace_id = wm.workspace_id AND wm.hr_user_id = $2
       LEFT JOIN hr_user u ON u.hr_user_id = $2
       WHERE w.workspace_id = $1 AND (
         w.created_by = $2 OR 
         wm.role = 'Admin' OR 
         u.is_workspace_owner = true OR 
         u.position ILIKE '%Company Manager%' OR
         u.position ILIKE '%HR Manager%'
       )`,
      [workspace_id, req.hrUser.id]
    );

    if (isAuthorized.rows.length === 0) {
      return res.status(403).json({ error: "Only the workspace creator, owner, or company manager can invite members." });
    }

    await pool.query(
      `INSERT INTO workspace_invite (workspace_id, email, full_name, position, role)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO UPDATE SET
         full_name = EXCLUDED.full_name,
         position = EXCLUDED.position,
         role = EXCLUDED.role`,
      [workspace_id, email.toLowerCase(), full_name, position, role || 'Member']
    );

    res.json({ message: "Invitation sent successfully." });
  } catch (err) {
    next(err);
  }
};

exports.getInvitations = async (req, res, next) => {
  const { workspace_id } = req.params;
  try {
    const invites = await pool.query(
      `SELECT invite_id, email, full_name, position, role, created_at 
       FROM workspace_invite WHERE workspace_id = $1 ORDER BY created_at DESC`,
      [workspace_id]
    );
    res.json(invites.rows);
  } catch (err) {
    next(err);
  }
};

exports.cancelInvitation = async (req, res, next) => {
  const { workspace_id, invite_id } = req.params;
  try {
    const isAuthorized = await pool.query(
      `SELECT 1 FROM workspace w
       LEFT JOIN workspace_member wm ON w.workspace_id = wm.workspace_id AND wm.hr_user_id = $2
       LEFT JOIN hr_user u ON u.hr_user_id = $2
       WHERE w.workspace_id = $1 AND (
         w.created_by = $2 OR 
         wm.role = 'Admin' OR 
         u.is_workspace_owner = true OR 
         u.position ILIKE '%Company Manager%' OR
         u.position ILIKE '%HR Manager%'
       )`,
      [workspace_id, req.hrUser.id]
    );

    if (isAuthorized.rows.length === 0) {
      return res.status(403).json({ error: "Only the workspace creator, owner, or company manager can cancel invitations." });
    }

    await pool.query(
      `DELETE FROM workspace_invite WHERE invite_id = $1 AND workspace_id = $2`,
      [invite_id, workspace_id]
    );
    res.json({ message: "Invitation cancelled." });
  } catch (err) {
    next(err);
  }
};


