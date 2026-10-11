const Emergency = require("../models/emergencyModel");
const Hospital = require("../models/hospitalModel");

const getHospitalHistory = (emergency) => {
  let history = emergency.hospitalHistory;

  if (!history) return [];

  if (typeof history === "string") {
    try {
      history = JSON.parse(history);
    } catch {
      return [];
    }
  }

  return Array.isArray(history) ? history : [];
};

const isTrue = (value) =>
  value === true || value === 1 || value === "1" || value === "true";

const geocodeAddress = async (address) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&q=${encodeURIComponent(address)}`,
      {
        headers: {
          "User-Agent": "MedAI-Connect/1.0",
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) return null;

    const data = await response.json();

    if (!data.length) return null;

    return {
      latitude: Number(data[0].lat),
      longitude: Number(data[0].lon),
    };
  } catch (error) {
    console.error("Geocoding error:", error.message);
    return null;
  }
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const earthRadius = 6371;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;

  return (
    earthRadius *
    2 *
    Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  );
};

const isSuitableHospital = (hospital, emergency) => {
  if (hospital.status !== "Active") return false;

  if (
    hospital.latitude == null ||
    hospital.longitude == null
  ) {
    return false;
  }

  const icuBeds = Number(hospital.icuBeds || 0);
  const generalBeds = Number(hospital.generalBeds || 0);
  const ventilators = Number(hospital.ventilators || 0);

  if (isTrue(emergency.needsICU) && icuBeds < 1) {
    return false;
  }

  if (!isTrue(emergency.needsICU) && generalBeds < 1) {
    return false;
  }

  if (
    isTrue(emergency.needsVentilator) &&
    ventilators < 1
  ) {
    return false;
  }

  return true;
};

const findRecommendedHospital = async (
  emergency,
  excludedHospitalIds = []
) => {
  const patientLocation = await geocodeAddress(
    emergency.location
  );

  if (!patientLocation) {
    return null;
  }

  const hospitals = await Hospital.findAll({
    where: { status: "Active" },
  });

  const excludedIds = excludedHospitalIds.map(String);

  const candidates = hospitals
    .filter(
      (hospital) =>
        !excludedIds.includes(String(hospital.id)) &&
        isSuitableHospital(hospital, emergency)
    )
    .map((hospital) => ({
      hospital,
      distance: calculateDistance(
        patientLocation.latitude,
        patientLocation.longitude,
        Number(hospital.latitude),
        Number(hospital.longitude)
      ),
    }))
    .sort((a, b) => {
      // Prefer the nearer hospital. Use traffic as a tie-breaker.
      if (Math.abs(a.distance - b.distance) <= 0.5) {
        const trafficOrder = {
          Low: 1,
          Medium: 2,
          High: 3,
        };

        return (
          (trafficOrder[a.hospital.trafficLevel] || 2) -
          (trafficOrder[b.hospital.trafficLevel] || 2)
        );
      }

      return a.distance - b.distance;
    });

  if (!candidates.length) return null;

  return {
    ...candidates[0].hospital.toJSON(),
    distance: Number(candidates[0].distance.toFixed(2)),
  };
};

// CREATE EMERGENCY
const createEmergency = async (req, res) => {
  try {
    const {
      patientName,
      age,
      condition,
      severity,
      needsICU = false,
      needsVentilator = false,
      location,
    } = req.body;

    if (
      !patientName ||
      age == null ||
      !condition ||
      !severity ||
      !location
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required emergency details",
      });
    }

    const emergency = await Emergency.create({
      patientName,
      age,
      condition,
      severity,
      needsICU,
      needsVentilator,
      location,
      hospitalId: null,
      status: "Pending",
      hospitalHistory: [],
    });

    const recommendedHospital =
      await findRecommendedHospital(emergency);

    if (!recommendedHospital) {
      return res.status(201).json({
        success: true,
        message:
          "Emergency created, but no suitable hospital with available resources was found.",
        emergency,
        recommendedHospital: null,
      });
    }

    emergency.hospitalId = recommendedHospital.id;
    emergency.hospitalHistory = [
      {
        hospitalId: recommendedHospital.id,
        hospitalName: recommendedHospital.hospitalName,
        address: recommendedHospital.address,
        status: "Pending",
        updatedAt: new Date(),
      },
    ];

    await emergency.save();

    return res.status(201).json({
      success: true,
      message: "Emergency created and hospital recommended successfully",
      emergency,
      recommendedHospital,
    });
  } catch (error) {
    console.error("Create emergency error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create emergency",
    });
  }
};

// ACCEPT EMERGENCY AND RESERVE RESOURCES
const acceptEmergency = async (req, res) => {
  let transaction;

  try {
    transaction = await Emergency.sequelize.transaction();

    const emergency = await Emergency.findByPk(req.params.id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!emergency) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Emergency not found",
      });
    }

    if (
      String(emergency.hospitalId) !== String(req.user.id)
    ) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: "This emergency is not assigned to your hospital",
      });
    }

    if (emergency.status !== "Pending") {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "This emergency is no longer pending",
      });
    }

    const hospital = await Hospital.findByPk(
      emergency.hospitalId,
      {
        transaction,
        lock: transaction.LOCK.UPDATE,
      }
    );

    if (!hospital || hospital.status !== "Active") {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Hospital is not active",
      });
    }

    const needsICU = isTrue(emergency.needsICU);
    const needsVentilator = isTrue(
      emergency.needsVentilator
    );

    const icuBeds = Number(hospital.icuBeds || 0);
    const generalBeds = Number(hospital.generalBeds || 0);
    const ventilators = Number(hospital.ventilators || 0);

    if (needsICU && icuBeds < 1) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        message: "No ICU beds are currently available",
      });
    }

    if (!needsICU && generalBeds < 1) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        message: "No general beds are currently available",
      });
    }

    if (needsVentilator && ventilators < 1) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        message: "No ventilators are currently available",
      });
    }

    const updates = {};

    if (needsICU) {
      updates.icuBeds = icuBeds - 1;
    } else {
      updates.generalBeds = generalBeds - 1;
    }

    if (needsVentilator) {
      updates.ventilators = ventilators - 1;
    }

    await hospital.update(updates, { transaction });

    const history = getHospitalHistory(emergency);
    const latest = history[history.length - 1];

    if (
      latest &&
      String(latest.hospitalId) === String(hospital.id)
    ) {
      latest.status = "Accepted";
      latest.updatedAt = new Date();
    } else {
      history.push({
        hospitalId: hospital.id,
        hospitalName: hospital.hospitalName,
        address: hospital.address,
        status: "Accepted",
        updatedAt: new Date(),
      });
    }

    emergency.hospitalHistory = history;
    emergency.status = "Accepted";

    await emergency.save({ transaction });
    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: "Emergency accepted and resources reserved successfully",
      emergency,
      updatedResources: {
        icuBeds: hospital.icuBeds,
        generalBeds: hospital.generalBeds,
        ventilators: hospital.ventilators,
      },
    });
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }

    console.error("Accept emergency error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to accept emergency",
    });
  }
};

// REJECT EMERGENCY AND FIND AN ALTERNATIVE
const rejectEmergency = async (req, res) => {
  let transaction;

  try {
    transaction = await Emergency.sequelize.transaction();

    const emergency = await Emergency.findByPk(req.params.id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!emergency) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Emergency not found",
      });
    }

    if (
      String(emergency.hospitalId) !== String(req.user.id)
    ) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: "This emergency is not assigned to your hospital",
      });
    }

    if (emergency.status !== "Pending") {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Only pending emergencies can be rejected",
      });
    }

    const rejectedHospitalId = emergency.hospitalId;
    const hospital = await Hospital.findByPk(
      rejectedHospitalId,
      { transaction }
    );

    const history = getHospitalHistory(emergency);
    const latest = history[history.length - 1];

    if (
      latest &&
      String(latest.hospitalId) === String(rejectedHospitalId)
    ) {
      latest.status = "Rejected";
      latest.updatedAt = new Date();
    } else if (hospital) {
      history.push({
        hospitalId: hospital.id,
        hospitalName: hospital.hospitalName,
        address: hospital.address,
        status: "Rejected",
        updatedAt: new Date(),
      });
    }

    emergency.hospitalHistory = history;
    emergency.hospitalId = null;
    emergency.status = "Pending";

    await emergency.save({ transaction });
    await transaction.commit();

    // Recommend a different suitable hospital.
    const rejectedIds = history
      .filter((entry) => entry.status === "Rejected")
      .map((entry) => entry.hospitalId);

    const recommendedHospital =
      await findRecommendedHospital(emergency, rejectedIds);

    if (!recommendedHospital) {
      return res.status(200).json({
        success: true,
        reassigned: false,
        message:
          "Emergency rejected. No alternative suitable hospital is currently available.",
        emergency,
        recommendedHospital: null,
      });
    }

    emergency.hospitalId = recommendedHospital.id;
    emergency.status = "Pending";

    const updatedHistory = getHospitalHistory(emergency);

    updatedHistory.push({
      hospitalId: recommendedHospital.id,
      hospitalName: recommendedHospital.hospitalName,
      address: recommendedHospital.address,
      status: "Pending",
      updatedAt: new Date(),
    });

    emergency.hospitalHistory = updatedHistory;
    await emergency.save();

    return res.status(200).json({
      success: true,
      reassigned: true,
      message: "Emergency reassigned to another suitable hospital",
      emergency,
      recommendedHospital,
    });
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }

    console.error("Reject emergency error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to reject emergency",
    });
  }
};

// COMPLETE EMERGENCY AND RESTORE RESERVED RESOURCES
const completeEmergency = async (req, res) => {
  let transaction;

  try {
    transaction = await Emergency.sequelize.transaction();

    const emergency = await Emergency.findByPk(req.params.id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!emergency) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Emergency not found",
      });
    }

    if (
      String(emergency.hospitalId) !== String(req.user.id)
    ) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: "This emergency is not assigned to your hospital",
      });
    }

    if (emergency.status !== "Accepted") {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Only accepted emergencies can be completed",
      });
    }

    const hospital = await Hospital.findByPk(
      emergency.hospitalId,
      {
        transaction,
        lock: transaction.LOCK.UPDATE,
      }
    );

    if (!hospital) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Hospital not found",
      });
    }

    const needsICU = isTrue(emergency.needsICU);
    const needsVentilator = isTrue(
      emergency.needsVentilator
    );

    const updates = {};

    if (needsICU) {
      updates.icuBeds = Number(hospital.icuBeds || 0) + 1;
    } else {
      updates.generalBeds =
        Number(hospital.generalBeds || 0) + 1;
    }

    if (needsVentilator) {
      updates.ventilators =
        Number(hospital.ventilators || 0) + 1;
    }

    await hospital.update(updates, { transaction });

    const history = getHospitalHistory(emergency);
    const latest = history[history.length - 1];

    if (
      latest &&
      String(latest.hospitalId) === String(hospital.id)
    ) {
      latest.status = "Completed";
      latest.updatedAt = new Date();
    }

    emergency.hospitalHistory = history;
    emergency.status = "Completed";

    await emergency.save({ transaction });
    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: "Emergency completed and resources restored successfully",
      emergency,
      updatedResources: {
        icuBeds: hospital.icuBeds,
        generalBeds: hospital.generalBeds,
        ventilators: hospital.ventilators,
      },
    });
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }

    console.error("Complete emergency error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to complete emergency",
    });
  }
};

// GET ALL EMERGENCIES
const getAllEmergencies = async (req, res) => {
  try {
    const emergencies = await Emergency.findAll({
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      emergencies,
    });
  } catch (error) {
    console.error("Get emergencies error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch emergencies",
    });
  }
};

// GET ONE EMERGENCY BY ID
const getEmergencyById = async (req, res) => {
  try {
    const emergency = await Emergency.findByPk(req.params.id);

    if (!emergency) {
      return res.status(404).json({
        success: false,
        message: "Emergency not found",
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
      message: "Failed to fetch emergency",
    });
  }
};

// GET EMERGENCIES ASSIGNED TO THE LOGGED-IN HOSPITAL
const getAssignedEmergencies = async (req, res) => {
  try {
    const emergencies = await Emergency.findAll({
      where: { hospitalId: req.user.id },
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      emergencies,
    });
  } catch (error) {
    console.error("Get assigned emergencies error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch assigned emergencies",
    });
  }
};

module.exports = {
  createEmergency,
  acceptEmergency,
  rejectEmergency,
  completeEmergency,
  getAllEmergencies,
  getEmergencyById,
  getAssignedEmergencies,
};

