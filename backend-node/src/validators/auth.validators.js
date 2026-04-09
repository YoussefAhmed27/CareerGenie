function isEmail(value) {
    if (typeof value !== "string") return false;
    return value.includes("@") && value.includes(".");
}

function validateRegister(body) {
    if (!body) return "Body is required";

    const { full_name, email, password } = body;

    if (!full_name || typeof full_name !== "string") return "full_name is required";
    if (!email || !isEmail(email)) return "valid email is required";
    if (!password || typeof password !== "string") return "password is required";
    if (password.length < 6) return "password must be at least 6 chars";

    return null;
}

function validateLogin(body) {
    if (!body) return "Body is required";

    const { email, password } = body;

    if (!email || !isEmail(email)) return "valid email is required";
    if (!password || typeof password !== "string") return "password is required";

    return null;
}

module.exports = { validateRegister, validateLogin };