const crypto = require("crypto");

function getCookie(req, name) {
    if (!req.cookies) return null;
    return req.cookies[name] || null;
}

function setCsrfCookie(res, token) {
    const isProd = process.env.NODE_ENV === "production";

    res.cookie("csrf_token", token, {
        httpOnly: false,
        sameSite: "lax",
        secure: isProd
    });
}

function generateToken() {
    return crypto.randomBytes(32).toString("hex");
}

// Issues a CSRF token cookie (call this endpoint before login/logout/refresh in a browser)
function issueCsrf(req, res) {
    const token = generateToken();
    setCsrfCookie(res, token);
    res.json({ csrfToken: token });
}

// Protects all state-changing requests
function csrfProtect(req, res, next) {
    const method = req.method.toUpperCase();

    if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
        return next();
    }

    const cookieToken = getCookie(req, "csrf_token");
    const headerToken = req.get("x-csrf-token");

    if (!cookieToken || !headerToken) {
        return res.status(403).json({ error: "CSRF token missing" });
    }

    if (cookieToken !== headerToken) {
        return res.status(403).json({ error: "CSRF token invalid" });
    }

    next();
}

module.exports = { issueCsrf, csrfProtect };