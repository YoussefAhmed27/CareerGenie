const express = require("express");
const multer = require("multer");
const pool = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const uploadPhoto = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith("image/")) {
            return cb(new Error("Only image files are allowed"));
        }
        cb(null, true);
    }
});

const uploadCv = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype !== "application/pdf") {
            return cb(new Error("Only PDF files are allowed"));
        }
        cb(null, true);
    }
});

router.get("/me", requireAuth, async (req, res, next) => {
    try {
        const result = await pool.query(
            `SELECT candidate_id, email, full_name, phone, country, years_of_experience,
                    "current_role", desired_role, bio_summary, linkedin_url, portfolio_url,
                    photo_filename, cv_filename
             FROM candidate
             WHERE candidate_id = $1`,
            [req.user.candidate_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Profile not found" });
        }

        const row = result.rows[0];

        res.json({
            candidate_id: row.candidate_id,
            email: row.email,
            full_name: row.full_name,
            phone: row.phone,
            country: row.country,
            years_of_experience: row.years_of_experience,
            current_role: row.current_role,
            desired_role: row.desired_role,
            bio_summary: row.bio_summary,
            linkedin_url: row.linkedin_url,
            portfolio_url: row.portfolio_url,
            photo_filename: row.photo_filename,
            cv_filename: row.cv_filename
        });
    } catch (err) {
        next(err);
    }
});

router.put("/me", requireAuth, async (req, res, next) => {
    try {
        const {
            full_name,
            phone,
            country,
            years_of_experience,
            current_role,
            desired_role,
            bio_summary,
            linkedin_url,
            portfolio_url
        } = req.body || {};

        if (!full_name || !full_name.trim()) {
            return res.status(400).json({ error: "Full name is required" });
        }

        await pool.query(
            `UPDATE candidate
             SET full_name = $1,
                 phone = $2,
                 country = $3,
                 years_of_experience = $4,
                 "current_role" = $5,
                 desired_role = $6,
                 bio_summary = $7,
                 linkedin_url = $8,
                 portfolio_url = $9
             WHERE candidate_id = $10`,
            [
                full_name.trim(),
                phone || null,
                country || null,
                years_of_experience || null,
                current_role || null,
                desired_role || null,
                bio_summary || null,
                linkedin_url || null,
                portfolio_url || null,
                req.user.candidate_id
            ]
        );

        res.json({ message: "Profile updated successfully" });
    } catch (err) {
        next(err);
    }
});

router.post("/upload-photo", requireAuth, uploadPhoto.single("photo"), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "Photo file is required" });
        }

        await pool.query(
            `UPDATE candidate
             SET photo_data = $1,
                 photo_mime_type = $2,
                 photo_filename = $3
             WHERE candidate_id = $4`,
            [
                req.file.buffer,
                req.file.mimetype,
                req.file.originalname,
                req.user.candidate_id
            ]
        );

        res.json({ message: "Photo uploaded successfully" });
    } catch (err) {
        next(err);
    }
});

router.post("/upload-cv", requireAuth, uploadCv.single("cv"), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "CV file is required" });
        }

        await pool.query(
            `UPDATE candidate
             SET cv_data = $1,
                 cv_mime_type = $2,
                 cv_filename = $3
             WHERE candidate_id = $4`,
            [
                req.file.buffer,
                req.file.mimetype,
                req.file.originalname,
                req.user.candidate_id
            ]
        );

        res.json({ message: "CV uploaded successfully" });
    } catch (err) {
        next(err);
    }
});

router.get("/photo", requireAuth, async (req, res, next) => {
    try {
        const result = await pool.query(
            `SELECT photo_data, photo_mime_type
             FROM candidate
             WHERE candidate_id = $1`,
            [req.user.candidate_id]
        );

        if (result.rows.length === 0 || !result.rows[0].photo_data) {
            return res.status(404).json({ error: "Photo not found" });
        }

        res.setHeader("Content-Type", result.rows[0].photo_mime_type || "application/octet-stream");
        res.send(result.rows[0].photo_data);
    } catch (err) {
        next(err);
    }
});

router.get("/cv", requireAuth, async (req, res, next) => {
    try {
        const result = await pool.query(
            `SELECT cv_data, cv_mime_type, cv_filename
             FROM candidate
             WHERE candidate_id = $1`,
            [req.user.candidate_id]
        );

        if (result.rows.length === 0 || !result.rows[0].cv_data) {
            return res.status(404).json({ error: "CV not found" });
        }

        res.setHeader("Content-Type", result.rows[0].cv_mime_type || "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `inline; filename="${result.rows[0].cv_filename || "cv.pdf"}"`
        );
        res.send(result.rows[0].cv_data);
    } catch (err) {
        next(err);
    }
});

router.delete("/me", requireAuth, async (req, res, next) => {
    try {
        await pool.query(
            "DELETE FROM candidate WHERE candidate_id = $1", 
            [req.user.candidate_id]
        );

        res.json({ message: "Account deleted successfully" });
    } catch (err) {
        next(err);
    }
});

module.exports = router;