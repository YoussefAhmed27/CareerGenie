const pool = require("../db");
const { s3Internal } = require("../utils/s3Client");
const { S3Client, GetObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

exports.saveInterview = async (req, res, next) => {
    try {
        const { job_role, interview_mode, overall_score, video_object_key, feedback_data } = req.body;
        const candidate_id = req.user.candidate_id;

        const result = await pool.query(
            `INSERT INTO interview_session 
            (candidate_id, job_role, interview_mode, overall_score, video_object_key, feedback_data)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING session_id`,
            [candidate_id, job_role, interview_mode, overall_score, video_object_key, JSON.stringify(feedback_data)]
        );

        res.status(201).json({ 
            message: "Interview saved successfully", 
            session_id: result.rows[0].session_id 
        });
    } catch (err) {
        next(err);
    }
};

exports.getInterviews = async (req, res, next) => {
    try {
        const result = await pool.query(
            `SELECT session_id, job_role, interview_mode, overall_score, created_at 
             FROM interview_session 
             WHERE candidate_id = $1 
             ORDER BY created_at DESC`,
            [req.user.candidate_id]
        );

        res.json({ interviews: result.rows });
    } catch (err) {
        next(err);
    }
};

exports.getAnalytics = async (req, res, next) => {
    try {
        const candidate_id = req.user.candidate_id;
        const { timeframe, role } = req.query;

        let queryStr = `
            SELECT session_id, job_role, overall_score, feedback_data, created_at
            FROM interview_session
            WHERE candidate_id = $1
        `;
        const queryParams = [candidate_id];
        let paramIndex = 2;

        if (role && role !== 'all') {
            queryStr += ` AND job_role = $${paramIndex}`;
            queryParams.push(role);
            paramIndex++;
        }

        if (timeframe && timeframe !== 'all') {
            const days = parseInt(timeframe, 10);
            if (!isNaN(days)) {
                queryStr += ` AND created_at >= NOW() - INTERVAL '${days} days'`;
            }
        }

        queryStr += ` ORDER BY created_at ASC`;

        const result = await pool.query(queryStr, queryParams);

        const analyticsData = result.rows.map(row => {
            let fb = row.feedback_data;
            if (typeof fb === 'string') {
                try { fb = JSON.parse(fb); } catch(e) { fb = {}; }
            }
            fb = fb || {};

            const techMetrics = fb.technical_report?.visual_metrics || {};
            const commMetrics = fb.behavioral_report?.visual_metrics?.communication || {};
            const traits = fb.behavioral_report?.visual_metrics?.personality_traits || {};

            const dateObj = new Date(row.created_at);
            const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });

            return {
                id: row.session_id,
                date: dateStr,
                role: row.job_role,
                overallScore: row.overall_score || 0,
                techScore: fb.technical_report?.top_section?.technical_score || 0,
                commScore: fb.behavioral_report?.top_section?.behavioral_score || 0,

                relevance: techMetrics.relevance_to_question || 0,
                jobAlignment: techMetrics.job_alignment || 0,
                structure: techMetrics.answer_structure || 0,
                jargon: techMetrics.technical_jargon_accuracy || 0,
                logic: techMetrics.problem_solving_logic || 0,

                openness: traits.openness || 0,
                conscientiousness: traits.conscientiousness || 0,
                extraversion: traits.extraversion || 0,
                agreeableness: traits.agreeableness || 0,
                neuroticism: traits.neuroticism || 0,
                confidence: traits.confidence || 0,
                nervousness: traits.nervousness || 0,
                engagement: traits.engagement || 0,

                fluency: commMetrics.fluency || 0,
                pacing: commMetrics.pacing || 0,
                tone: commMetrics.tone_expressiveness || 0,
                pauseControl: commMetrics.pause_control || 0,
                fillerWords: commMetrics.filler_word_usage || 0
            };
        });

        res.json({ data: analyticsData });
    } catch (err) {
        console.error("Analytics Error:", err);
        next(err);
    }
};

exports.getInterviewById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT * FROM interview_session 
             WHERE session_id = $1 AND candidate_id = $2`,
            [id, req.user.candidate_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Interview not found" });
        }

        const session = result.rows[0];
        let video_url = null;

        if (session.video_object_key) {
            const command = new GetObjectCommand({
                Bucket: "careergenie-prod-interviewrecordings",
                Key: session.video_object_key,
            });
            video_url = await getSignedUrl(s3Internal, command, { expiresIn: 3600 });
        }

        let parsedFeedback = session.feedback_data;
        if (typeof parsedFeedback === 'string') {
            try { 
                parsedFeedback = JSON.parse(parsedFeedback); 
            } catch(e) { 
                parsedFeedback = {}; 
            }
        }

        res.json({
            session: {
                session_id: session.session_id,
                job_role: session.job_role,
                interview_mode: session.interview_mode,
                overall_score: session.overall_score,
                created_at: session.created_at,
                feedback_data: parsedFeedback, 
                video_url: video_url 
            }
        });
    } catch (err) {
        next(err);
    }
};

exports.deleteInterview = async (req, res, next) => {
    try {
        const { id } = req.params;
        const candidate_id = req.user.candidate_id;

        const getResult = await pool.query(
            `SELECT video_object_key FROM interview_session 
             WHERE session_id = $1 AND candidate_id = $2`,
            [id, candidate_id]
        );

        if (getResult.rows.length === 0) {
            return res.status(404).json({ error: "Interview not found" });
        }

        const video_object_key = getResult.rows[0].video_object_key;

        await pool.query(
            `DELETE FROM interview_session 
             WHERE session_id = $1 AND candidate_id = $2`,
            [id, candidate_id]
        );

        if (video_object_key) {
            const command = new DeleteObjectCommand({
                Bucket: "careergenie-prod-interviewrecordings",
                Key: video_object_key,
            });
            await s3Internal.send(command);
        }

        res.json({ message: "Interview and associated recording deleted successfully" });
    } catch (err) {
        next(err);
    }
};