const express = require("express");
const cors = require("cors");
const testRoutes = require("./routes/testRoutes");
const authRoutes = require("./routes/authRoutes");
const hospitalRoutes = require("./routes/hospitalRoutes");
const emergencyRoutes = require("./routes/emergencyRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use("/api", testRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/hospital", hospitalRoutes);
app.use("/api/emergency", emergencyRoutes);
// Home Route
app.get("/", (req, res) => {
    res.send("Welcome to MedAI Connect 🚑");
});

module.exports = app;