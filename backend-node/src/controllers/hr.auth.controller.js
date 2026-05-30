const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db");

const SALT_ROUNDS = 12;
const ACCESS_EXPIRES = "15m";
const REFRESH_EXPIRES_DAYS = 30;

function extractDomain(email) {
  return email.split("@")[1]?.toLowerCase() || "";
}

function companyNameFromDomain(domain) {
  // "techcorp.com" → "TechCorp"
  const base = domain.split(".")[0];
  return base.charAt(0).toUpperCase() + base.slice(1);
}

function generateAccessToken(hrUser) {
  return jwt.sign(
    { hr_user_id: hrUser.hr_user_id, email: hrUser.email, domain: hrUser.domain },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_EXPIRES }
  );
}

async function generateRefreshToken(hrUserId, res) {
  const token = require("crypto").randomBytes(64).toString("hex");
  const hash = await bcrypt.hash(token, 8);
  const expiresAt = new Date(Date.now() + REFRESH_EXPIRES_DAYS * 86400000);
  await pool.query(
    `INSERT INTO hr_refresh_token (hr_user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [hrUserId, hash, expiresAt]
  );
  res.cookie("hr_refresh_token", token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "strict", maxAge: REFRESH_EXPIRES_DAYS * 86400000,
  });
  return token;
}

// ─── REGISTER ────────────────────────────────────────────────────────────────
exports.register = async (req, res, next) => {
  const { email, password, full_name, position } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email and password are required." });

  const domain = extractDomain(email);
  if (!domain) return res.status(400).json({ error: "Invalid email address." });

  try {
    // Check if email already exists
    const existing = await pool.query(`SELECT hr_user_id FROM hr_user WHERE email = $1`, [email.toLowerCase()]);
    if (existing.rows.length > 0)
      return res.status(409).json({ error: "An account with this email already exists." });

    // Check if there is a pending invitation
    const inviteRes = await pool.query(
      `SELECT * FROM workspace_invite WHERE email = $1 LIMIT 1`,
      [email.toLowerCase()]
    );
    const hasInvite = inviteRes.rows.length > 0;
    const invite = hasInvite ? inviteRes.rows[0] : null;

    // Inherit values from invite if present
    const finalName = invite ? invite.full_name : (full_name || "");
    const finalPosition = invite ? invite.position : (position || "");

    if (!finalName || !finalPosition) {
      return res.status(400).json({ error: "Full name and position are required." });
    }

    let workspace;
    let createdWorkspace = false;

    if (hasInvite) {
      const ws = await pool.query(`SELECT * FROM workspace WHERE workspace_id = $1`, [invite.workspace_id]);
      if (ws.rows.length === 0) {
        return res.status(400).json({ error: "The workspace you were invited to no longer exists." });
      }
      workspace = ws;
    } else {
      workspace = await pool.query(`SELECT * FROM workspace WHERE domain = $1 LIMIT 1`, [domain]);
    }

    if (workspace.rows.length === 0) {
      // Authorized first HR admin check
      const allowedPositions = [
        "Company Manager",
        "HR Manager",
        "Recruiter",
        "Technical Recruiter",
        "Team Lead",
        "Hiring Manager",
        "Manager"
      ];
      const isAuthorized = allowedPositions.some(pos => finalPosition.toLowerCase().includes(pos.toLowerCase()));

      if (!isAuthorized) {
        return res.status(403).json({
          error: "Unauthorized workspace creation. Only a Company Manager or first HR Admin is authorized to create a company workspace."
        });
      }
      createdWorkspace = true;
    }

    const isOwner = createdWorkspace;
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await pool.query(
      `INSERT INTO hr_user (email, password_hash, full_name, domain, position, is_workspace_owner) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [email.toLowerCase(), hash, finalName, domain, finalPosition, isOwner]
    );
    const hrUser = result.rows[0];

    if (createdWorkspace) {
      const companyName = companyNameFromDomain(domain);
      const ws = await pool.query(
        `INSERT INTO workspace (name, created_by, domain, company_name) VALUES ($1, $2, $3, $4) RETURNING *`,
        [companyName, hrUser.hr_user_id, domain, companyName]
      );
      workspace = { rows: [ws.rows[0]] };
      await pool.query(
        `INSERT INTO workspace_member (workspace_id, hr_user_id, role) VALUES ($1, $2, 'Admin')`,
        [ws.rows[0].workspace_id, hrUser.hr_user_id]
      );
    } else {
      const roleToJoin = invite ? invite.role : 'Member';
      await pool.query(
        `INSERT INTO workspace_member (workspace_id, hr_user_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [workspace.rows[0].workspace_id, hrUser.hr_user_id, roleToJoin]
      );
    }

    if (hasInvite) {
      await pool.query(`DELETE FROM workspace_invite WHERE email = $1`, [email.toLowerCase()]);
    }

    const accessToken = generateAccessToken(hrUser);
    await generateRefreshToken(hrUser.hr_user_id, res);

    res.status(201).json({
      accessToken,
      hrUser: { 
        hr_user_id: hrUser.hr_user_id, 
        email: hrUser.email, 
        full_name: hrUser.full_name, 
        domain, 
        position: hrUser.position,
        is_workspace_owner: hrUser.is_workspace_owner 
      },
      workspace: workspace.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

// ─── LOGIN ────────────────────────────────────────────────────────────────────
exports.login = async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email and password are required." });

  try {
    const result = await pool.query(`SELECT * FROM hr_user WHERE email = $1`, [email.toLowerCase()]);
    if (result.rows.length === 0)
      return res.status(401).json({ error: "Invalid email or password." });

    const hrUser = result.rows[0];
    const valid = await bcrypt.compare(password, hrUser.password_hash);
    if (!valid) return res.status(401).json({ error: "Invalid email or password." });

    // Update last login
    await pool.query(`UPDATE hr_user SET last_login_at = NOW() WHERE hr_user_id = $1`, [hrUser.hr_user_id]);

    // Get workspace
    const ws = await pool.query(
      `SELECT w.* FROM workspace w JOIN workspace_member wm ON w.workspace_id = wm.workspace_id WHERE wm.hr_user_id = $1 LIMIT 1`,
      [hrUser.hr_user_id]
    );

    const accessToken = generateAccessToken(hrUser);
    await generateRefreshToken(hrUser.hr_user_id, res);

    res.json({
      accessToken,
      hrUser: { 
        hr_user_id: hrUser.hr_user_id, 
        email: hrUser.email, 
        full_name: hrUser.full_name, 
        domain: hrUser.domain, 
        position: hrUser.position, 
        is_workspace_owner: hrUser.is_workspace_owner 
      },
      workspace: ws.rows[0] || null,
    });
  } catch (err) {
    next(err);
  }
};

// ─── REFRESH ──────────────────────────────────────────────────────────────────
exports.refresh = async (req, res, next) => {
  const token = req.cookies?.hr_refresh_token;
  if (!token) return res.status(401).json({ error: "No refresh token" });

  try {
    const tokens = await pool.query(
      `SELECT * FROM hr_refresh_token WHERE revoked_at IS NULL AND expires_at > NOW()`,
    );
    let matchedToken = null;
    for (const t of tokens.rows) {
      if (await bcrypt.compare(token, t.token_hash)) { matchedToken = t; break; }
    }
    if (!matchedToken) return res.status(401).json({ error: "Invalid refresh token" });

    // Revoke old token
    await pool.query(`UPDATE hr_refresh_token SET revoked_at = NOW() WHERE hr_refresh_token_id = $1`, [matchedToken.hr_refresh_token_id]);

    const hrUser = await pool.query(`SELECT * FROM hr_user WHERE hr_user_id = $1`, [matchedToken.hr_user_id]);
    if (hrUser.rows.length === 0) return res.status(401).json({ error: "User not found" });

    const accessToken = generateAccessToken(hrUser.rows[0]);
    await generateRefreshToken(matchedToken.hr_user_id, res);

    res.json({ accessToken });
  } catch (err) {
    next(err);
  }
};

// ─── LOGOUT ───────────────────────────────────────────────────────────────────
exports.logout = async (req, res, next) => {
  const token = req.cookies?.hr_refresh_token;
  if (token) {
    const tokens = await pool.query(`SELECT * FROM hr_refresh_token WHERE revoked_at IS NULL`);
    for (const t of tokens.rows) {
      if (await bcrypt.compare(token, t.token_hash)) {
        await pool.query(`UPDATE hr_refresh_token SET revoked_at = NOW() WHERE hr_refresh_token_id = $1`, [t.hr_refresh_token_id]);
        break;
      }
    }
  }
  res.clearCookie("hr_refresh_token");
  res.json({ message: "Logged out" });
};

// ─── ME ───────────────────────────────────────────────────────────────────────
exports.me = async (req, res, next) => {
  try {
    const hrUser = await pool.query(
      `SELECT hr_user_id, email, full_name, domain, position, is_workspace_owner, created_at FROM hr_user WHERE hr_user_id = $1`,
      [req.hrUser.id]
    );
    if (hrUser.rows.length === 0) return res.status(404).json({ error: "User not found" });

    const ws = await pool.query(
      `SELECT w.* FROM workspace w JOIN workspace_member wm ON w.workspace_id = wm.workspace_id WHERE wm.hr_user_id = $1 LIMIT 1`,
      [req.hrUser.id]
    );

    res.json({ hrUser: hrUser.rows[0], workspace: ws.rows[0] || null });
  } catch (err) {
    next(err);
  }
};
