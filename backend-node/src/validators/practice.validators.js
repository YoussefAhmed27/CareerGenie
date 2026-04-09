function isScore(x) {
    if (x === null || x === undefined) return true; // optional
    if (typeof x !== "number") return false;
    if (Number.isNaN(x)) return false;
    return x >= 0 && x <= 100;
}

function validateFeedback(body) {
    if (!body) return "Body is required";

    const {
        overall_score,
        technical_score,
        communication_score,
        confidence_score,
        summary_text,
        recommendations_text
    } = body;

    if (!isScore(overall_score)) return "overall_score must be a number 0 to 100";
    if (!isScore(technical_score)) return "technical_score must be a number 0 to 100";
    if (!isScore(communication_score)) return "communication_score must be a number 0 to 100";
    if (!isScore(confidence_score)) return "confidence_score must be a number 0 to 100";

    if (summary_text !== undefined && summary_text !== null && typeof summary_text !== "string") {
        return "summary_text must be a string";
    }

    if (recommendations_text !== undefined && recommendations_text !== null && typeof recommendations_text !== "string") {
        return "recommendations_text must be a string";
    }

    return null;
}

module.exports = { validateFeedback };