import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link, Routes, Route, useNavigate, Navigate } from "react-router-dom";
import Register from "./Register";
import Login from "./Login";
import Booking from "./Booking";
import BookingSuccess from "./BookingSuccess";
import AdminDashboard from "./AdminDashboard";
import PaymentPage from "./paymentpage";
import PaymentStatus from "./paymentstatus";
import MyBookings from "./MyBookings";
import "./App.css";

function Home() {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSearch = async (e) => {
    e.preventDefault();

    setHasSearched(true);

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

  const handleBooking = (journey) => {
  const token = localStorage.getItem("access_token");

  if (!token) {
    navigate("/login");
    return;
  }

  navigate(`/book/${journey.schedule_id}`, {
    state: { journey },
  });
};
  const [hasSearched, setHasSearched] = useState(false);

useEffect(() => {
  const fetchFeaturedRoutes = async () => {
    try {
      const response = await axios.get(
        "http://127.0.0.1:8000/api/search/featured/"
      );

      setResults(response.data);
    } catch (err) {
      console.error("Unable to load featured routes:", err);
    }
  };

  fetchFeaturedRoutes();
}, []);

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
          <h2>{hasSearched ? "Search Results" : "Popular Routes"}</h2>
          {results.length > 0 && (
            <span className="result-count">
            </span>
          )}
        </div>

        {!loading &&
          results.length === 0 &&
          !error && (
            <p className="empty-message">
              {hasSearched
                ? "No transport options found for this route."
                : "Explore available routes from different transport companies."
              }
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
                onClick={() => handleBooking(result)}
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
  const [user, setUser] = useState(
    localStorage.getItem("username")
  );

  const handleLogin = (username) => {
    localStorage.setItem("username", username);
    setUser(username);
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("username");

    setUser(null);
  };

  return (
    <div className="app">

      <nav className="navbar">

        <div className="logo">
          <Link to="/">Trans-Connect</Link>
        </div>

        <div className="nav-links">

          <Link to="/">Home</Link>

          {user ? (
  <>
            <Link to="/my-bookings">
               My Bookings
             </Link>

              <span className="welcome">
                  Welcome, {user}
               </span>

              <button
                className="logout-button"
                onClick={handleLogout}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/register">
                Register
              </Link>

              <Link to="/login">
                Login
              </Link>
            </>
          )}

        </div>

      </nav>

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
          element={
            <Login onLogin={handleLogin} />
          }
        />
        <Route path="/book/:scheduleId" element={<Booking />} />
        <Route path="/booking-success" element={<BookingSuccess />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/pay/:bookingId" element={<PaymentPage />} />
        <Route path="/payment-status/:bookingId" element={<PaymentStatus />} />
        <Route path="/my-bookings" element={localStorage.getItem("access_token") ? (
      <MyBookings />
    ) : (
      <Navigate to="/login" replace />
    )
  }
/>
      </Routes>

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