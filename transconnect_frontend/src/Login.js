import React, { useState } from "react";
import axios from "axios";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    try {
      const response = await axios.post(
        "http://127.0.0.1:8000/api/auth/login/",
        {
          username,
          password,
        }
      );

      localStorage.setItem(
        "access_token",
        response.data.access
      );

      localStorage.setItem(
        "refresh_token",
        response.data.refresh
      );

      alert("Login successful!");

    } catch (err) {
      console.error(err);

      setError(
        "Invalid username or password."
      );
    }
  };

  return (
    <div className="auth-container">

      <div className="auth-card">

        <h2>Welcome Back</h2>

        <p>Login to Trans-Connect</p>

        <form onSubmit={handleSubmit}>

          <label>Username</label>

          <input
            type="text"
            value={username}
            onChange={(e) =>
              setUsername(e.target.value)
            }
            placeholder="Enter username"
            required
          />

          <label>Password</label>

          <input
            type="password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            placeholder="Enter password"
            required
          />

          <button type="submit">
            Login
          </button>

        </form>

        {error && (
          <p className="auth-error">
            {error}
          </p>
        )}

      </div>

    </div>
  );
}

export default Login;