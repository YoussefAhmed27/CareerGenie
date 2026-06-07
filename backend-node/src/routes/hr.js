const express = require("express");
const router = express.Router();
const { requireHrAuth } = require("../middleware/auth");
const hr = require("../controllers/hr.controller");

// ─── WORKSPACE ───────────────────────────────────────────
router.get("/workspace", requireHrAuth, hr.getOrCreateWorkspace);
router.post("/workspace", requireHrAuth, hr.getOrCreateWorkspace);
router.post("/workspace/join", requireHrAuth, hr.joinWorkspace);
router.delete("/workspace/:workspace_id/members/:member_id", requireHrAuth, hr.removeMember);
router.post("/workspace/:workspace_id/invitations", requireHrAuth, hr.inviteMember);
router.get("/workspace/:workspace_id/invitations", requireHrAuth, hr.getInvitations);
router.delete("/workspace/:workspace_id/invitations/:invite_id", requireHrAuth, hr.cancelInvitation);

// ─── DASHBOARD STATS ─────────────────────────────────────
router.get("/stats", requireHrAuth, hr.getDashboardStats);

// ─── JOBS ─────────────────────────────────────────────────
router.get("/jobs", requireHrAuth, hr.getJobs);
router.post("/jobs", requireHrAuth, hr.createJob);
router.patch("/jobs/:job_id/status", requireHrAuth, hr.updateJobStatus);
router.delete("/jobs/:job_id", requireHrAuth, hr.deleteJob);

// ─── CANDIDATES ───────────────────────────────────────────
const multer = require("multer");
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.get("/public/ai-interviews/:token", hr.validatePublicAIInterviewInvitation);
router.post("/public/ai-interviews/:token/start", hr.markPublicAIInterviewStarted);
router.post("/public/ai-interviews/:token/result", hr.savePublicAIInterviewResult);
router.get("/public/live-interviews/:token", hr.validatePublicLiveInterviewRoom);
router.get("/public/workspace-invitations/:token", hr.validateWorkspaceInvitation);

router.get("/jobs/:job_id/candidates", requireHrAuth, hr.getCandidates);
router.post("/jobs/:job_id/candidates", requireHrAuth, hr.addCandidate);
router.post("/jobs/:job_id/upload-cvs", requireHrAuth, upload.array("cvs", 15), hr.uploadCVs);
router.patch("/candidates/:job_candidate_id", requireHrAuth, hr.updateCandidate);
router.delete("/candidates/:job_candidate_id", requireHrAuth, hr.deleteCandidate);
router.post("/candidates/:job_candidate_id/reject", requireHrAuth, hr.rejectCandidate);
router.post("/candidates/:job_candidate_id/hire", requireHrAuth, hr.hireCandidate);
router.post("/candidates/:job_candidate_id/schedule-ai", requireHrAuth, hr.scheduleAIInterview);
router.get("/candidates/:job_candidate_id/ai-result", requireHrAuth, hr.getAIInterviewResult);
router.post("/candidates/:job_candidate_id/live-rooms", requireHrAuth, hr.createLiveInterviewRoom);
router.get("/live-rooms", requireHrAuth, hr.getLiveInterviewRooms);
router.get("/live-rooms/:room_id", requireHrAuth, hr.getLiveInterviewRoomForHr);
router.post("/live-rooms/:room_id/start", requireHrAuth, hr.startLiveInterviewRoom);
router.post("/live-rooms/:room_id/end", requireHrAuth, hr.endLiveInterviewRoom);

module.exports = router;
