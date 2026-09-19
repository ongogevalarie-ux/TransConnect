import React, { useState } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async (e) => {
    e.preventDefault();

    if (!origin || !destination) {
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
            origin: origin,
            destination: destination,
          },
        }
      );

      setResults(response.data);
    } catch (err) {
      console.error(err);
      setError("Unable to search transport routes.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <nav className="navbar">
        <div className="logo">Trans-Connect</div>

        <div className="nav-links">
          <a href="/">Home</a>
          <a href="/">Routes</a>
          <a href="/">Operators</a>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-content">
          <h1>Find Your Journey</h1>

          <p>
            Compare transport routes, fares and schedules from different
            operators in one place.
          </p>

          <form className="search-form" onSubmit={handleSearch}>
            <div className="input-group">
              <label>From</label>
              <input
                type="text"
                placeholder="e.g. Nairobi"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label>To</label>
              <input
                type="text"
                placeholder="e.g. Kisumu"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              />
            </div>

            <button type="submit">
              {loading ? "Searching..." : "Search"}
            </button>
          </form>

          {error && <p className="error">{error}</p>}
        </div>
      </section>

      <section className="results-section">
        <h2>Transport Results</h2>

        {results.length === 0 && !loading && !error && (
          <p className="empty-message">
            Enter your journey details to find available transport.
          </p>
        )}

        <div className="results-grid">
          {results.map((result, index) => (
            <div className="transport-card" key={index}>
              <h3>{result.operator}</h3>

              <p>
                <strong>Route:</strong> {result.route}
              </p>

              <p>
                <strong>Fare:</strong> KSh {result.fare}
              </p>

              <p>
                <strong>Departure:</strong> {result.departure_time}
              </p>

              <p>
                <strong>Arrival:</strong> {result.arrival_time}
              </p>

              <button
                className="book-button"
                onClick={() => {
                  window.location.href = result.booking_url;
                }}
              >
                Book Now
              </button>
            </div>
          ))}
        </div>
      </section>

      <footer>
        <p>© 2026 Trans-Connect. Integrated Public Transport Information.</p>
      </footer>
    </div>
  );
}

export default App;