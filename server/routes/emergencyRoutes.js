
const express = require("express");
const router = express.Router();

const {
  createEmergency,
  acceptEmergency,
  rejectEmergency,
  completeEmergency,
  getAllEmergencies,
  getEmergencyById,
  getAssignedEmergencies,
} = require("../controllers/emergencyController");

const verifyToken = require("../middleware/authMiddleware");

// Create emergency
router.post("/create", createEmergency);

// Hospital actions
router.put("/accept/:id", verifyToken, acceptEmergency);
router.put("/reject/:id", verifyToken, rejectEmergency);
router.put("/complete/:id", verifyToken, completeEmergency);

// Keep this route before /:id
router.get(
  "/hospital/emergencies",
  verifyToken,
  getAssignedEmergencies
);

// Emergency queries
router.get("/all", getAllEmergencies);
router.get("/:id", getEmergencyById);

module.exports = router;
