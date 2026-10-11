
import { Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import UserLogin from "./pages/UserLogin";
import UserDashboard from "./pages/UserDashboard";
import EmergencyRequest from "./pages/EmergencyRequest";
import TrackEmergency from "./pages/TrackEmergency";

import HospitalLogin from "./pages/HospitalLogin";
import HospitalRegister from "./pages/HospitalRegister";
import HospitalDashboard from "./pages/HospitalDashboard";

function App() {
  return (
    <Routes>
      {/* Home */}
      <Route path="/" element={<Home />} />

      {/* User Routes */}
      <Route
        path="/user-login"
        element={<UserLogin />}
      />

      <Route
        path="/user-dashboard"
        element={<UserDashboard />}
      />

      <Route
        path="/emergency-request"
        element={<EmergencyRequest />}
      />

      <Route
        path="/track-emergency"
        element={<TrackEmergency />}
      />

      {/* Hospital Routes */}
      <Route
        path="/hospital-login"
        element={<HospitalLogin />}
      />

      <Route
        path="/hospital-register"
        element={<HospitalRegister />}
      />

      <Route
        path="/hospital-dashboard"
        element={<HospitalDashboard />}
      />
    </Routes>
  );
}

export default App;
