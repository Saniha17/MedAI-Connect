
import Navbar from "../components/Navbar";
import FeatureCard from "../components/FeatureCard";
import { Link } from "react-router-dom";
import "../styles/Home.css";

function Home() {
  return (
    <>
      <Navbar />

      <div className="container">
        <h1 className="title">🚑 MedAI Connect</h1>

        <h2 className="subtitle">
          AI-Powered Emergency Hospital Recommendation System
        </h2>

        <p className="description">
          Connecting Patients to the Right Hospital in Real-Time
        </p>

        <div className="button-container">
          <Link to="/user-login">
            <button className="login-button">
              User Login
            </button>
          </Link>

          <Link to="/hospital-login">
            <button className="login-button">
              Hospital Login
            </button>
          </Link>

          <Link to="/hospital-register">
            <button className="login-button">
              Register Hospital
            </button>
          </Link>
        </div>

        <div className="feature-container">
          <FeatureCard
            title="Smart Hospital Recommendation"
            description="Recommends suitable hospitals based on emergency needs and available resources."
          />

          <FeatureCard
            title="Emergency Routing"
            description="Helps route emergency requests to suitable hospitals."
          />

          <FeatureCard
            title="Live Bed Availability"
            description="View hospital ICU beds, ventilators, and capacity."
          />
        </div>
      </div>
    </>
  );
}

export default Home;

