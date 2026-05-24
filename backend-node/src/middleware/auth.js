const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
    try {
        const header = req.headers.authorization || "";
        const token = header.startsWith("Bearer ") ? header.slice(7) : null;

        if (!token) {
            return res.status(401).json({ error: "Missing token" });
        }

        const payload = jwt.verify(token, process.env.JWT_SECRET);

        if (!payload || !payload.candidate_id) {
            return res.status(401).json({ error: "Invalid token" });
        }

        req.user = { id: payload.candidate_id, candidate_id: payload.candidate_id };
        next();
    } catch (err) {
        return res.status(401).json({ error: "Invalid token" });
    }
}

function requireHrAuth(req, res, next) {
    try {
        const header = req.headers.authorization || "";
        const token = header.startsWith("Bearer ") ? header.slice(7) : null;

        if (!token) {
            return res.status(401).json({ error: "Missing HR token" });
        }

        const payload = jwt.verify(token, process.env.JWT_SECRET);

        if (!payload || !payload.hr_user_id) {
            return res.status(401).json({ error: "Invalid HR token" });
        }

        req.hrUser = { id: payload.hr_user_id, email: payload.email, domain: payload.domain };
        next();
    } catch (err) {
        return res.status(401).json({ error: "Invalid HR token" });
    }
}

module.exports = { requireAuth, requireHrAuth };