
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import api from "./services/api";

function AdminLogin({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      // Authenticate using the existing Django JWT endpoint.
      const response = await api.post("auth/login/", {
        username,
        password,
      });

      const accessToken = response.data.access;
      const refreshToken = response.data.refresh;

      // Verify administrator permissions before saving the session.
      await axios.get(`${api.defaults.baseURL}/bookings/admin/`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      // Save the session only after administrator verification.
      localStorage.setItem("access_token", accessToken);
      localStorage.setItem("refresh_token", refreshToken);
      localStorage.setItem("username", username);

      onLogin(username);
      navigate("/admin-dashboard");
    } catch (err) {
      console.error(
        "Administrator login error:",
        err.response?.data || err.message
      );

      if (err.response?.status === 403) {
        setError(
          "Access denied. This account does not have administrator privileges."
        );
      } else if (err.response?.status === 401) {
        setError("Invalid username or password.");
      } else if (err.response) {
        setError("Unable to verify administrator access. Please try again.");
      } else {
        setError("Unable to connect to the server. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card admin-login-card">
        <div className="admin-login-icon">TC</div>

        <span className="admin-login-label">
          TRANS-CONNECT ADMINISTRATION
        </span>

        <h2>Administrator Login</h2>

        <p>Sign in using your authorized administrator account.</p>

        <form onSubmit={handleSubmit}>
          <label>Username</label>

          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter administrator username"
            required
          />

          <label>Password</label>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? "Verifying access..." : "Access Dashboard"}
          </button>
        </form>

        {error && <p className="auth-error">{error}</p>}

        <p className="admin-login-back">
          <Link to="/">Return to Trans-Connect</Link>
        </p>
      </div>
    </div>
  );
}

export default AdminLogin;
