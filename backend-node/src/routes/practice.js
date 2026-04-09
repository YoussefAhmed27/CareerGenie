const express = require("express");
const { requireAuth } = require("../middleware/auth");
const controller = require("../controllers/practice.controller");

const router = express.Router();

// Sessions
router.post("/sessions", requireAuth, controller.startSession);
router.get("/sessions", requireAuth, controller.listMySessions);
router.get("/sessions/:id", requireAuth, controller.getOneSession);
router.post("/sessions/:id/end", requireAuth, controller.endSession);

// Transcript + Recording
router.post("/sessions/:id/transcript", requireAuth, controller.updateTranscript);
router.post("/sessions/:id/recording", requireAuth, controller.updateRecording);

// Feedback
router.post("/sessions/:id/feedback", requireAuth, controller.saveOrOverwriteFeedback);
router.get("/sessions/:id/feedback", requireAuth, controller.getFeedback);

module.exports = router;