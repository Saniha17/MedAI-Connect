
const Emergency = require("../models/emergencyModel");
const Hospital = require("../models/hospitalModel");

// Parse hospital history safely.
const getHospitalHistory = (emergency) => {
    const history = emergency.hospitalHistory;

    if (Array.isArray(history)) {
        return [...history];
    }

    if (typeof history === "string") {
        try {
            const parsed = JSON.parse(history);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    return [];
};

// Convert an address into coordinates using OpenStreetMap.
const geocodeAddress = async (address) => {
    const url = new URL("https://nominatim.openstreetmap.org/search");

    url.searchParams.set("q", address);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");
    url.searchParams.set("countrycodes", "in");

    const response = await fetch(url, {
        headers: {
            "User-Agent": "MedAIConnect/1.0 (student project)",
        },
        signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
        throw new Error(`Geocoding failed: ${response.status}`);
    }

    const results = await response.json();

    if (!results.length) {
        return null;
    }

    return {
        latitude: Number(results[0].lat),
        longitude: Number(results[0].lon),
    };
};

// Calculate straight-line distance in kilometres.
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const toRadians = (degrees) => (degrees * Math.PI) / 180;
    const earthRadiusKm = 6371;

    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRadians(lat1)) *
            Math.cos(toRadians(lat2)) *
            Math.sin(dLon / 2) ** 2;

    return (
        earthRadiusKm *
        2 *
        Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    );
};

// Check hospital resources and coordinates.
const isSuitableHospital = (hospital, emergency) => {
    if (hospital.status !== "Active") {
        return false;
    }

    const icuBeds = Number(hospital.icuBeds) || 0;
    const generalBeds = Number(hospital.generalBeds) || 0;
    const ventilators = Number(hospital.ventilators) || 0;

    if (emergency.needsICU && icuBeds < 1) {
        return false;
    }

    if (emergency.needsVentilator && ventilators < 1) {
        return false;
    }

    if (!emergency.needsICU && generalBeds < 1) {
        return false;
    }

    if (hospital.latitude == null || hospital.longitude == null) {
        return false;
    }

    const latitude = Number(hospital.latitude);
    const longitude = Number(hospital.longitude);

    if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
    ) {
        return false;
    }

    return true;
};

// Find the nearest suitable hospital, excluding hospitals already tried.
const findRecommendedHospital = async (
    emergency,
    excludedHospitalIds = []
) => {
    const patientCoordinates = await geocodeAddress(emergency.location);

    if (!patientCoordinates) {
        return {
            hospital: null,
            distanceKm: null,
            reason: "LOCATION_NOT_FOUND",
        };
    }

    const hospitals = await Hospital.findAll({
        where: { status: "Active" },
    });

    const excludedIds = excludedHospitalIds.map(String);

    const candidates = hospitals
        .filter((hospital) => {
            if (excludedIds.includes(String(hospital.id))) {
                return false;
            }

            return isSuitableHospital(hospital, emergency);
        })
        .map((hospital) => ({
            hospital,
            distanceKm: calculateDistance(
                patientCoordinates.latitude,
                patientCoordinates.longitude,
                Number(hospital.latitude),
                Number(hospital.longitude)
            ),
        }));

    if (candidates.length === 0) {
        return {
            hospital: null,
            distanceKm: null,
            reason: "NO_SUITABLE_HOSPITAL",
        };
    }

    const trafficRank = {
        Low: 1,
        Medium: 2,
        High: 3,
    };

    candidates.sort((a, b) => {
        const difference = a.distanceKm - b.distanceKm;

        if (Math.abs(difference) > 0.5) {
            return difference;
        }

        const trafficDifference =
            (trafficRank[a.hospital.trafficLevel] || 99) -
            (trafficRank[b.hospital.trafficLevel] || 99);

        return trafficDifference || difference;
    });

    return {
        hospital: candidates[0].hospital,
        distanceKm: Number(candidates[0].distanceKm.toFixed(2)),
        reason: null,
    };
};

// Format hospital details for the API response.
const formatHospital = (hospital, distanceKm = null) => ({
    id: hospital.id,
    hospitalName: hospital.hospitalName,
    address: hospital.address,
    phone: hospital.phone,
    icuBeds: hospital.icuBeds,
    generalBeds: hospital.generalBeds,
    ventilators: hospital.ventilators,
    trafficLevel: hospital.trafficLevel,
    distanceKm,
});

// Create an emergency and assign the nearest suitable hospital.
const createEmergency = async (req, res) => {
    try {
        const {
            patientName,
            age,
            condition,
            severity,
            needsICU,
            needsVentilator,
            location,
        } = req.body;

        if (
            !patientName ||
            age === undefined ||
            age === null ||
            !condition ||
            !severity ||
            !location
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Please provide patientName, age, condition, severity, and location.",
            });
        }

        const emergency = await Emergency.create({
            patientName,
            age,
            condition,
            severity,
            needsICU: needsICU === true || needsICU === "true",
            needsVentilator:
                needsVentilator === true ||
                needsVentilator === "true",
            location,
            hospitalId: null,
            status: "Pending",
            hospitalHistory: [],
        });

        let recommendation;

        try {
            recommendation = await findRecommendedHospital(emergency);
        } catch (error) {
            console.error("Initial recommendation error:", error.message);

            return res.status(201).json({
                success: true,
                assigned: false,
                message:
                    "Emergency recorded, but hospital recommendation failed. Please check the location and try again.",
                emergency,
            });
        }

        if (!recommendation.hospital) {
            return res.status(201).json({
                success: true,
                assigned: false,
                message:
                    recommendation.reason === "LOCATION_NOT_FOUND"
                        ? "Emergency recorded, but the location could not be found."
                        : "No suitable active hospital with valid coordinates was found.",
                emergency,
            });
        }

        const hospital = recommendation.hospital;

        emergency.hospitalId = hospital.id;
        emergency.status = "Pending";
        emergency.hospitalHistory = [
            {
                hospitalId: hospital.id,
                hospitalName: hospital.hospitalName,
                address: hospital.address || "",
                status: "Pending",
                updatedAt: new Date().toISOString(),
            },
        ];

        await emergency.save();

        return res.status(201).json({
            success: true,
            assigned: true,
            message: "Nearest suitable hospital assigned successfully.",
            emergency,
            recommendedHospital: formatHospital(
                hospital,
                recommendation.distanceKm
            ),
        });
    } catch (error) {
        console.error("Create emergency error:", error);

        return res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message,
        });
    }
};

// Accept an emergency assigned to the logged-in hospital.
const acceptEmergency = async (req, res) => {
    try {
        const emergency = await Emergency.findByPk(req.params.id);

        if (!emergency) {
            return res.status(404).json({
                success: false,
                message: "Emergency Request Not Found",
            });
        }

        if (String(emergency.hospitalId) !== String(req.user.id)) {
            return res.status(403).json({
                success: false,
                message: "This emergency is not assigned to your hospital.",
            });
        }

        if (emergency.status !== "Pending") {
            return res.status(400).json({
                success: false,
                message: `Emergency is already ${emergency.status}.`,
            });
        }

        const history = getHospitalHistory(emergency);

        const currentEntry = [...history]
            .reverse()
            .find(
                (entry) =>
                    String(entry.hospitalId) ===
                    String(emergency.hospitalId)
            );

        if (currentEntry) {
            currentEntry.status = "Accepted";
            currentEntry.updatedAt = new Date().toISOString();
        } else {
            const hospital = await Hospital.findByPk(emergency.hospitalId);

            history.push({
                hospitalId: emergency.hospitalId,
                hospitalName: hospital?.hospitalName || "Hospital",
                address: hospital?.address || "",
                status: "Accepted",
                updatedAt: new Date().toISOString(),
            });
        }

        emergency.hospitalHistory = history;
        emergency.status = "Accepted";

        await emergency.save();

        return res.status(200).json({
            success: true,
            message: "Emergency Accepted Successfully",
            emergency,
        });
    } catch (error) {
        console.error("Accept emergency error:", error);

        return res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message,
        });
    }
};

// Reject an emergency and reassign it to another suitable hospital.
const rejectEmergency = async (req, res) => {
    try {
        const emergency = await Emergency.findByPk(req.params.id);

        if (!emergency) {
            return res.status(404).json({
                success: false,
                message: "Emergency Request Not Found",
            });
        }

        if (String(emergency.hospitalId) !== String(req.user.id)) {
            return res.status(403).json({
                success: false,
                message: "This emergency is not assigned to your hospital.",
            });
        }

        if (emergency.status !== "Pending") {
            return res.status(400).json({
                success: false,
                message: `Emergency is already ${emergency.status}.`,
            });
        }

        const rejectedHospitalId = emergency.hospitalId;
        const history = getHospitalHistory(emergency);

        // Mark the rejecting hospital in the history.
        const currentEntry = [...history]
            .reverse()
            .find(
                (entry) =>
                    String(entry.hospitalId) ===
                    String(rejectedHospitalId)
            );

        if (currentEntry) {
            currentEntry.status = "Rejected";
            currentEntry.updatedAt = new Date().toISOString();
        } else {
            const rejectedHospital = await Hospital.findByPk(
                rejectedHospitalId
            );

            history.push({
                hospitalId: rejectedHospitalId,
                hospitalName:
                    rejectedHospital?.hospitalName || "Hospital",
                address: rejectedHospital?.address || "",
                status: "Rejected",
                updatedAt: new Date().toISOString(),
            });
        }

        // Persist the rejection before searching for another hospital.
        emergency.hospitalHistory = history;
        emergency.hospitalId = null;
        emergency.status = "Pending";

        await emergency.save();

        // Never recommend a hospital that has already rejected this request.
        const excludedHospitalIds = history
            .filter(
                (entry) =>
                    String(entry.status).toLowerCase() === "rejected"
            )
            .map((entry) => entry.hospitalId);

        let recommendation;

        try {
            recommendation = await findRecommendedHospital(
                emergency,
                excludedHospitalIds
            );
        } catch (error) {
            console.error("Reassignment lookup error:", error.message);

            return res.status(503).json({
                success: false,
                reassigned: false,
                message:
                    "The rejection was saved, but finding another hospital failed. Please retry.",
                emergency,
            });
        }

        if (!recommendation.hospital) {
            return res.status(200).json({
                success: true,
                reassigned: false,
                message:
                    recommendation.reason === "LOCATION_NOT_FOUND"
                        ? "The rejection was saved, but the patient location could not be found."
                        : "The rejection was saved, but no other suitable hospital is available.",
                emergency,
                reason: recommendation.reason,
            });
        }

        const nextHospital = recommendation.hospital;

        emergency.hospitalId = nextHospital.id;
        emergency.status = "Pending";

        history.push({
            hospitalId: nextHospital.id,
            hospitalName: nextHospital.hospitalName,
            address: nextHospital.address || "",
            status: "Pending",
            updatedAt: new Date().toISOString(),
        });

        emergency.hospitalHistory = history;

        await emergency.save();

        return res.status(200).json({
            success: true,
            reassigned: true,
            message: `Emergency reassigned to ${nextHospital.hospitalName}.`,
            emergency,
            recommendedHospital: formatHospital(
                nextHospital,
                recommendation.distanceKm
            ),
        });
    } catch (error) {
        console.error("Reject emergency error:", error);

        return res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message,
        });
    }
};

// Get all emergencies.
const getAllEmergencies = async (req, res) => {
    try {
        const emergencies = await Emergency.findAll({
            order: [["id", "DESC"]],
        });

        return res.status(200).json({
            success: true,
            emergencies,
        });
    } catch (error) {
        console.error("Get emergencies error:", error);

        return res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message,
        });
    }
};

// Get emergency by ID for the tracking page.
const getEmergencyById = async (req, res) => {
    try {
        const emergency = await Emergency.findByPk(req.params.id);

        if (!emergency) {
            return res.status(404).json({
                success: false,
                message: "Emergency Request Not Found",
            });
        }

        return res.status(200).json({
            success: true,
            emergency,
        });
    } catch (error) {
        console.error("Get emergency error:", error);

        return res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message,
        });
    }
};

// Get emergencies assigned to the logged-in hospital.
const getAssignedEmergencies = async (req, res) => {
    try {
        const emergencies = await Emergency.findAll({
            where: { hospitalId: req.user.id },
            order: [["id", "DESC"]],
        });

        return res.status(200).json({
            success: true,
            count: emergencies.length,
            emergencies,
        });
    } catch (error) {
        console.error("Get assigned emergencies error:", error);

        return res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message,
        });
    }
};

module.exports = {
    createEmergency,
    acceptEmergency,
    rejectEmergency,
    getAllEmergencies,
    getEmergencyById,
    getAssignedEmergencies,
};
