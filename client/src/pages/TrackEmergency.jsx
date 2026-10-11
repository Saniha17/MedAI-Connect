
import { useState } from "react";
import { Link } from "react-router-dom";

function TrackEmergency() {
  const [emergencyId, setEmergencyId] = useState("");
  const [emergency, setEmergency] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const trackEmergency = async (e) => {
    if (e) e.preventDefault();

    if (!emergencyId.trim()) {
      setError("Please enter your Emergency ID.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `http://localhost:5000/api/emergency/${encodeURIComponent(
          emergencyId.trim()
        )}`
      );

      const data = await response.json();

      if (!response.ok || !data.emergency) {
        throw new Error(data.message || "Emergency not found.");
      }

      setEmergency(data.emergency);
    } catch (err) {
      setError(err.message || "Unable to track this emergency.");
    } finally {
      setLoading(false);
    }
  };

  const statusColor = {
    Pending: "#b7791f",
    Accepted: "#16803d",
    Rejected: "#c53030",
  };

  // Support hospital history stored as either an array or JSON text.
  const getHospitalHistory = () => {
    const history = emergency?.hospitalHistory;

    if (Array.isArray(history)) return history;

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

  const hospitalHistory = getHospitalHistory();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f3f6fb",
        padding: "40px 20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "700px",
          margin: "0 auto",
          background: "white",
          padding: "30px",
          borderRadius: "14px",
          boxShadow: "0 4px 18px #00000012",
        }}
      >
        <h1 style={{ color: "#1769ff", textAlign: "center" }}>
          🚑 Track Emergency
        </h1>

        <p style={{ color: "#666", textAlign: "center" }}>
          Enter your Emergency ID to check the latest status and hospital
          recommendations.
        </p>

        <form onSubmit={trackEmergency}>
          <label htmlFor="emergencyId">Emergency ID</label>

          <input
            id="emergencyId"
            type="number"
            min="1"
            value={emergencyId}
            onChange={(e) => setEmergencyId(e.target.value)}
            placeholder="Example: 14"
            required
            style={{
              display: "block",
              width: "100%",
              boxSizing: "border-box",
              padding: "13px",
              margin: "10px 0 18px",
              border: "1px solid #ccc",
              borderRadius: "7px",
              fontSize: "16px",
            }}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "13px",
              background: "#2463eb",
              color: "white",
              border: "none",
              borderRadius: "7px",
              cursor: loading ? "wait" : "pointer",
              fontSize: "16px",
            }}
          >
            {loading ? "Checking..." : "Check Status"}
          </button>
        </form>

        {error && (
          <p style={{ color: "#c53030", marginTop: "20px" }}>
            {error}
          </p>
        )}

        {emergency && (
          <div
            style={{
              marginTop: "25px",
              padding: "20px",
              border: "1px solid #ddd",
              borderRadius: "10px",
              background: "#f9fbff",
            }}
          >
            <h2>Emergency Details</h2>

            <p>
              <strong>Emergency ID:</strong> {emergency.id}
            </p>
            <p>
              <strong>Patient:</strong> {emergency.patientName}
            </p>
            <p>
              <strong>Condition:</strong> {emergency.condition}
            </p>
            <p>
              <strong>Severity:</strong> {emergency.severity}
            </p>
            <p>
              <strong>Location:</strong> {emergency.location}
            </p>

            <p>
              <strong>Current Status: </strong>
              <span
                style={{
                  color: statusColor[emergency.status] || "#333",
                  fontWeight: "bold",
                }}
              >
                {emergency.status}
              </span>
            </p>

            {emergency.status === "Pending" && (
              <p>
                ⏳ Waiting for the currently assigned hospital to respond.
              </p>
            )}

            {emergency.status === "Accepted" && (
              <p style={{ color: "#16803d" }}>
                ✅ The hospital has accepted this emergency request.
              </p>
            )}

            {emergency.status === "Rejected" && (
              <p style={{ color: "#c53030" }}>
                No alternative hospital is currently assigned to this request.
              </p>
            )}

            <hr
              style={{
                border: "none",
                borderTop: "1px solid #ddd",
                margin: "25px 0",
              }}
            />

            <h2>🏥 Hospital Recommendation History</h2>

            {hospitalHistory.length > 0 ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "15px",
                }}
              >
                {hospitalHistory.map((hospital, index) => {
                  const rejected =
                    String(hospital.status || "").toLowerCase() ===
                    "rejected";

                  const accepted =
                    String(hospital.status || "").toLowerCase() ===
                    "accepted";

                  return (
                    <div
                      key={`${hospital.hospitalId ?? "hospital"}-${index}`}
                      style={{
                        padding: "16px",
                        borderRadius: "9px",
                        border: `1px solid ${
                          rejected
                            ? "#feb2b2"
                            : accepted
                            ? "#9ae6b4"
                            : "#bee3f8"
                        }`,
                        background: rejected
                          ? "#fff5f5"
                          : accepted
                          ? "#f0fff4"
                          : "#ebf8ff",
                      }}
                    >
                      <h3 style={{ marginTop: 0 }}>
                        {index + 1}. {hospital.hospitalName || "Hospital"}
                      </h3>

                      {hospital.address && (
                        <p>
                          <strong>Address:</strong> {hospital.address}
                        </p>
                      )}

                      <p>
                        <strong>Response: </strong>
                        <span
                          style={{
                            color: rejected
                              ? "#c53030"
                              : accepted
                              ? "#16803d"
                              : "#2b6cb0",
                            fontWeight: "bold",
                          }}
                        >
                          {hospital.status || "Pending"}
                        </span>
                      </p>

                      {rejected && (
                        <p style={{ color: "#c53030", marginBottom: 0 }}>
                          ❌ This hospital rejected the emergency request.
                        </p>
                      )}

                      {accepted && (
                        <p style={{ color: "#16803d", marginBottom: 0 }}>
                          ✅ This hospital accepted the emergency request.
                        </p>
                      )}

                      {!rejected && !accepted && (
                        <p style={{ marginBottom: 0 }}>
                          🕒 Awaiting the hospital's response.
                        </p>
                      )}

                      {hospital.updatedAt && (
                        <small style={{ color: "#666" }}>
                          Updated:{" "}
                          {new Date(hospital.updatedAt).toLocaleString()}
                        </small>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ color: "#666" }}>
                No hospital history is available yet. Refresh the status to
                check for updates.
              </p>
            )}

            <button
              type="button"
              onClick={() => trackEmergency()}
              disabled={loading}
              style={{
                width: "100%",
                marginTop: "22px",
                padding: "12px",
                border: "none",
                borderRadius: "7px",
                background: "#e2e8f0",
                cursor: loading ? "wait" : "pointer",
                fontSize: "15px",
              }}
            >
              {loading ? "Refreshing..." : "🔄 Refresh Status"}
            </button>
          </div>
        )}

        <p style={{ textAlign: "center", marginTop: "25px" }}>
          <Link to="/user-dashboard">← Back to Dashboard</Link>
        </p>
      </div>
    </div>
  );
}

export default TrackEmergency;

