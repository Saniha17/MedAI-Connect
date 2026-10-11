const express = require("express");

const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");

const {
    registerHospital,
    loginHospital,
    updateBeds,
    getAvailableHospitals,
    recommendHospital,
    updateHospitalResources,
} = require("../controllers/hospitalController");

router.post("/register", registerHospital);

router.post("/login", loginHospital);

router.put("/update-beds/:id", updateBeds);

router.get("/available", getAvailableHospitals);

router.get("/recommend/:emergencyId", recommendHospital);

router.put(
    "/update-resources/:id",
    verifyToken,
    updateHospitalResources
);
module.exports = router;