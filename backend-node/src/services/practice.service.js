const pool = require("../db");

async function sessionBelongsToCandidate(candidateId, sessionId) {
    const check = await pool.query(
        `SELECT 1
         FROM practice_session
         WHERE practice_session_id = $1 AND candidate_id = $2`,
        [sessionId, candidateId]
    );

    return check.rows.length > 0;
}

exports.startSession = async (candidateId, body) => {
    const mode = body.mode || null;
    const language = body.language || null;

    const result = await pool.query(
        `INSERT INTO practice_session (candidate_id, mode, language, status)
         VALUES ($1, $2, $3, 'ACTIVE')
         RETURNING practice_session_id, candidate_id, started_at, mode, language, status`,
        [candidateId, mode, language]
    );

    return result.rows[0];
};

exports.listMySessions = async (candidateId) => {
    const result = await pool.query(
        `SELECT practice_session_id, started_at, ended_at, mode, language, status
         FROM practice_session
         WHERE candidate_id = $1
         ORDER BY started_at DESC`,
        [candidateId]
    );

    return result.rows;
};

exports.getOneSession = async (candidateId, sessionId) => {
    const result = await pool.query(
        `SELECT practice_session_id, candidate_id, started_at, ended_at, mode, language, status, recording_url, transcript_text
         FROM practice_session
         WHERE practice_session_id = $1 AND candidate_id = $2`,
        [sessionId, candidateId]
    );

    if (result.rows.length === 0) return null;
    return result.rows[0];
};

exports.endSession = async (candidateId, sessionId) => {
    const result = await pool.query(
        `UPDATE practice_session
         SET status = 'ENDED', ended_at = NOW()
         WHERE practice_session_id = $1 AND candidate_id = $2 AND status = 'ACTIVE'
         RETURNING practice_session_id, status, ended_at`,
        [sessionId, candidateId]
    );

    if (result.rows.length === 0) return null;
    return result.rows[0];
};

exports.updateTranscript = async (candidateId, sessionId, body) => {
    const transcriptText = body.transcript_text;
    const language = body.language || null;

    const result = await pool.query(
        `UPDATE practice_session
         SET transcript_text = $1,
             language = COALESCE($2, language)
         WHERE practice_session_id = $3 AND candidate_id = $4
         RETURNING practice_session_id, transcript_text, language`,
        [transcriptText, language, sessionId, candidateId]
    );

    if (result.rows.length === 0) return null;
    return result.rows[0];
};

exports.updateRecording = async (candidateId, sessionId, recordingUrl) => {
    const result = await pool.query(
        `UPDATE practice_session
         SET recording_url = $1
         WHERE practice_session_id = $2 AND candidate_id = $3
         RETURNING practice_session_id, recording_url`,
        [recordingUrl, sessionId, candidateId]
    );

    if (result.rows.length === 0) return null;
    return result.rows[0];
};

exports.saveOrOverwriteFeedback = async (candidateId, sessionId, body) => {
    const isMine = await sessionBelongsToCandidate(candidateId, sessionId);
    if (!isMine) return null;

    const overall_score = body.overall_score ?? null;
    const technical_score = body.technical_score ?? null;
    const communication_score = body.communication_score ?? null;
    const confidence_score = body.confidence_score ?? null;
    const summary_text = body.summary_text ?? null;
    const recommendations_text = body.recommendations_text ?? null;

    const result = await pool.query(
        `
        INSERT INTO practice_feedback (
          practice_session_id,
          overall_score,
          technical_score,
          communication_score,
          confidence_score,
          summary_text,
          recommendations_text
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        ON CONFLICT (practice_session_id)
        DO UPDATE SET
          overall_score = EXCLUDED.overall_score,
          technical_score = EXCLUDED.technical_score,
          communication_score = EXCLUDED.communication_score,
          confidence_score = EXCLUDED.confidence_score,
          summary_text = EXCLUDED.summary_text,
          recommendations_text = EXCLUDED.recommendations_text,
          created_at = now()
        RETURNING *;
        `,
        [
            sessionId,
            overall_score,
            technical_score,
            communication_score,
            confidence_score,
            summary_text,
            recommendations_text
        ]
    );

    return result.rows[0];
};

exports.getFeedback = async (candidateId, sessionId) => {
    const isMine = await sessionBelongsToCandidate(candidateId, sessionId);
    if (!isMine) return null;

    const result = await pool.query(
        `SELECT *
         FROM practice_feedback
         WHERE practice_session_id = $1`,
        [sessionId]
    );

    if (result.rows.length === 0) return false;
    return result.rows[0];
};