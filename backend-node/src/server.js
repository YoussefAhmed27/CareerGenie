require("dotenv").config();

const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");
const pool = require("./db");

const authRoutes = require("./routes/auth");
const practiceRoutes = require("./routes/practice");
const profileRoutes = require("./routes/profile");
const { errorHandler } = require("./middleware/errorHandler");
const { csrfProtect } = require("./middleware/csrf");

const app = express();

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
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/uploads", express.static("uploads"));

// CSRF protection for all state-changing requests
app.use(csrfProtect);

app.use("/auth", authRoutes);
app.use("/practice", practiceRoutes);
app.use("/api/profile", profileRoutes);

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