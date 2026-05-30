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

router.get("/jobs/:job_id/candidates", requireHrAuth, hr.getCandidates);
router.post("/jobs/:job_id/candidates", requireHrAuth, hr.addCandidate);
router.post("/jobs/:job_id/upload-cvs", requireHrAuth, upload.array("cvs", 15), hr.uploadCVs);
router.patch("/candidates/:job_candidate_id", requireHrAuth, hr.updateCandidate);
router.delete("/candidates/:job_candidate_id", requireHrAuth, hr.deleteCandidate);
router.post("/candidates/:job_candidate_id/hire", requireHrAuth, hr.hireCandidate);
router.post("/candidates/:job_candidate_id/schedule-ai", requireHrAuth, hr.scheduleAIInterview);

module.exports = router;
