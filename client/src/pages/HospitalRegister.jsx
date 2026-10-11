
import { useState } from "react";

function HospitalRegister() {
  const [form, setForm] = useState({
    hospitalName: "",
    email: "",
    password: "",
    phone: "",
    address: "",
    icuBeds: 0,
    generalBeds: 0,
    ventilators: 0,
  });

  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const response = await fetch(
        "http://localhost:5000/api/hospital/register",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            icuBeds: Number(form.icuBeds),
            generalBeds: Number(form.generalBeds),
            ventilators: Number(form.ventilators),
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage("Hospital registered successfully!");
        setForm({
          hospitalName: "",
          email: "",
          password: "",
          phone: "",
          address: "",
          icuBeds: 0,
          generalBeds: 0,
          ventilators: 0,
        });
      } else {
        setMessage(data.message || "Registration failed.");
      }
    } catch {
      setMessage("Unable to connect to server.");
    }
  };

  return (
    <div style={{
      maxWidth: "450px",
      margin: "50px auto",
      padding: "30px",
      background: "white",
      borderRadius: "12px",
      boxShadow: "0 0 15px #ddd"
    }}>
      <h1 style={{ color: "#1769ff", textAlign: "center" }}>
        🏥 Hospital Registration
      </h1>

      <form onSubmit={handleSubmit}>
        {[
          ["hospitalName", "Hospital Name", "text"],
          ["email", "Email", "email"],
          ["password", "Password", "password"],
          ["phone", "Phone Number", "tel"],
          ["address", "Address", "text"],
        ].map(([name, label, type]) => (
          <div key={name} style={{ marginBottom: "15px" }}>
            <label>{label}</label>
            <input
              name={name}
              type={type}
              value={form[name]}
              onChange={handleChange}
              required
              style={{
                display: "block",
                width: "100%",
                padding: "10px",
                marginTop: "6px",
                boxSizing: "border-box"
              }}
            />
          </div>
        ))}

        {[
          ["icuBeds", "Available ICU Beds"],
          ["generalBeds", "Available General Beds"],
          ["ventilators", "Available Ventilators"],
        ].map(([name, label]) => (
          <div key={name} style={{ marginBottom: "15px" }}>
            <label>{label}</label>
            <input
              name={name}
              type="number"
              min="0"
              value={form[name]}
              onChange={handleChange}
              required
              style={{
                display: "block",
                width: "100%",
                padding: "10px",
                marginTop: "6px",
                boxSizing: "border-box"
              }}
            />
          </div>
        ))}

        {message && (
          <p style={{ textAlign: "center", color: "#198754" }}>
            {message}
          </p>
        )}

        <button type="submit" style={{
          width: "100%",
          padding: "12px",
          background: "#1769ff",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "16px"
        }}>
          Register Hospital
        </button>
      </form>
    </div>
  );
}

export default HospitalRegister;
