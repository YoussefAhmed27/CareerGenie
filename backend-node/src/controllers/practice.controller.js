const service = require("../services/practice.service");

exports.startSession = async (req, res) => {
    try {
        const session = await service.startSession(req.user.candidate_id, req.body);
        res.status(201).json({ session });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.listMySessions = async (req, res) => {
    try {
        const sessions = await service.listMySessions(req.user.candidate_id);
        res.json({ sessions });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getOneSession = async (req, res) => {
    try {
        const sessionId = Number(req.params.id);
        const session = await service.getOneSession(req.user.candidate_id, sessionId);

        if (!session) {
            return res.status(404).json({ error: "Session not found" });
        }

        res.json({ session });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.endSession = async (req, res) => {
    try {
        const sessionId = Number(req.params.id);
        const session = await service.endSession(req.user.candidate_id, sessionId);

        if (!session) {
            return res.status(404).json({ error: "Active session not found" });
        }

        res.json({ session });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateTranscript = async (req, res) => {
    try {
        const sessionId = Number(req.params.id);
        const { transcript_text, language } = req.body;

        if (!transcript_text) {
            return res.status(400).json({ error: "transcript_text is required" });
        }

        const session = await service.updateTranscript(req.user.candidate_id, sessionId, {
            transcript_text,
            language
        });

        if (!session) {
            return res.status(404).json({ error: "Session not found" });
        }

        res.json({ session });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateRecording = async (req, res) => {
    try {
        const sessionId = Number(req.params.id);
        const { recording_url } = req.body;

        if (!recording_url) {
            return res.status(400).json({ error: "recording_url is required" });
        }

        const session = await service.updateRecording(req.user.candidate_id, sessionId, recording_url);

        if (!session) {
            return res.status(404).json({ error: "Session not found" });
        }

        res.json({ session });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.saveOrOverwriteFeedback = async (req, res) => {
    try {
        const sessionId = Number(req.params.id);

        const feedback = await service.saveOrOverwriteFeedback(
            req.user.candidate_id,
            sessionId,
            req.body
        );

        if (!feedback) {
            return res.status(404).json({ error: "Session not found" });
        }

        res.json({ feedback });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getFeedback = async (req, res) => {
    try {
        const sessionId = Number(req.params.id);

        const result = await service.getFeedback(req.user.candidate_id, sessionId);

        if (result === null) {
            return res.status(404).json({ error: "Session not found" });
        }

        if (result === false) {
            return res.status(404).json({ error: "No feedback found" });
        }

        res.json({ feedback: result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};