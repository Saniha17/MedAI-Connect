import { useState } from "react";
import { Link } from "react-router-dom";

const API = "http://localhost:5000/api";

function EmergencyRequest() {
  const [patientName, setPatientName] = useState("");
  const [age, setAge] = useState("");
  const [condition, setCondition] = useState("");
  const [severity, setSeverity] = useState("");
  const [needsICU, setNeedsICU] = useState(false);
  const [needsVentilator, setNeedsVentilator] = useState(false);
  const [location, setLocation] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(`${API}/emergency/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patientName,
          age: Number(age),
          condition,
          severity,
          needsICU,
          needsVentilator,
          location,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to submit emergency request."
        );
      }

      setResult(data);

      if (!data.assigned || !data.recommendedHospital) {
        setError(
          "Your emergency was recorded, but no suitable hospital was assigned."
        );
      }
    } catch (err) {
      setError(err.message || "Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  const hospital = result?.recommendedHospital;

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.title}>🚨 Emergency Request</h1>

        <p style={styles.subtitle}>
          Enter the patient's emergency details
        </p>

        {error && <div style={styles.error}>{error}</div>}

        {result && (
          <div style={styles.result}>
            {hospital ? (
              <>
                <h2>🏥 Recommended Hospital</h2>
                <h3>{hospital.hospitalName}</h3>

                <p>
                  <strong>Address:</strong>{" "}
                  {hospital.address || "Not available"}
                </p>

                <p>
                  <strong>Phone:</strong>{" "}
                  {hospital.phone || "Not available"}
                </p>

                <p>
                  <strong>Emergency ID:</strong>{" "}
                  {result.emergency?.id ?? "Created"}
                </p>

                <p>
                  <strong>Status:</strong>{" "}
                  {result.emergency?.status || "Pending"}
                </p>

                <p>
                  <strong>Assignment:</strong>{" "}
                  {result.assigned
                    ? "Assigned successfully"
                    : "Not assigned"}
                </p>

                <div style={styles.notice}>
                  Your request has been assigned to this hospital.
                  The hospital must accept it before acceptance is
                  confirmed. Keep this emergency ID for reference.
                </div>
              </>
            ) : (
              <h3>
                Emergency recorded, but no suitable hospital
                has been assigned yet.
              </h3>
            )}
          </div>
        )}

        {!result && (
          <form onSubmit={handleSubmit}>
            <label style={styles.label}>Patient Name</label>
            <input
              style={styles.input}
              type="text"
              placeholder="Enter patient name"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              required
            />

            <label style={styles.label}>Patient Age</label>
            <input
              style={styles.input}
              type="number"
              min="0"
              max="120"
              placeholder="Enter age"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              required
            />

            <label style={styles.label}>Medical Condition</label>
            <input
              style={styles.input}
              type="text"
              placeholder="Example: Accident, Heart Attack"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              required
            />

            <label style={styles.label}>Severity</label>
            <select
              style={styles.input}
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              required
            >
              <option value="">Select severity</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>

            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={needsICU}
                onChange={(e) => setNeedsICU(e.target.checked)}
              />
              Needs ICU
            </label>

            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={needsVentilator}
                onChange={(e) =>
                  setNeedsVentilator(e.target.checked)
                }
              />
              Needs Ventilator
            </label>

            <label style={styles.label}>Patient Location</label>
            <input
              style={styles.input}
              type="text"
              placeholder="Enter current location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            />

            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.submitButton,
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading
                ? "Submitting..."
                : "🚨 Submit Emergency Request"}
            </button>
          </form>
        )}

        {result && (
          <button
            style={styles.secondaryButton}
            onClick={() => {
              setResult(null);
              setError("");
            }}
          >
            Submit Another Request
          </button>
        )}

        <div style={styles.links}>
          <Link to="/user-dashboard">
            ← Back to Dashboard
          </Link>
          <br />
          <Link to="/">Back to Home</Link>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "40px 20px",
    background: "#f5f7fa",
  },
  container: {
    maxWidth: "600px",
    margin: "auto",
    background: "white",
    padding: "30px",
    borderRadius: "12px",
    boxShadow: "0 0 15px rgba(0,0,0,0.1)",
  },
  title: {
    textAlign: "center",
    color: "#dc3545",
  },
  subtitle: {
    textAlign: "center",
    marginBottom: "25px",
  },
  label: {
    display: "block",
    fontWeight: "bold",
    marginTop: "15px",
    marginBottom: "8px",
  },
  input: {
    width: "100%",
    padding: "11px",
    marginBottom: "12px",
    boxSizing: "border-box",
    border: "1px solid #ccc",
    borderRadius: "6px",
    fontSize: "15px",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginTop: "14px",
  },
  submitButton: {
    width: "100%",
    padding: "13px",
    marginTop: "25px",
    background: "#dc3545",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "16px",
  },
  result: {
    marginTop: "25px",
    marginBottom: "20px",
    padding: "20px",
    border: "1px solid #86efac",
    background: "#f0fdf4",
    borderRadius: "10px",
    overflowWrap: "anywhere",
  },
  notice: {
    marginTop: "15px",
    padding: "12px",
    background: "#fff7ed",
    borderRadius: "6px",
    lineHeight: "1.6",
  },
  error: {
    padding: "12px",
    marginBottom: "15px",
    color: "#991b1b",
    background: "#fee2e2",
    borderRadius: "6px",
  },
  secondaryButton: {
    width: "100%",
    padding: "12px",
    marginTop: "15px",
    background: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },
  links: {
    textAlign: "center",
    marginTop: "25px",
    lineHeight: "2",
  },
};

export default EmergencyRequest;