import React, { useState } from "react";
import axios from "axios";
import { Link, Routes, Route } from "react-router-dom";
import Register from "./Register";
import Login from "./Login";
import "./App.css";

function Home() {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async (e) => {
    e.preventDefault();

    if (!origin.trim() || !destination.trim()) {
      setError("Please enter both origin and destination.");
      return;
    }

    setLoading(true);
    setError("");
    setResults([]);

    try {
      const response = await axios.get(
        "http://127.0.0.1:8000/api/search/",
        {
          params: {
            origin: origin.trim(),
            destination: destination.trim(),
          },
        }
      );

      setResults(response.data);

      if (response.data.length === 0) {
        setError("No transport options found for this route.");
      }
    } catch (err) {
      console.error(err);
      setError("Unable to connect to the transport search service.");
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = (url) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <section className="hero">
        <div className="hero-content">

          <h1>Find Your Journey</h1>

          <p>
            Search routes, fares and schedules from multiple
            transport operators in one place.
          </p>

          <form
            className="search-form"
            onSubmit={handleSearch}
          >
            <div className="input-group">
              <label>From</label>

              <input
                type="text"
                placeholder="e.g. Nairobi"
                value={origin}
                onChange={(e) =>
                  setOrigin(e.target.value)
                }
              />
            </div>

            <div className="input-group">
              <label>To</label>

              <input
                type="text"
                placeholder="e.g. Kisumu"
                value={destination}
                onChange={(e) =>
                  setDestination(e.target.value)
                }
              />
            </div>

            <button type="submit" disabled={loading}>
              {loading ? "Searching..." : "Search"}
            </button>
          </form>

          {error && (
            <p className="error">{error}</p>
          )}

        </div>
      </section>

      <section className="results-section">

        <div className="results-header">
          <h2>Available Transport</h2>

          {results.length > 0 && (
            <span className="result-count">
              {results.length} options found
            </span>
          )}
        </div>

        {!loading &&
          results.length === 0 &&
          !error && (
            <p className="empty-message">
              Search for a route to see available
              transport options.
            </p>
          )}

        {loading && (
          <p className="empty-message">
            Searching available transport...
          </p>
        )}

        <div className="results-grid">

          {results.map((result, index) => (
            <div
              className="transport-card"
              key={index}
            >

              <div className="card-header">
                <h3>{result.operator}</h3>

                <span className="available">
                  Available
                </span>
              </div>

              <div className="route">
                <strong>{result.route}</strong>
              </div>

              <div className="transport-details">

                <div>
                  <span>Fare</span>
                  <strong>
                    KSh {result.fare}
                  </strong>
                </div>

                <div>
                  <span>Departure</span>
                  <strong>
                    {result.departure_time}
                  </strong>
                </div>

                <div>
                  <span>Arrival</span>
                  <strong>
                    {result.arrival_time}
                  </strong>
                </div>

              </div>

              <button
                className="book-button"
                onClick={() =>
                  handleBooking(
                    result.booking_url
                  )
                }
              >
                Book Now
              </button>

            </div>
          ))}

        </div>
      </section>
    </>
  );
}

function App() {
  return (
    <div className="app">

      {/* NAVIGATION */}
      <nav className="navbar">

        <div className="logo">
          <Link to="/">Trans-Connect</Link>
        </div>

        <div className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/register">Register</Link>
          <Link to="/login">Login</Link>
        </div>

      </nav>

      {/* PAGES */}
      <Routes>

        <Route
          path="/"
          element={<Home />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        <Route
          path="/login"
          element={<Login />}
        />

      </Routes>

      {/* FOOTER */}
      <footer>
        <p>© 2026 Trans-Connect</p>

        <span>
          Integrated Public Transport Information System
        </span>
      </footer>

    </div>
  );
}

export default App;