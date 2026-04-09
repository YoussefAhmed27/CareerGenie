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

        req.user = { candidate_id: payload.candidate_id };
        next();
    } catch (err) {
        return res.status(401).json({ error: "Invalid token" });
    }
}

module.exports = { requireAuth };