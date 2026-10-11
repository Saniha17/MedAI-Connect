
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

function HospitalLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        "http://localhost:5000/api/hospital/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || "Login failed.");
        return;
      }

      localStorage.setItem("hospitalToken", data.token);
      localStorage.setItem(
        "hospital",
        JSON.stringify(data.hospital)
      );

      navigate("/hospital-dashboard");
    } catch (error) {
      console.error("Hospital Login Error:", error);
      setError("Unable to connect to server.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "10px",
    marginTop: "8px",
    marginBottom: "18px",
    boxSizing: "border-box",
  };

  return (
    <div
      style={{
        width: "350px",
        maxWidth: "calc(100% - 60px)",
        margin: "70px auto",
        padding: "30px",
        background: "white",
        borderRadius: "12px",
        boxShadow: "0 0 15px rgba(0,0,0,0.1)",
      }}
    >
      <h1 style={{ textAlign: "center" }}>
        🏥 Hospital Login
      </h1>

      <form onSubmit={handleLogin}>
        <label htmlFor="hospital-email">Email</label>
        <input
          id="hospital-email"
          type="email"
          placeholder="Enter hospital email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          required
          style={inputStyle}
        />

        <label htmlFor="hospital-password">Password</label>
        <input
          id="hospital-password"
          type="password"
          placeholder="Enter password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          style={inputStyle}
        />

        {error && (
          <p style={{ color: "red", textAlign: "center" }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px",
            background: "#198754",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: loading ? "wait" : "pointer",
            fontSize: "16px",
          }}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      <p style={{ textAlign: "center", marginTop: "22px" }}>
        New hospital?{" "}
        <Link to="/hospital-register">
          Register here
        </Link>
      </p>

      <p style={{ textAlign: "center" }}>
        <Link to="/">← Back to Home</Link>
      </p>
    </div>
  );
}

export default HospitalLogin;
