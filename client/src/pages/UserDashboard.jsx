
import { Link } from "react-router-dom";

function UserDashboard() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f3f6fb",
        padding: "40px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1 style={{ color: "#1769ff", fontSize: "48px" }}>
        🚑 MedAI Connect
      </h1>

      <h2>Welcome, {user.name || "User"}!</h2>
      <p style={{ color: "#777" }}>Your login was successful.</p>

      <div
        style={{
          maxWidth: "600px",
          background: "white",
          padding: "28px",
          marginTop: "40px",
          borderRadius: "14px",
          boxShadow: "0 4px 18px #00000012",
        }}
      >
        <h2>Emergency Services</h2>
        <p>Find the best hospital for an emergency patient.</p>

        <Link to="/emergency-request" style={buttonStyle("#dc3545")}>
          🚨 Request Emergency Assistance
        </Link>

        <div style={{ height: "18px" }} />

        <Link to="/track-emergency" style={buttonStyle("#2463eb")}>
          📋 Track Emergency Status
        </Link>
      </div>

      <p style={{ marginTop: "35px" }}>
        <Link to="/">← Back to Home</Link>
      </p>
    </div>
  );
}

function buttonStyle(background) {
  return {
    display: "inline-block",
    padding: "14px 20px",
    background,
    color: "white",
    textDecoration: "none",
    borderRadius: "8px",
    marginTop: "15px",
  };
}

export default UserDashboard;
