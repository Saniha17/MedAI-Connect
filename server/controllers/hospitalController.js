const Hospital = require("../models/hospitalModel");
const Emergency = require("../models/emergencyModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// Register Hospital
const registerHospital = async (req, res) => {
    try {
        const {
            hospitalName,
            email,
            password,
            phone,
            address,
            icuBeds,
            generalBeds,
            ventilators,
        } = req.body;

        if (!hospitalName || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Hospital name, email and password are required.",
            });
        }

        const existingHospital = await Hospital.findOne({
            where: { email },
        });

        if (existingHospital) {
            return res.status(409).json({
                success: false,
                message: "A hospital with this email already exists.",
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const hospital = await Hospital.create({
            hospitalName,
            email,
            password: hashedPassword,
            phone,
            address,
            icuBeds: Number(icuBeds) || 0,
            generalBeds: Number(generalBeds) || 0,
            ventilators: Number(ventilators) || 0,
        });

        const hospitalData = hospital.toJSON();
        delete hospitalData.password;

        return res.status(201).json({
            success: true,
            message: "Hospital Registered Successfully",
            hospital: hospitalData,
        });
    } catch (error) {
        console.error("Register Hospital Error:", error);

        return res.status(500).json({
            success: false,
            message: "Server Error",
        });
    }
};

// Hospital Login
const loginHospital = async (req, res) => {
    try {
        const { email, password } = req.body;

        const hospital = await Hospital.findOne({
            where: { email },
        });

        if (!hospital) {
            return res.status(404).json({
                success: false,
                message: "Hospital Not Found",
            });
        }

        const isMatch = await bcrypt.compare(
            password,
            hospital.password
        );

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid Password",
            });
        }

        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is not configured.");
        }

        const token = jwt.sign(
            {
                id: hospital.id,
                email: hospital.email,
            },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        const hospitalData = hospital.toJSON();
        delete hospitalData.password;

        return res.status(200).json({
            success: true,
            message: "Hospital Login Successful",
            token,
            hospital: hospitalData,
        });
    } catch (error) {
        console.error("Hospital Login Error:", error);

        return res.status(500).json({
            success: false,
            message: "Server Error",
        });
    }
};

// Update Hospital Beds
const updateBeds = async (req, res) => {
    try {
        const { id } = req.params;
        const { icuBeds, generalBeds, ventilators } = req.body;

        const hospital = await Hospital.findByPk(id);

        if (!hospital) {
            return res.status(404).json({
                success: false,
                message: "Hospital Not Found",
            });
        }

        if (
            Number(icuBeds) < 0 ||
            Number(generalBeds) < 0 ||
            Number(ventilators) < 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Resource counts cannot be negative.",
            });
        }

        await hospital.update({
            icuBeds: Number(icuBeds) || 0,
            generalBeds: Number(generalBeds) || 0,
            ventilators: Number(ventilators) || 0,
        });

        return res.status(200).json({
            success: true,
            message: "Hospital Resources Updated Successfully",
            hospital,
        });
    } catch (error) {
        console.error("Update Beds Error:", error);

        return res.status(500).json({
            success: false,
            message: "Server Error",
        });
    }
};

// Get Available Hospitals
const getAvailableHospitals = async (req, res) => {
    try {
        const hospitals = await Hospital.findAll({
            where: { status: "Active" },
        });

        const availableHospitals = hospitals.filter(
            (hospital) => Number(hospital.icuBeds) > 0
        );

        return res.status(200).json({
            success: true,
            hospitals: availableHospitals,
        });
    } catch (error) {
        console.error("Get Available Hospitals Error:", error);

        return res.status(500).json({
            success: false,
            message: "Server Error",
        });
    }
};

// Recommend and Assign the Most Suitable Hospital
const recommendHospital = async (req, res) => {
    try {
        const { emergencyId } = req.params;

        const emergency = await Emergency.findByPk(emergencyId);

        if (!emergency) {
            return res.status(404).json({
                success: false,
                message: "Emergency Request Not Found",
            });
        }

        if (
            emergency.status &&
            emergency.status !== "Pending"
        ) {
            return res.status(400).json({
                success: false,
                message: "Only pending emergencies can be reassigned.",
            });
        }

        const hospitals = await Hospital.findAll();

        const availableHospitals = hospitals.filter((hospital) => {
            if (hospital.status !== "Active") {
                return false;
            }

            if (
                emergency.needsICU &&
                Number(hospital.icuBeds) <= 0
            ) {
                return false;
            }

            if (
                emergency.needsVentilator &&
                Number(hospital.ventilators) <= 0
            ) {
                return false;
            }

            return true;
        });

        if (availableHospitals.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No Suitable Hospital Found",
            });
        }

        const severityScores = {
            Critical: 200,
            High: 150,
            Medium: 100,
            Low: 50,
        };

        const trafficScores = {
            Low: 100,
            Medium: 50,
            High: 10,
        };

        const scoredHospitals = availableHospitals.map((hospital) => {
            const icuBeds = Number(hospital.icuBeds) || 0;
            const ventilators = Number(hospital.ventilators) || 0;
            const generalBeds = Number(hospital.generalBeds) || 0;

            const trafficScore =
                trafficScores[hospital.trafficLevel] ?? 10;

            const severityScore =
                severityScores[emergency.severity] ?? 50;

            const score =
                icuBeds * 40 +
                ventilators * 30 +
                generalBeds * 15 +
                trafficScore +
                severityScore;

            return {
                hospital,
                score,
            };
        });

        scoredHospitals.sort(
            (a, b) => b.score - a.score
        );

        const bestMatch = scoredHospitals[0];
        const recommendedHospital = bestMatch.hospital;

        // Save the assignment in the emergency record.
        emergency.hospitalId = recommendedHospital.id;
        await emergency.save();

        return res.status(200).json({
            success: true,
            message: "Hospital Recommended and Assigned Successfully",
            emergency,
            recommendedHospital,
            recommendationScore: bestMatch.score,
            reason: [
                "Patient requirements matched",
                "Hospital active status checked",
                "ICU and ventilator availability checked",
                "Hospital resources considered",
                "Traffic conditions considered",
                "Highest recommendation score selected",
            ],
        });
    } catch (error) {
        console.error("Recommend Hospital Error:", error);

        return res.status(500).json({
            success: false,
            message: "Server Error",
        });
    }
};

// Update Hospital Resources
const updateHospitalResources = async (req, res) => {
    try {
        const { id } = req.params;

        // Only the authenticated hospital can update its own resources.
        if (String(req.user.id) !== String(id)) {
            return res.status(403).json({
                success: false,
                message: "You can only update your own hospital resources.",
            });
        }

        const {
            icuBeds,
            generalBeds,
            ventilators,
            trafficLevel,
            status,
        } = req.body;

        const hospital = await Hospital.findByPk(id);

        if (!hospital) {
            return res.status(404).json({
                success: false,
                message: "Hospital Not Found",
            });
        }

        const updates = {};

        if (icuBeds !== undefined) {
            if (!Number.isFinite(Number(icuBeds)) || Number(icuBeds) < 0) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid ICU bed count.",
                });
            }
            updates.icuBeds = Number(icuBeds);
        }

        if (generalBeds !== undefined) {
            if (
                !Number.isFinite(Number(generalBeds)) ||
                Number(generalBeds) < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid general bed count.",
                });
            }
            updates.generalBeds = Number(generalBeds);
        }

        if (ventilators !== undefined) {
            if (
                !Number.isFinite(Number(ventilators)) ||
                Number(ventilators) < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid ventilator count.",
                });
            }
            updates.ventilators = Number(ventilators);
        }

        if (trafficLevel !== undefined) {
            if (!["Low", "Medium", "High"].includes(trafficLevel)) {
                return res.status(400).json({
                    success: false,
                    message: "Traffic level must be Low, Medium or High.",
                });
            }
            updates.trafficLevel = trafficLevel;
        }

        if (status !== undefined) {
            if (!["Active", "Inactive"].includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: "Status must be Active or Inactive.",
                });
            }
            updates.status = status;
        }

        await hospital.update(updates);

        return res.status(200).json({
            success: true,
            message: "Hospital Resources Updated Successfully",
            hospital,
        });
    } catch (error) {
        console.error("Update Hospital Resources Error:", error);

        return res.status(500).json({
            success: false,
            message: "Server Error",
        });
    }
};

module.exports = {
    registerHospital,
    loginHospital,
    updateBeds,
    getAvailableHospitals,
    recommendHospital,
    updateHospitalResources,
};