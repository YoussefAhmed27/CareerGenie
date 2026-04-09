function validateBody(validatorFn) {
    return (req, res, next) => {
        const error = validatorFn(req.body);

        if (error) {
            return res.status(400).json({ error });
        }

        next();
    };
}

module.exports = { validateBody };