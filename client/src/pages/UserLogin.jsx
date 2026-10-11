import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function UserLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(
        "http://localhost:5000/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Login failed");
        setLoading(false);
        return;
      }

      // Save JWT token
      localStorage.setItem("token", data.token);

      // Save user information
      localStorage.setItem("user", JSON.stringify(data.user));

      setMessage("Login successful! 🎉");

      console.log("Login successful");
      console.log("User:", data.user);

      // For now, go back to Home
      setTimeout(() => {
         navigate("/user-dashboard");
      }, 1000);

    } catch (error) {
      console.error("Login Error:", error);
      setMessage("Unable to connect to server.");
    }

    setLoading(false);
  };

  return (
    <div
      style={{
        width: "350px",
        margin: "100px auto",
        padding: "30px",
        background: "white",
        borderRadius: "12px",
        boxShadow: "0 0 15px rgba(0,0,0,0.1)",
      }}
    >
      <h1 style={{ textAlign: "center" }}>
        User Login
      </h1>

      <form onSubmit={handleLogin}>

        <label>Email</label>

        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            width: "100%",
            padding: "10px",
            marginTop: "8px",
            marginBottom: "20px",
            boxSizing: "border-box",
          }}
        />

        <label>Password</label>

        <input
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{
            width: "100%",
            padding: "10px",
            marginTop: "8px",
            marginBottom: "20px",
            boxSizing: "border-box",
          }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px",
            background: loading ? "#999" : "#0d6efd",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Logging in..." : "Login"}
        </button>

      </form>

      {message && (
        <p
          style={{
            textAlign: "center",
            marginTop: "20px",
            fontWeight: "bold",
          }}
        >
          {message}
        </p>
      )}

      <div
        style={{
          textAlign: "center",
          marginTop: "20px",
        }}
      >
        <Link to="/">
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}

export default UserLogin;