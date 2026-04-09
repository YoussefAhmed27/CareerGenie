const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const rateLimit = require("express-rate-limit");
const crypto = require("crypto");
const { issueCsrf } = require("../middleware/csrf");

const { validateBody } = require("../middleware/validate");
const { validateRegister, validateLogin } = require("../validators/auth.validators");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const loginLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 10,
    message: { error: "Too many login attempts, try again later" }
});

function hashToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
}

function signAccessToken(candidateId) {
    if (!process.env.JWT_SECRET) {
        const err = new Error("JWT_SECRET is not set");
        err.statusCode = 500;
        throw err;
    }

    const ttl = process.env.ACCESS_TOKEN_TTL || "15m";

    return jwt.sign(
        { candidate_id: candidateId },
        process.env.JWT_SECRET,
        { expiresIn: ttl }
    );
}

function signRefreshToken(candidateId) {
    if (!process.env.JWT_REFRESH_SECRET) {
        const err = new Error("JWT_REFRESH_SECRET is not set");
        err.statusCode = 500;
        throw err;
    }

    const days = Number(process.env.REFRESH_TOKEN_TTL_DAYS || 7);
    const seconds = days * 24 * 60 * 60;

    return jwt.sign(
        { candidate_id: candidateId, typ: "refresh" },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: seconds }
    );
}

function refreshCookieOptions() {
    const isProd = process.env.NODE_ENV === "production";

    return {
        httpOnly: true,
        sameSite: "lax",
        secure: isProd,
        path: "/auth/refresh"
    };
}

async function saveRefreshToken(candidateId, refreshToken) {
    const days = Number(process.env.REFRESH_TOKEN_TTL_DAYS || 7);
    const tokenHash = hashToken(refreshToken);

    const result = await pool.query(
        `INSERT INTO refresh_token (candidate_id, token_hash, expires_at)
         VALUES ($1, $2, NOW() + ($3 || ' days')::interval)
         RETURNING refresh_token_id`,
        [candidateId, tokenHash, String(days)]
    );

    return result.rows[0].refresh_token_id;
}

async function revokeRefreshTokenRow(refreshTokenId, replacedById) {
    await pool.query(
        `UPDATE refresh_token
         SET revoked_at = NOW(),
             replaced_by = $2
         WHERE refresh_token_id = $1`,
        [refreshTokenId, replacedById || null]
    );
}

// REGISTER
router.post("/register", validateBody(validateRegister), async (req, res, next) => {
    try {
        const {
            email,
            password,
            full_name,
            phone,
            country,
            years_of_experience,
            current_role,
            desired_role
        } = req.body;

        const normalizedEmail = email.toLowerCase().trim();

        const existing = await pool.query(
            "SELECT candidate_id FROM candidate WHERE email = $1",
            [normalizedEmail]
        );

        if (existing.rows.length > 0) {
            return res.status(409).json({ error: "Email already exists" });
        }

        const password_hash = await bcrypt.hash(password, 10);

        const result = await pool.query(
            `INSERT INTO candidate 
            (email, password_hash, full_name, phone, country, years_of_experience, "current_role", desired_role)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            RETURNING candidate_id, email, full_name, created_at`,
            [
                normalizedEmail,
                password_hash,
                full_name,
                phone || null,
                country || null,
                years_of_experience || null,
                current_role || null,
                desired_role || null
            ]
        );

        res.status(201).json({ candidate: result.rows[0] });
    } catch (err) {
        next(err);
    }
});

// LOGIN
router.post("/login", loginLimiter, validateBody(validateLogin), async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const normalizedEmail = email.toLowerCase().trim();

        const result = await pool.query(
            "SELECT * FROM candidate WHERE email = $1",
            [normalizedEmail]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const candidate = result.rows[0];

        const valid = await bcrypt.compare(password, candidate.password_hash);

        if (!valid) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        await pool.query(
            "UPDATE candidate SET last_login_at = NOW() WHERE candidate_id = $1",
            [candidate.candidate_id]
        );

        const accessToken = signAccessToken(candidate.candidate_id);
        const refreshToken = signRefreshToken(candidate.candidate_id);

        await saveRefreshToken(candidate.candidate_id, refreshToken);

        res.cookie("refresh_token", refreshToken, refreshCookieOptions());

        res.json({
            accessToken,
            candidate: {
                candidate_id: candidate.candidate_id,
                email: candidate.email,
                full_name: candidate.full_name
            }
        });
    } catch (err) {
        next(err);
    }
});

// REFRESH
router.post("/refresh", async (req, res, next) => {
    try {
        const refreshToken = req.cookies.refresh_token;

        if (!refreshToken) {
            return res.status(401).json({ error: "Missing refresh token" });
        }

        let payload;
        try {
            payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        } catch (e) {
            return res.status(401).json({ error: "Invalid refresh token" });
        }

        if (!payload || payload.typ !== "refresh" || !payload.candidate_id) {
            return res.status(401).json({ error: "Invalid refresh token" });
        }

        const tokenHash = hashToken(refreshToken);

        const dbRow = await pool.query(
            `SELECT refresh_token_id, candidate_id, expires_at, revoked_at
             FROM refresh_token
             WHERE token_hash = $1`,
            [tokenHash]
        );

        if (dbRow.rows.length === 0) {
            return res.status(401).json({ error: "Refresh token not recognized" });
        }

        const row = dbRow.rows[0];

        if (row.revoked_at) {
            return res.status(401).json({ error: "Refresh token revoked" });
        }

        const now = new Date();
        const expiresAt = new Date(row.expires_at);
        if (expiresAt <= now) {
            return res.status(401).json({ error: "Refresh token expired" });
        }

        const newAccessToken = signAccessToken(row.candidate_id);
        const newRefreshToken = signRefreshToken(row.candidate_id);

        const newRefreshId = await saveRefreshToken(row.candidate_id, newRefreshToken);

        await revokeRefreshTokenRow(row.refresh_token_id, newRefreshId);

        res.cookie("refresh_token", newRefreshToken, refreshCookieOptions());

        res.json({ accessToken: newAccessToken });
    } catch (err) {
        next(err);
    }
});

// LOGOUT
router.post("/logout", async (req, res, next) => {
    try {
        const refreshToken = req.cookies.refresh_token;

        if (refreshToken) {
            const tokenHash = hashToken(refreshToken);

            const dbRow = await pool.query(
                `SELECT refresh_token_id
                 FROM refresh_token
                 WHERE token_hash = $1`,
                [tokenHash]
            );

            if (dbRow.rows.length > 0) {
                await revokeRefreshTokenRow(dbRow.rows[0].refresh_token_id, null);
            }
        }

        res.clearCookie("refresh_token", refreshCookieOptions());
        res.json({ message: "Logged out" });
    } catch (err) {
        next(err);
    }
});

router.get("/me", requireAuth, async (req, res) => {
    res.json({ candidate_id: req.user.candidate_id });
});

// CSRF token
router.get("/csrf", issueCsrf);

module.exports = router;