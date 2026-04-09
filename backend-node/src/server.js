const express = require("express");
require("dotenv").config();
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");

const app = express();

const authRoutes = require("./routes/auth");
const practiceRoutes = require("./routes/practice");
const pool = require("./db");
const { errorHandler } = require("./middleware/errorHandler");
const { csrfProtect } = require("./middleware/csrf");

const allowedOrigins = [
    process.env.CLIENT_ORIGIN
].filter(Boolean);

app.use(helmet({
    crossOriginResourcePolicy: false
}));

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error("Not allowed by CORS"));
    },
    credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// CSRF protection for all state-changing requests
app.use(csrfProtect);

app.use("/auth", authRoutes);
app.use("/practice", practiceRoutes);

app.get("/", (req, res) => {
    res.json({ message: "CareerGenie Backend Running" });
});

app.get("/test-db", async (req, res, next) => {
    try {
        const result = await pool.query("SELECT NOW() AS now");
        res.json(result.rows[0]);
    } catch (err) {
        next(err);
    }
});

app.use((req, res) => {
    res.status(404).json({ error: "Route not found" });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});