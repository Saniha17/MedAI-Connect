const express = require("express");

const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");

const {
    registerUser,
    loginUser,
    getUsers,
    getUserById,
} = require("../controllers/authController");
router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/users", verifyToken, getUsers);
router.get("/user/:id", getUserById);

module.exports = router;