import React, { useState } from "react";
import axios from "axios";

function Register() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    try {
      const response = await axios.post(
        "http://127.0.0.1:8000/api/auth/register/",
        formData
      );

      setMessage(response.data.message);

      setFormData({
        username: "",
        email: "",
        password: "",
      });

    } catch (err) {
      if (err.response && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError("Registration failed.");
      }
    }
  };

  return (
    <div className="auth-container">

      <div className="auth-card">

        <h2>Create Account</h2>

        <p>Join Trans-Connect</p>

        <form onSubmit={handleSubmit}>

          <label>Username</label>

          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="Enter username"
            required
          />

          <label>Email</label>

          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter email"
            required
          />

          <label>Password</label>

          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Enter password"
            required
          />

          <button type="submit">
            Register
          </button>

        </form>

        {message && (
          <p className="success">
            {message}
          </p>
        )}

        {error && (
          <p className="auth-error">
            {error}
          </p>
        )}

      </div>

    </div>
  );
}

export default Register;