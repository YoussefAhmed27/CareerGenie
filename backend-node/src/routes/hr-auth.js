const express = require("express");
const router = express.Router();
const { requireHrAuth } = require("../middleware/auth");
const hrAuth = require("../controllers/hr.auth.controller");

router.post("/register", hrAuth.register);
router.post("/login", hrAuth.login);
router.post("/refresh", hrAuth.refresh);
router.post("/logout", hrAuth.logout);
router.get("/me", requireHrAuth, hrAuth.me);

module.exports = router;
