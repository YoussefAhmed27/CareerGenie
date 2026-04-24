const crypto = require("crypto");

function getCookie(req, name) {
    if (!req.cookies) return null;
    return req.cookies[name] || null;
}

function setCsrfCookie(res, token) {
    const isProd = process.env.NODE_ENV === "production";

    res.cookie("csrf_token", token, {
        httpOnly: false,
        sameSite: isProd ? "none" : "lax",
        secure: isProd,
        path: "/"
    });
}

function generateToken() {
    return crypto.randomBytes(32).toString("hex");
}

function issueCsrf(req, res) {
    const token = generateToken();
    setCsrfCookie(res, token);
    res.json({ csrfToken: token });
}

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