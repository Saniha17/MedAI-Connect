
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const API = "http://localhost:5000/api";

function HospitalDashboard() {
  const [emergencies, setEmergencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const token = localStorage.getItem("hospitalToken");

  let hospital = null;

  try {
    hospital = JSON.parse(
      localStorage.getItem("hospital") || "null"
    );
  } catch {
    hospital = null;
  }

  const fetchEmergencies = async () => {
    if (!token) {
      setLoading(false);
      setError("Please log in as a hospital.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API}/emergency/hospital/emergencies`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(
          data.message || "Failed to load assigned emergencies."
        );
      }

      const list = Array.isArray(data)
        ? data
        : data.emergencies || data.data || [];

      setEmergencies(list);
    } catch (err) {
      setError(
        err.message || "Unable to connect to the server."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmergencies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAction = async (emergencyId, action) => {
    if (!token) {
      setError("Please log in as a hospital first.");
      return;
    }

    setActionLoading(`${action}-${emergencyId}`);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `${API}/emergency/${action}/${emergencyId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(
          data.message ||
            `Unable to ${action} this emergency.`
        );
      }

      if (action === "reject") {
        if (data.reassigned && data.recommendedHospital) {
          setMessage(
            `Emergency #${emergencyId} was reassigned to ${data.recommendedHospital.hospitalName}.`
          );
        } else {
          setMessage(
            data.message ||
              `Emergency #${emergencyId} was rejected. No replacement hospital was assigned.`
          );
        }
      } else if (action === "accept") {
        setMessage(
          `Emergency #${emergencyId} accepted. Hospital resources have been reserved.`
        );
      } else if (action === "complete") {
        setMessage(
          `Emergency #${emergencyId} completed. Hospital resources have been restored.`
        );
      }

      await fetchEmergencies();
    } catch (err) {
      setError(
        err.message || "Unable to update the emergency."
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("hospitalToken");
    localStorage.removeItem("hospital");
    navigate("/hospital-login");
  };

  if (!token) {
    return (
      <div style={styles.container}>
        <h2>Hospital Login Required</h2>
        <p>Please log in to access the hospital dashboard.</p>
        <Link to="/hospital-login">Go to Hospital Login</Link>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1>🏥 Hospital Dashboard</h1>
          <h3>
            Welcome, {hospital?.hospitalName || "Hospital"}
          </h3>
          <p>
            Only emergencies currently assigned to your hospital
            appear here.
          </p>
        </div>

        <button
          style={styles.refreshButton}
          onClick={fetchEmergencies}
          disabled={loading || actionLoading !== null}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {message && <p style={styles.success}>{message}</p>}
      {error && <p style={styles.error}>{error}</p>}

      {loading ? (
        <p>Loading assigned emergencies...</p>
      ) : emergencies.length === 0 ? (
        <div style={styles.empty}>
          <h3>No Assigned Emergencies</h3>
          <p>
            No emergencies are currently assigned to this hospital.
            A rejected emergency may now be assigned to another
            hospital.
          </p>
        </div>
      ) : (
        <div style={styles.grid}>
          {emergencies.map((emergency) => (
            <div key={emergency.id} style={styles.card}>
              <h2>Emergency #{emergency.id}</h2>

              <p>
                <strong>Patient Name:</strong>{" "}
                {emergency.patientName || "Not provided"}
              </p>

              <p>
                <strong>Age:</strong>{" "}
                {emergency.age ?? "Not provided"}
              </p>

              <p>
                <strong>Condition:</strong>{" "}
                {emergency.condition || "Not provided"}
              </p>

              <p>
                <strong>Severity:</strong>{" "}
                {emergency.severity || "Not specified"}
              </p>

              <p>
                <strong>Location:</strong>{" "}
                {emergency.location || "Not provided"}
              </p>

              <p>
                <strong>Needs ICU:</strong>{" "}
                {emergency.needsICU === true ||
                emergency.needsICU === 1 ||
                emergency.needsICU === "1"
                  ? "Yes"
                  : "No"}
              </p>

              <p>
                <strong>Needs Ventilator:</strong>{" "}
                {emergency.needsVentilator === true ||
                emergency.needsVentilator === 1 ||
                emergency.needsVentilator === "1"
                  ? "Yes"
                  : "No"}
              </p>

              <p>
                <strong>Status:</strong>{" "}
                <span
                  style={{
                    color:
                      emergency.status === "Accepted"
                        ? "#15803d"
                        : emergency.status === "Completed"
                        ? "#2563eb"
                        : emergency.status === "Rejected"
                        ? "#dc2626"
                        : "#b7791f",
                    fontWeight: "bold",
                  }}
                >
                  {emergency.status || "Pending"}
                </span>
              </p>

              {emergency.status === "Pending" && (
                <div style={styles.actions}>
                  <button
                    style={styles.acceptButton}
                    disabled={actionLoading !== null}
                    onClick={() =>
                      handleAction(emergency.id, "accept")
                    }
                  >
                    {actionLoading === `accept-${emergency.id}`
                      ? "Accepting..."
                      : "Accept"}
                  </button>

                  <button
                    style={styles.rejectButton}
                    disabled={actionLoading !== null}
                    onClick={() =>
                      handleAction(emergency.id, "reject")
                    }
                  >
                    {actionLoading === `reject-${emergency.id}`
                      ? "Finding another hospital..."
                      : "Reject & Find Another Hospital"}
                  </button>
                </div>
              )}

              {emergency.status === "Accepted" && (
                <div style={styles.actions}>
                  <button
                    style={styles.completeButton}
                    disabled={actionLoading !== null}
                    onClick={() => {
                      const confirmed = window.confirm(
                        `Mark emergency #${emergency.id} as completed and restore its reserved hospital resources?`
                      );

                      if (confirmed) {
                        handleAction(emergency.id, "complete");
                      }
                    }}
                  >
                    {actionLoading === `complete-${emergency.id}`
                      ? "Completing..."
                      : "Complete Emergency"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        style={styles.logoutButton}
        onClick={handleLogout}
      >
        Logout
      </button>

      <p style={styles.backLink}>
        <Link to="/">← Back to Home</Link>
      </p>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "1100px",
    margin: "30px auto",
    padding: "20px",
    fontFamily: "Arial, sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "15px",
    marginBottom: "25px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "20px",
  },
  card: {
    border: "1px solid #ddd",
    borderRadius: "12px",
    padding: "20px",
    backgroundColor: "#fff",
    boxShadow: "0 3px 10px rgba(0, 0, 0, 0.08)",
  },
  empty: {
    padding: "25px",
    border: "1px solid #ddd",
    borderRadius: "12px",
    textAlign: "center",
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    marginTop: "18px",
  },
  refreshButton: {
    padding: "10px 16px",
    backgroundColor: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
  acceptButton: {
    padding: "10px 16px",
    backgroundColor: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
  rejectButton: {
    padding: "10px 16px",
    backgroundColor: "#dc2626",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
  completeButton: {
    padding: "10px 16px",
    backgroundColor: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
  logoutButton: {
    marginTop: "25px",
    padding: "10px 18px",
    backgroundColor: "#374151",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
  success: {
    padding: "12px",
    backgroundColor: "#dcfce7",
    color: "#166534",
    borderRadius: "6px",
  },
  error: {
    padding: "12px",
    backgroundColor: "#fee2e2",
    color: "#991b1b",
    borderRadius: "6px",
  },
  backLink: {
    marginTop: "20px",
  },
};

export default HospitalDashboard;
