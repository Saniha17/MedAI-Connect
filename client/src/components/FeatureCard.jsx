import { FaHospital } from "react-icons/fa";

function FeatureCard({ title, description }) {
  return (
    <div
      style={{
        width: "250px",
        background: "white",
        padding: "20px",
        borderRadius: "12px",
        boxShadow: "0 5px 15px rgba(0,0,0,0.1)",
        textAlign: "center",
      }}
    >
      <FaHospital
        size={40}
        color="#0d6efd"
        style={{ marginBottom: "15px" }}
      />

      <h3>{title}</h3>

      <p>{description}</p>
    </div>
  );
}

export default FeatureCard;