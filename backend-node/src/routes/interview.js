const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth");
const interviewController = require("../controllers/interview.controller");

router.post("/", requireAuth, interviewController.saveInterview);
router.get("/", requireAuth, interviewController.getInterviews);
router.get("/analytics", requireAuth, interviewController.getAnalytics);
router.get("/:id", requireAuth, interviewController.getInterviewById);
router.delete("/:id", requireAuth, interviewController.deleteInterview);

module.exports = router;