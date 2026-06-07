const pool = require("../db");
const { Blob } = require("buffer");
const crypto = require("crypto");
const {
  sendAIInterviewInvitationEmail,
  sendLiveInterviewInvitationEmail,
  sendRejectionDecisionEmail,
  sendHiringDecisionEmail,
  sendWorkspaceInvitationEmail,
} = require("../services/hrEmail.service");

const CV_SERVICE_URL = (process.env.CV_SERVICE_URL || "http://localhost:8010").replace(/\/+$/, "");
const CV_ANALYSIS_TIMEOUT_MS = Number(process.env.CV_ANALYSIS_TIMEOUT_MS || 90000);
const HR_INVITE_BASE_URL = (process.env.HR_INVITE_BASE_URL || process.env.CLIENT_ORIGIN || "http://localhost:5173")
  .split(",")[0]
  .trim()
  .replace(/\/+$/, "");
const WHEREBY_API_KEY = process.env.WHEREBY_API_KEY || "";
const WHEREBY_API_URL = (process.env.WHEREBY_API_URL || "https://api.whereby.dev/v1").replace(/\/+$/, "");
const WORKSPACE_INVITE_EXPIRES_DAYS = Number(process.env.WORKSPACE_INVITE_EXPIRES_DAYS || 14);

async function getWorkspaceForHrUser(hrUserId) {
  const result = await pool.query(
    `SELECT w.workspace_id FROM workspace w
     JOIN workspace_member wm ON w.workspace_id = wm.workspace_id
     WHERE wm.hr_user_id = $1
     ORDER BY w.created_at ASC
     LIMIT 1`,
    [hrUserId]
  );
  return result.rows[0] || null;
}

async function ensureJobInWorkspace(jobId, hrUserId) {
  const workspace = await getWorkspaceForHrUser(hrUserId);
  if (!workspace) return null;

  const result = await pool.query(
    `SELECT job_id FROM job_opening WHERE job_id = $1 AND workspace_id = $2`,
    [jobId, workspace.workspace_id]
  );
  return result.rows.length > 0 ? workspace : null;
}

async function getCandidateCommunicationContext(jobCandidateId, workspaceId) {
  const result = await pool.query(
    `SELECT jc.job_candidate_id, jc.name AS candidate_name, jc.email AS candidate_email,
            jc.status AS candidate_status, jc.stage AS candidate_stage,
            j.job_id, j.title AS job_title, j.department, j.type AS job_type,
            w.workspace_id, w.name AS workspace_name, w.company_name
     FROM job_candidate jc
     JOIN job_opening j ON j.job_id = jc.job_id
     JOIN workspace w ON w.workspace_id = j.workspace_id
     WHERE jc.job_candidate_id = $1 AND j.workspace_id = $2
     LIMIT 1`,
    [jobCandidateId, workspaceId]
  );
  return result.rows[0] || null;
}

async function sendHrEmailSafely(label, sendFn, payload) {
  try {
    await sendFn(payload);
  } catch (err) {
    console.error(`[HR Email] ${label} failed:`, err);
  }
}

function buildJobContext(job) {
  const requirements = Array.isArray(job.requirements)
    ? job.requirements
    : typeof job.requirements === "string"
      ? safeJsonParse(job.requirements, [])
      : [];

  const lines = [
    `Job title: ${job.title || ""}`,
    job.department ? `Department: ${job.department}` : null,
    job.type ? `Employment type: ${job.type}` : null,
    job.description ? `Description:\n${job.description}` : null,
    requirements.length ? `Requirements:\n${requirements.map((item) => `- ${typeof item === "string" ? item : JSON.stringify(item)}`).join("\n")}` : null,
  ].filter(Boolean);

  return lines.join("\n\n").slice(0, 10000);
}

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeScore(value) {
  const score = Number(value);
  if (!Number.isFinite(score)) return null;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function statusFromScore(score) {
  if (score >= 80) return "Recommended";
  return "Review";
}

function nameFromFilename(filename) {
  let namePart = filename.substring(0, filename.lastIndexOf(".")) || filename;
  namePart = namePart
    .replace(/[_-]/g, " ")
    .replace(/\b(cv|resume|cover|letter|2025|2026|final|draft|update)\b/gi, "")
    .trim();

  if (!namePart) namePart = "Applicant " + Math.floor(Math.random() * 1000);

  return namePart
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function normalizeCandidateName(value) {
  if (!value || typeof value !== "string") return null;
  const cleaned = value
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{M}\s.'-]/gu, "")
    .trim();
  if (!cleaned || cleaned.length < 2 || cleaned.length > 80) return null;
  if (/^(resume|cv|curriculum vitae|candidate|applicant)$/i.test(cleaned)) return null;
  return cleaned;
}

function nameFromCvText(text) {
  if (!text || typeof text !== "string") return null;
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8);

  for (const line of lines) {
    if (/@|https?:|www\.|\d{3,}|resume|curriculum vitae/i.test(line)) continue;
    const candidate = normalizeCandidateName(line);
    if (candidate && candidate.split(/\s+/).length >= 2) return candidate;
  }
  return null;
}

function nameFromCvAnalysis(analysis) {
  return normalizeCandidateName(analysis.candidate_name)
    || normalizeCandidateName(analysis.name)
    || normalizeCandidateName(analysis.contact?.name)
    || nameFromCvText(analysis.cv_text);
}

function normalizeCandidateEmail(value) {
  if (!value || typeof value !== "string") return null;
  const match = value.match(/(?<![\w.+-])[\w.+-]+@[\w-]+(?:\.[\w-]+)+(?![\w.+-])/);
  return match ? match[0].toLowerCase() : null;
}

function domainFromEmail(value) {
  return String(value || "").split("@")[1]?.toLowerCase() || "";
}

function emailFromCvAnalysis(analysis) {
  return normalizeCandidateEmail(analysis.candidate_email)
    || normalizeCandidateEmail(analysis.email)
    || normalizeCandidateEmail(analysis.contact?.email)
    || normalizeCandidateEmail(analysis.cv_text);
}

function metricsFromAnalysis(analysis) {
  const sectionScore = (key) => normalizeScore((analysis.cv_analysis?.[key]?.score || 0) * 10) || 0;
  return {
    ats: sectionScore("ats_compatibility"),
    structure: sectionScore("structure"),
    skills: sectionScore("skills_section"),
    education: sectionScore("education"),
    experience: sectionScore("experience"),
    contact: sectionScore("contact_info"),
    summary: sectionScore("professional_summary"),
    match: normalizeScore(analysis.job_alignment_score) || 0,
    overall: normalizeScore(analysis.overall_cv_score) || 0,
  };
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function liveRoomEndDate(scheduledAt) {
  const now = Date.now();
  const scheduled = scheduledAt ? new Date(scheduledAt).getTime() : now;
  const base = Number.isFinite(scheduled) && scheduled > now ? scheduled : now;
  return new Date(base + 60 * 60 * 4 * 1000).toISOString();
}

async function createWherebyMeetingForLiveInterview(scheduledAt) {
  if (!WHEREBY_API_KEY) {
    throw new Error("WHEREBY_API_KEY is required to create live interview rooms.");
  }

  const response = await fetch(`${WHEREBY_API_URL}/meetings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${WHEREBY_API_KEY}`,
    },
    body: JSON.stringify({
      endDate: liveRoomEndDate(scheduledAt),
      isLocked: false,
      fields: ["hostRoomUrl"],
    }),
  });

  const text = await response.text();
  const payload = text ? safeJsonParse(text, { error: text }) : {};

  if (!response.ok) {
    throw new Error(payload.error || payload.info || payload.message || `Whereby meeting creation failed (${response.status}).`);
  }

  return payload;
}

async function deleteWherebyMeeting(meetingId) {
  if (!WHEREBY_API_KEY || !meetingId) return;

  try {
    await fetch(`${WHEREBY_API_URL}/meetings/${meetingId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${WHEREBY_API_KEY}` },
    });
  } catch (err) {
    console.error("Whereby meeting deletion failed:", err);
  }
}

function fallbackCvText(candidate) {
  const parts = [
    candidate.cv_text,
    candidate.ranking_summary,
    candidate.shortlist_reason,
    candidate.cv_analysis ? `CV analysis: ${JSON.stringify(candidate.cv_analysis)}` : null,
    candidate.job_match_analysis ? `Job match analysis: ${JSON.stringify(candidate.job_match_analysis)}` : null,
  ].filter(Boolean);

  return parts.join("\n\n") || `Candidate name: ${candidate.name || "Candidate"}`;
}

async function getInvitationByToken(token) {
  const tokenHash = hashToken(token);
  const result = await pool.query(
    `SELECT inv.*, jc.name AS candidate_name, jc.email AS candidate_email, jc.cv_text,
            jc.cv_filename, jc.ranking_summary, jc.shortlist_reason,
            jc.cv_analysis, jc.job_match_analysis,
            j.title, j.department, j.type, j.description, j.requirements,
            w.name AS workspace_name
     FROM hr_ai_interview_invitation inv
     JOIN job_candidate jc ON jc.job_candidate_id = inv.job_candidate_id
     JOIN job_opening j ON j.job_id = inv.job_id
     JOIN workspace w ON w.workspace_id = inv.workspace_id
     WHERE inv.token_hash = $1
     LIMIT 1`,
    [tokenHash]
  );
  return result.rows[0] || null;
}

async function analyzeCvWithService(file, jdText) {
  if (typeof fetch !== "function" || typeof FormData !== "function") {
    throw new Error("This Node runtime does not support fetch/FormData. Use Node 18+.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CV_ANALYSIS_TIMEOUT_MS);

  try {
    const formData = new FormData();
    formData.append("file", new Blob([file.buffer], { type: file.mimetype }), file.originalname);
    formData.append("jd_text", jdText);

    const response = await fetch(`${CV_SERVICE_URL}/cv/upload`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    const text = await response.text();
    const payload = text ? safeJsonParse(text, { detail: text }) : {};

    if (!response.ok) {
      const detail = payload.detail || payload.error || `CV service returned ${response.status}`;
      throw new Error(detail);
    }

    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

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
    const workspace = await getWorkspaceForHrUser(hrUserId);
    if (!workspace) return res.json([]);

    const jobs = await pool.query(
      `SELECT j.*,
         (SELECT COUNT(*) FROM job_candidate jc WHERE jc.job_id = j.job_id) AS candidates,
         (SELECT COUNT(*) FROM job_candidate jc WHERE jc.job_id = j.job_id AND jc.stage != 'CV Screen') AS screened
       FROM job_opening j
       WHERE j.workspace_id = $1
       ORDER BY j.created_at DESC`,
      [workspace.workspace_id]
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
    if (!title) return res.status(400).json({ error: "Job title is required." });

    const workspace = await getWorkspaceForHrUser(hrUserId);
    if (!workspace) return res.status(400).json({ error: "No workspace found." });

    const result = await pool.query(
      `INSERT INTO job_opening (workspace_id, title, department, type, description, requirements, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'Active') RETURNING *`,
      [workspace.workspace_id, title, department, type, description, JSON.stringify(requirements || [])]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.updateJobStatus = async (req, res, next) => {
  const hrUserId = req.hrUser.id;
  const { job_id } = req.params;
  const { status } = req.body;
  try {
    if (status !== "Active") {
      return res.status(400).json({
        error: "Job openings can only be reopened from here. Closing happens when a candidate is hired.",
      });
    }

    const workspace = await ensureJobInWorkspace(job_id, hrUserId);
    if (!workspace) return res.status(404).json({ error: "Job opening not found." });

    const currentJob = await pool.query(
      `SELECT status FROM job_opening WHERE job_id = $1 AND workspace_id = $2`,
      [job_id, workspace.workspace_id]
    );
    if (currentJob.rows[0]?.status === "Closed") {
      await pool.query(`DELETE FROM job_candidate WHERE job_id = $1`, [job_id]);
    }

    const result = await pool.query(
      `UPDATE job_opening
       SET status = $1, updated_at = NOW()
       WHERE job_id = $2 AND workspace_id = $3
       RETURNING *`,
      [status, job_id, workspace.workspace_id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.deleteJob = async (req, res, next) => {
  const hrUserId = req.hrUser.id;
  const { job_id } = req.params;
  try {
    const workspace = await ensureJobInWorkspace(job_id, hrUserId);
    if (!workspace) return res.status(404).json({ error: "Job opening not found." });

    const currentJob = await pool.query(
      `SELECT status FROM job_opening WHERE job_id = $1 AND workspace_id = $2`,
      [job_id, workspace.workspace_id]
    );
    if (currentJob.rows[0]?.status === "Closed") {
      return res.status(409).json({ error: "Closed job openings can only be viewed or reopened." });
    }

    await pool.query(`DELETE FROM job_opening WHERE job_id = $1 AND workspace_id = $2`, [job_id, workspace.workspace_id]);
    res.json({ message: "Job deleted" });
  } catch (err) {
    next(err);
  }
};

// ─── CANDIDATES ──────────────────────────────────────────────────────────────

exports.getCandidates = async (req, res, next) => {
  const hrUserId = req.hrUser.id;
  const { job_id } = req.params;
  try {
    const workspace = await ensureJobInWorkspace(job_id, hrUserId);
    if (!workspace) return res.status(404).json({ error: "Job opening not found." });

    const result = await pool.query(
      `SELECT jc.*,
              latest_ai.overall_score AS ai_interview_score,
              latest_ai.feedback_data AS ai_interview_feedback,
              latest_ai.result_id AS ai_interview_result_id,
              latest_ai.created_at AS ai_interview_completed_at
       FROM job_candidate jc
       LEFT JOIN LATERAL (
         SELECT r.overall_score, r.feedback_data, r.result_id, r.created_at
         FROM hr_ai_interview_result r
         WHERE r.job_candidate_id = jc.job_candidate_id
         ORDER BY r.created_at DESC
         LIMIT 1
       ) latest_ai ON TRUE
       WHERE jc.job_id = $1
       ORDER BY
         CASE WHEN jc.status = 'Rejected' THEN 1 ELSE 0 END,
         CASE WHEN latest_ai.overall_score IS NULL THEN 1 ELSE 0 END,
         latest_ai.overall_score DESC NULLS LAST,
         jc.score DESC NULLS LAST`,
      [job_id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

exports.addCandidate = async (req, res, next) => {
  const hrUserId = req.hrUser.id;
  const { job_id } = req.params;
  const { name, email, score, status, stage, source, metrics } = req.body;
  try {
    const workspace = await ensureJobInWorkspace(job_id, hrUserId);
    if (!workspace) return res.status(404).json({ error: "Job opening not found." });
    if (!name) return res.status(400).json({ error: "Candidate name is required." });

    const job = await pool.query(
      `SELECT status FROM job_opening WHERE job_id = $1 AND workspace_id = $2`,
      [job_id, workspace.workspace_id]
    );
    if (job.rows[0]?.status === "Closed") {
      return res.status(409).json({ error: "This job opening is closed." });
    }

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
  const hrUserId = req.hrUser.id;
  const { job_candidate_id } = req.params;
  const { status, stage, score, metrics } = req.body;
  try {
    const workspace = await getWorkspaceForHrUser(hrUserId);
    if (!workspace) return res.status(404).json({ error: "Candidate not found." });

    const current = await pool.query(
      `SELECT jc.status AS candidate_status, j.status AS job_status
       FROM job_candidate jc
       JOIN job_opening j ON j.job_id = jc.job_id
       WHERE jc.job_candidate_id = $1 AND j.workspace_id = $2`,
      [job_candidate_id, workspace.workspace_id]
    );
    if (current.rows[0]?.job_status === "Closed") {
      return res.status(409).json({ error: "This job opening is closed." });
    }
    if (current.rows[0]?.candidate_status === "Rejected" && status !== "Rejected" && stage !== "Rejected") {
      return res.status(409).json({ error: "Rejected candidates are locked." });
    }

    const result = await pool.query(
      `UPDATE job_candidate SET status = COALESCE($1, status), stage = COALESCE($2, stage),
       score = COALESCE($3, score), metrics = COALESCE($4::jsonb, metrics), updated_at = NOW()
       FROM job_opening j
       WHERE job_candidate.job_id = j.job_id
         AND j.workspace_id = $5
         AND job_candidate.job_candidate_id = $6
       RETURNING job_candidate.*`,
      [status, stage, score, metrics ? JSON.stringify(metrics) : null, workspace.workspace_id, job_candidate_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Candidate not found." });

    if (status === "Rejected" || stage === "Rejected") {
      const emailContext = await getCandidateCommunicationContext(job_candidate_id, workspace.workspace_id);
      if (emailContext) {
        sendHrEmailSafely("rejection decision", sendRejectionDecisionEmail, emailContext);
      }
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.deleteCandidate = async (req, res, next) => {
  const hrUserId = req.hrUser.id;
  const { job_candidate_id } = req.params;
  try {
    const workspace = await getWorkspaceForHrUser(hrUserId);
    if (!workspace) return res.status(404).json({ error: "Candidate not found." });

    const current = await pool.query(
      `SELECT jc.status AS candidate_status, j.status AS job_status
       FROM job_candidate jc
       JOIN job_opening j ON j.job_id = jc.job_id
       WHERE jc.job_candidate_id = $1 AND j.workspace_id = $2`,
      [job_candidate_id, workspace.workspace_id]
    );
    if (current.rows[0]?.job_status === "Closed") {
      return res.status(409).json({ error: "This job opening is closed." });
    }
    const result = await pool.query(
      `DELETE FROM job_candidate
       USING job_opening j
       WHERE job_candidate.job_id = j.job_id
         AND j.workspace_id = $1
         AND job_candidate.job_candidate_id = $2
       RETURNING job_candidate.job_candidate_id`,
      [workspace.workspace_id, job_candidate_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Candidate not found." });
    res.json({ message: "Candidate removed" });
  } catch (err) {
    next(err);
  }
};

exports.rejectCandidate = async (req, res, next) => {
  const hrUserId = req.hrUser.id;
  const { job_candidate_id } = req.params;

  try {
    const workspace = await getWorkspaceForHrUser(hrUserId);
    if (!workspace) return res.status(404).json({ error: "Candidate not found." });

    const current = await pool.query(
      `SELECT jc.status AS candidate_status, j.status AS job_status
       FROM job_candidate jc
       JOIN job_opening j ON j.job_id = jc.job_id
       WHERE jc.job_candidate_id = $1 AND j.workspace_id = $2`,
      [job_candidate_id, workspace.workspace_id]
    );
    if (current.rows.length === 0) return res.status(404).json({ error: "Candidate not found." });
    if (current.rows[0]?.job_status === "Closed") {
      return res.status(409).json({ error: "This job opening is closed." });
    }

    const result = await pool.query(
      `UPDATE job_candidate
       SET status = 'Rejected', stage = 'Rejected', updated_at = NOW()
       FROM job_opening j
       WHERE job_candidate.job_id = j.job_id
         AND j.workspace_id = $1
         AND job_candidate.job_candidate_id = $2
       RETURNING job_candidate.*`,
      [workspace.workspace_id, job_candidate_id]
    );

    const emailContext = await getCandidateCommunicationContext(job_candidate_id, workspace.workspace_id);
    if (emailContext) {
      sendHrEmailSafely("rejection decision", sendRejectionDecisionEmail, emailContext);
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.hireCandidate = async (req, res, next) => {
  const hrUserId = req.hrUser.id;
  const { job_candidate_id } = req.params;
  try {
    const workspace = await getWorkspaceForHrUser(hrUserId);
    if (!workspace) return res.status(404).json({ error: "Candidate not found." });

    const current = await pool.query(
      `SELECT jc.status AS candidate_status, j.status AS job_status
       FROM job_candidate jc
       JOIN job_opening j ON j.job_id = jc.job_id
       WHERE jc.job_candidate_id = $1 AND j.workspace_id = $2`,
      [job_candidate_id, workspace.workspace_id]
    );
    if (current.rows[0]?.job_status === "Closed") {
      return res.status(409).json({ error: "This job opening is closed." });
    }
    if (current.rows[0]?.candidate_status === "Rejected") {
      return res.status(409).json({ error: "Rejected candidates cannot be hired." });
    }

    const candidate = await pool.query(
      `UPDATE job_candidate SET status = 'Hired', stage = 'Hired'
       FROM job_opening j
       WHERE job_candidate.job_id = j.job_id
         AND j.workspace_id = $1
         AND job_candidate.job_candidate_id = $2
       RETURNING job_candidate.*`,
      [workspace.workspace_id, job_candidate_id]
    );
    if (candidate.rows.length === 0) return res.status(404).json({ error: "Candidate not found." });

    await pool.query(
      `UPDATE job_opening SET status = 'Closed', updated_at = NOW() WHERE job_id = $1 AND workspace_id = $2`,
      [candidate.rows[0].job_id, workspace.workspace_id]
    );

    const emailContext = await getCandidateCommunicationContext(job_candidate_id, workspace.workspace_id);
    if (emailContext) {
      sendHrEmailSafely("hiring decision", sendHiringDecisionEmail, emailContext);
    }

    res.json(candidate.rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.scheduleAIInterview = async (req, res, next) => {
  const hrUserId = req.hrUser.id;
  const { job_candidate_id } = req.params;
  const { start_time, end_time, interview_mode } = req.body;
  try {
    const workspace = await getWorkspaceForHrUser(hrUserId);
    if (!workspace) return res.status(404).json({ error: "Candidate not found." });

    const candidateRes = await pool.query(
      `SELECT jc.*, j.workspace_id, j.status AS job_status
       FROM job_candidate jc
       JOIN job_opening j ON j.job_id = jc.job_id
       WHERE j.workspace_id = $1 AND jc.job_candidate_id = $2`,
      [workspace.workspace_id, job_candidate_id]
    );
    if (candidateRes.rows.length === 0) return res.status(404).json({ error: "Candidate not found." });

    const candidate = candidateRes.rows[0];
    if (candidate.job_status === "Closed") {
      return res.status(409).json({ error: "This job opening is closed." });
    }
    if (candidate.status === "Rejected") {
      return res.status(409).json({ error: "Rejected candidates are locked." });
    }

    const existingResult = await pool.query(
      `SELECT result_id FROM hr_ai_interview_result WHERE job_candidate_id = $1 LIMIT 1`,
      [candidate.job_candidate_id]
    );
    if (existingResult.rows.length > 0) {
      return res.status(409).json({ error: "This candidate has already completed an AI interview." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(token);
    const invitationUrl = `${HR_INVITE_BASE_URL}/hr-interview/${token}`;
    const mode = interview_mode || "comprehensive";

    const invitation = await pool.query(
      `INSERT INTO hr_ai_interview_invitation (
         job_candidate_id, job_id, workspace_id, token_hash, status,
         interview_mode, start_time, end_time, invitation_url, created_by, expires_at
       )
       VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, $8, $9, $10)
       RETURNING invitation_id, status, interview_mode, start_time, end_time, invitation_url, created_at, expires_at`,
      [
        candidate.job_candidate_id,
        candidate.job_id,
        workspace.workspace_id,
        tokenHash,
        mode,
        start_time || null,
        end_time || null,
        invitationUrl,
        hrUserId,
        end_time || null,
      ]
    );

    const updated = await pool.query(
      `UPDATE job_candidate
       SET stage = 'AI Interview', status = 'In Progress', updated_at = NOW()
       WHERE job_candidate_id = $1
       RETURNING *`,
      [job_candidate_id]
    );

    const emailContext = await getCandidateCommunicationContext(candidate.job_candidate_id, workspace.workspace_id);
    if (emailContext) {
      sendHrEmailSafely("AI interview invitation", sendAIInterviewInvitationEmail, {
        ...emailContext,
        invitation_url: invitationUrl,
        start_time,
        end_time,
      });
    }

    res.json({
      message: "AI interview invitation generated.",
      candidate: updated.rows[0],
      invitation: invitation.rows[0],
      token,
      invitation_url: invitationUrl,
      window: { start_time, end_time },
    });
  } catch (err) {
    next(err);
  }
};

exports.getAIInterviewResult = async (req, res, next) => {
  const hrUserId = req.hrUser.id;
  const { job_candidate_id } = req.params;

  try {
    const workspace = await getWorkspaceForHrUser(hrUserId);
    if (!workspace) return res.status(404).json({ error: "Candidate not found." });

    const result = await pool.query(
      `SELECT r.*, inv.status AS invitation_status, inv.invitation_url, inv.interview_mode, inv.created_at AS invited_at
       FROM hr_ai_interview_invitation inv
       LEFT JOIN hr_ai_interview_result r ON r.invitation_id = inv.invitation_id
       WHERE inv.workspace_id = $1 AND inv.job_candidate_id = $2
       ORDER BY inv.created_at DESC
       LIMIT 1`,
      [workspace.workspace_id, job_candidate_id]
    );

    res.json({ result: result.rows[0] || null });
  } catch (err) {
    next(err);
  }
};

exports.createLiveInterviewRoom = async (req, res, next) => {
  const hrUserId = req.hrUser.id;
  const { job_candidate_id } = req.params;
  const { scheduled_at } = req.body;

  try {
    const workspace = await getWorkspaceForHrUser(hrUserId);
    if (!workspace) return res.status(404).json({ error: "Candidate not found." });

    const candidateRes = await pool.query(
      `SELECT jc.*, j.workspace_id, j.status AS job_status
       FROM job_candidate jc
       JOIN job_opening j ON j.job_id = jc.job_id
       WHERE j.workspace_id = $1 AND jc.job_candidate_id = $2`,
      [workspace.workspace_id, job_candidate_id]
    );
    if (candidateRes.rows.length === 0) return res.status(404).json({ error: "Candidate not found." });

    const candidate = candidateRes.rows[0];
    if (candidate.job_status === "Closed") {
      return res.status(409).json({ error: "This job opening is closed." });
    }
    if (candidate.status === "Rejected") {
      return res.status(409).json({ error: "Rejected candidates are locked." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(token);
    const roomUrl = `${HR_INVITE_BASE_URL}/hr-live/${token}`;
    const wherebyMeeting = await createWherebyMeetingForLiveInterview(scheduled_at);

    const result = await pool.query(
      `INSERT INTO hr_live_interview_room (
         job_candidate_id, job_id, workspace_id, token_hash, status,
         scheduled_at, room_url, whereby_meeting_id, whereby_room_url, whereby_host_room_url, created_by
       )
       VALUES ($1, $2, $3, $4, 'scheduled', $5, $6, $7, $8, $9, $10)
       RETURNING room_id, job_candidate_id, job_id, workspace_id, status,
                 scheduled_at, started_at, ended_at, room_url,
                 whereby_meeting_id, whereby_room_url, whereby_host_room_url,
                 created_at, updated_at`,
      [
        candidate.job_candidate_id,
        candidate.job_id,
        workspace.workspace_id,
        tokenHash,
        scheduled_at || null,
        roomUrl,
        wherebyMeeting.meetingId,
        wherebyMeeting.roomUrl,
        wherebyMeeting.hostRoomUrl || wherebyMeeting.roomUrl,
        hrUserId,
      ]
    );

    await pool.query(
      `UPDATE job_candidate
       SET stage = 'Live Interview', status = 'In Progress', updated_at = NOW()
       WHERE job_candidate_id = $1`,
      [candidate.job_candidate_id]
    );

    const emailContext = await getCandidateCommunicationContext(candidate.job_candidate_id, workspace.workspace_id);
    if (emailContext) {
      sendHrEmailSafely("live interview invitation", sendLiveInterviewInvitationEmail, {
        ...emailContext,
        room_url: roomUrl,
        scheduled_at,
      });
    }

    res.status(201).json({ room: result.rows[0], token, room_url: roomUrl });
  } catch (err) {
    next(err);
  }
};

exports.getLiveInterviewRooms = async (req, res, next) => {
  const hrUserId = req.hrUser.id;

  try {
    const workspace = await getWorkspaceForHrUser(hrUserId);
    if (!workspace) return res.json([]);

    const result = await pool.query(
      `SELECT room.room_id, room.job_candidate_id, room.job_id, room.status,
              room.scheduled_at, room.started_at, room.ended_at,
              room.room_url, room.whereby_meeting_id, room.whereby_room_url, room.whereby_host_room_url,
              room.created_at, room.updated_at,
              jc.name AS candidate_name, jc.email AS candidate_email,
              j.title AS job_title
       FROM hr_live_interview_room room
       JOIN job_candidate jc ON jc.job_candidate_id = room.job_candidate_id
       JOIN job_opening j ON j.job_id = room.job_id
       WHERE room.workspace_id = $1
       ORDER BY
         CASE room.status WHEN 'active' THEN 0 WHEN 'scheduled' THEN 1 ELSE 2 END,
         room.scheduled_at ASC NULLS LAST,
         room.created_at DESC`,
      [workspace.workspace_id]
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

exports.getLiveInterviewRoomForHr = async (req, res, next) => {
  const hrUserId = req.hrUser.id;
  const { room_id } = req.params;

  try {
    const workspace = await getWorkspaceForHrUser(hrUserId);
    if (!workspace) return res.status(404).json({ error: "Live room not found." });

    const result = await pool.query(
      `SELECT room.room_id, room.job_candidate_id, room.job_id, room.status,
              room.scheduled_at, room.started_at, room.ended_at,
              room.room_url, room.whereby_meeting_id, room.whereby_room_url, room.whereby_host_room_url,
              room.created_at, room.updated_at,
              jc.name AS candidate_name, jc.email AS candidate_email,
              j.title AS job_title, j.department, j.type
       FROM hr_live_interview_room room
       JOIN job_candidate jc ON jc.job_candidate_id = room.job_candidate_id
       JOIN job_opening j ON j.job_id = room.job_id
       WHERE room.workspace_id = $1 AND room.room_id = $2
       LIMIT 1`,
      [workspace.workspace_id, room_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Live room not found." });

    res.json({ room: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.startLiveInterviewRoom = async (req, res, next) => {
  const hrUserId = req.hrUser.id;
  const { room_id } = req.params;

  try {
    const workspace = await getWorkspaceForHrUser(hrUserId);
    if (!workspace) return res.status(404).json({ error: "Live room not found." });

    const result = await pool.query(
      `UPDATE hr_live_interview_room
       SET status = 'active',
           started_at = COALESCE(started_at, NOW()),
           updated_at = NOW()
       WHERE room_id = $1
         AND workspace_id = $2
         AND status != 'ended'
       RETURNING room_id, job_candidate_id, job_id, workspace_id, status,
                 scheduled_at, started_at, ended_at, room_url,
                 whereby_meeting_id, whereby_room_url, whereby_host_room_url,
                 created_at, updated_at`,
      [room_id, workspace.workspace_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Live room not found or already ended." });

    res.json({ room: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.endLiveInterviewRoom = async (req, res, next) => {
  const hrUserId = req.hrUser.id;
  const { room_id } = req.params;

  try {
    const workspace = await getWorkspaceForHrUser(hrUserId);
    if (!workspace) return res.status(404).json({ error: "Live room not found." });

    const roomBeforeEnd = await pool.query(
      `SELECT whereby_meeting_id
       FROM hr_live_interview_room
       WHERE room_id = $1 AND workspace_id = $2
       LIMIT 1`,
      [room_id, workspace.workspace_id]
    );

    const result = await pool.query(
      `UPDATE hr_live_interview_room
       SET status = 'ended',
           ended_at = COALESCE(ended_at, NOW()),
           updated_at = NOW()
       WHERE room_id = $1 AND workspace_id = $2
       RETURNING room_id, job_candidate_id, job_id, workspace_id, status,
                 scheduled_at, started_at, ended_at, room_url,
                 whereby_meeting_id, whereby_room_url, whereby_host_room_url,
                 created_at, updated_at`,
      [room_id, workspace.workspace_id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Live room not found." });

    await deleteWherebyMeeting(roomBeforeEnd.rows[0]?.whereby_meeting_id);

    await pool.query(
      `UPDATE job_candidate
       SET stage = 'Live Interview Complete', status = 'Review', updated_at = NOW()
       WHERE job_candidate_id = $1`,
      [result.rows[0].job_candidate_id]
    );

    res.json({ room: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.validatePublicLiveInterviewRoom = async (req, res, next) => {
  try {
    const tokenHash = hashToken(req.params.token);
    const result = await pool.query(
      `SELECT room.room_id, room.status, room.scheduled_at, room.started_at, room.ended_at,
              room.whereby_room_url,
              jc.name AS candidate_name, jc.email AS candidate_email,
              j.title AS job_title, j.department, j.type,
              w.name AS workspace_name
       FROM hr_live_interview_room room
       JOIN job_candidate jc ON jc.job_candidate_id = room.job_candidate_id
       JOIN job_opening j ON j.job_id = room.job_id
       JOIN workspace w ON w.workspace_id = room.workspace_id
       WHERE room.token_hash = $1
       LIMIT 1`,
      [tokenHash]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Live interview room not found." });

    res.json({ room: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.validatePublicAIInterviewInvitation = async (req, res, next) => {
  try {
    const invitation = await getInvitationByToken(req.params.token);
    if (!invitation) return res.status(404).json({ error: "Invitation not found." });
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      return res.status(410).json({ error: "Invitation has expired." });
    }
    if (invitation.status === "completed") {
      return res.status(409).json({ error: "Interview already completed." });
    }

    const jdText = buildJobContext(invitation);
    res.json({
      invitation: {
        status: invitation.status,
        interview_mode: invitation.interview_mode,
        start_time: invitation.start_time,
        end_time: invitation.end_time,
        workspace_name: invitation.workspace_name,
      },
      candidate: {
        name: invitation.candidate_name,
        email: invitation.candidate_email,
        cv_filename: invitation.cv_filename,
      },
      job: {
        title: invitation.title,
        department: invitation.department,
        type: invitation.type,
        description: invitation.description,
        requirements: invitation.requirements,
      },
      interview_context: {
        job_role: invitation.title || "Domain Expert",
        jd_text: jdText,
        cv_text: fallbackCvText(invitation),
        voice_id: "aura-orpheus-en",
        mode: invitation.interview_mode || "comprehensive",
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.markPublicAIInterviewStarted = async (req, res, next) => {
  const { token } = req.params;
  const { ai_session_id } = req.body;

  try {
    const invitation = await getInvitationByToken(token);
    if (!invitation) return res.status(404).json({ error: "Invitation not found." });
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      return res.status(410).json({ error: "Invitation has expired." });
    }

    await pool.query(
      `UPDATE hr_ai_interview_invitation
       SET status = CASE WHEN status = 'completed' THEN status ELSE 'started' END,
           ai_session_id = COALESCE($1, ai_session_id),
           started_at = COALESCE(started_at, NOW())
       WHERE invitation_id = $2`,
      [ai_session_id || null, invitation.invitation_id]
    );

    res.json({ message: "Interview started." });
  } catch (err) {
    next(err);
  }
};

exports.savePublicAIInterviewResult = async (req, res, next) => {
  const { token } = req.params;
  const { ai_session_id, interview_mode, overall_score, video_object_key, feedback_data } = req.body;

  try {
    const invitation = await getInvitationByToken(token);
    if (!invitation) return res.status(404).json({ error: "Invitation not found." });

    const saved = await pool.query(
      `INSERT INTO hr_ai_interview_result (
         invitation_id, job_candidate_id, job_id, workspace_id,
         ai_session_id, interview_mode, overall_score, video_object_key, feedback_data
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
       ON CONFLICT (invitation_id)
       DO UPDATE SET
         ai_session_id = EXCLUDED.ai_session_id,
         interview_mode = EXCLUDED.interview_mode,
         overall_score = EXCLUDED.overall_score,
         video_object_key = EXCLUDED.video_object_key,
         feedback_data = EXCLUDED.feedback_data,
         updated_at = NOW()
       RETURNING *`,
      [
        invitation.invitation_id,
        invitation.job_candidate_id,
        invitation.job_id,
        invitation.workspace_id,
        ai_session_id || invitation.ai_session_id || null,
        interview_mode || invitation.interview_mode || "comprehensive",
        overall_score ?? null,
        video_object_key || null,
        JSON.stringify(feedback_data || {}),
      ]
    );

    await pool.query(
      `UPDATE hr_ai_interview_invitation
       SET status = 'completed', completed_at = COALESCE(completed_at, NOW()), ai_session_id = COALESCE($1, ai_session_id)
       WHERE invitation_id = $2`,
      [ai_session_id || null, invitation.invitation_id]
    );

    await pool.query(
      `UPDATE job_candidate
       SET status = 'Review', stage = 'AI Interview Complete', updated_at = NOW()
       WHERE job_candidate_id = $1`,
      [invitation.job_candidate_id]
    );

    res.status(201).json({ message: "HR interview result saved.", result: saved.rows[0] });
  } catch (err) {
    next(err);
  }
};

// ─── DASHBOARD STATS ─────────────────────────────────────────────────────────

exports.getDashboardStats = async (req, res, next) => {
  const hrUserId = req.hrUser.id;
  try {
    const workspace = await getWorkspaceForHrUser(hrUserId);
    if (!workspace) return res.json({ activeJobs: 0, totalCandidates: 0, scheduledInterviews: 0 });

    const stats = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM job_opening WHERE workspace_id = $1 AND status = 'Active') AS "activeJobs",
         (SELECT COUNT(*) FROM job_candidate jc JOIN job_opening j ON j.job_id = jc.job_id WHERE j.workspace_id = $1) AS "totalCandidates",
         (SELECT COUNT(*) FROM job_candidate jc JOIN job_opening j ON j.job_id = jc.job_id WHERE j.workspace_id = $1 AND jc.stage = 'AI Interview') AS "scheduledInterviews"`,
      [workspace.workspace_id]
    );
    res.json(stats.rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.uploadCVs = async (req, res, next) => {
  const hrUserId = req.hrUser.id;
  const { job_id } = req.params;
  const files = req.files || [];

  if (files.length === 0) {
    return res.status(400).json({ error: "No CV files uploaded." });
  }

  try {
    const workspace = await ensureJobInWorkspace(job_id, hrUserId);
    if (!workspace) return res.status(404).json({ error: "Job opening not found." });

    const jobRes = await pool.query(
      `SELECT * FROM job_opening WHERE job_id = $1 AND workspace_id = $2`,
      [job_id, workspace.workspace_id]
    );
    if (jobRes.rows.length === 0) {
      return res.status(404).json({ error: "Job opening not found." });
    }
    const job = jobRes.rows[0];
    if (job.status === "Closed") {
      return res.status(409).json({ error: "This job opening is closed." });
    }
    const jdText = buildJobContext(job);

    const results = [];

    for (const file of files) {
      const filename = file.originalname;

      try {
        const analysis = await analyzeCvWithService(file, jdText);
        const cleanName = nameFromCvAnalysis(analysis) || nameFromFilename(filename);
        const email = emailFromCvAnalysis(analysis);
        const score = normalizeScore(analysis.job_alignment_score ?? analysis.overall_cv_score) ?? 0;
        const status = statusFromScore(score);
        const metrics = {
          filename,
          ...metricsFromAnalysis(analysis),
        };
        const shortlistReason = analysis.job_match_analysis?.match_explanation
          || analysis.summary
          || `${status} based on CV service analysis.`;

        const result = await pool.query(
          `INSERT INTO job_candidate (
             job_id, name, email, score, status, stage, source, metrics,
             cv_filename, cv_text, cv_analysis, job_match_analysis,
             overall_cv_score, job_alignment_score, ranking_summary, shortlist_reason
           )
           VALUES ($1, $2, $3, $4, $5, 'CV Screen', 'CV Upload', $6::jsonb,
                   $7, $8, $9::jsonb, $10::jsonb, $11, $12, $13, $14)
           RETURNING *`,
          [
            job_id,
            cleanName,
            email,
            score,
            status,
            JSON.stringify(metrics),
            filename,
            analysis.cv_text || null,
            JSON.stringify(analysis.cv_analysis || {}),
            JSON.stringify(analysis.job_match_analysis || {}),
            normalizeScore(analysis.overall_cv_score),
            normalizeScore(analysis.job_alignment_score),
            analysis.summary || null,
            shortlistReason,
          ]
        );

        results.push({ filename, success: true, candidate: result.rows[0] });
      } catch (fileErr) {
        console.error(`HR CV analysis failed for ${filename}:`, fileErr);
        results.push({
          filename,
          success: false,
          error: fileErr.message || "CV analysis failed.",
        });
      }
    }

    const candidates = results.filter((item) => item.success).map((item) => item.candidate);
    const errors = results.filter((item) => !item.success);
    const statusCode = errors.length > 0 ? 207 : 201;

    res.status(statusCode).json({
      message: `${candidates.length} of ${files.length} CVs analyzed successfully.`,
      candidates,
      errors,
      results,
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

    const inviter = await pool.query(
      `SELECT full_name FROM hr_user WHERE hr_user_id = $1 LIMIT 1`,
      [req.hrUser.id]
    );
    const workspaceRes = await pool.query(
      `SELECT name, company_name, domain FROM workspace WHERE workspace_id = $1 LIMIT 1`,
      [workspace_id]
    );
    const inviteDomain = domainFromEmail(email);
    if (workspaceRes.rows[0]?.domain && inviteDomain !== workspaceRes.rows[0].domain) {
      return res.status(400).json({ error: "Invitee email must match the workspace company domain." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + WORKSPACE_INVITE_EXPIRES_DAYS * 86400000);
    const invitationUrl = `${HR_INVITE_BASE_URL}/hr-login?invite=${token}`;

    const saved = await pool.query(
      `INSERT INTO workspace_invite (
         workspace_id, email, full_name, position, role,
         token_hash, invitation_url, expires_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (email) DO UPDATE SET
         workspace_id = EXCLUDED.workspace_id,
         full_name = EXCLUDED.full_name,
         position = EXCLUDED.position,
         role = EXCLUDED.role,
         token_hash = $6,
         invitation_url = $7,
         expires_at = $8,
         accepted_at = NULL,
         created_at = NOW()
       RETURNING invite_id, workspace_id, email, full_name, position, role, invitation_url, expires_at, created_at`,
      [workspace_id, email.toLowerCase(), full_name, position, role || 'Member', tokenHash, invitationUrl, expiresAt]
    );

    sendHrEmailSafely("workspace invitation", sendWorkspaceInvitationEmail, {
      email: email.toLowerCase(),
      name: full_name,
      workspace_name: workspaceRes.rows[0]?.company_name || workspaceRes.rows[0]?.name || "your workspace",
      inviter_name: inviter.rows[0]?.full_name,
      invitation_url: invitationUrl,
    });

    res.json({ message: "Invitation sent successfully.", invitation: saved.rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.validateWorkspaceInvitation = async (req, res, next) => {
  try {
    const tokenHash = hashToken(req.params.token);
    const result = await pool.query(
      `SELECT inv.invite_id, inv.email, inv.full_name, inv.position, inv.role,
              inv.expires_at, w.name AS workspace_name, w.company_name
       FROM workspace_invite inv
       JOIN workspace w ON w.workspace_id = inv.workspace_id
       WHERE inv.token_hash = $1
         AND inv.accepted_at IS NULL
       LIMIT 1`,
      [tokenHash]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: "Invitation not found." });
    if (result.rows[0].expires_at && new Date(result.rows[0].expires_at) < new Date()) {
      return res.status(410).json({ error: "Invitation has expired." });
    }

    res.json({ invitation: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.getInvitations = async (req, res, next) => {
  const { workspace_id } = req.params;
  try {
    const invites = await pool.query(
      `SELECT invite_id, email, full_name, position, role, invitation_url, expires_at, created_at
       FROM workspace_invite
       WHERE workspace_id = $1
         AND accepted_at IS NULL
         AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY created_at DESC`,
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


