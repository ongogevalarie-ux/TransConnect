
import React, { useState, useEffect } from "react";
import api from "./services/api";import {
  Link,
  NavLink,
  Routes,
  Route,
  Navigate,
  Outlet,
  useNavigate,
} from "react-router-dom";

import Register from "./Register";
import Login from "./Login";
import AdminLogin from "./AdminLogin";
import AdminDashboard from "./AdminDashboard";
import Booking from "./Booking";
import BookingSuccess from "./BookingSuccess";
import PaymentPage from "./paymentpage";
import PaymentStatus from "./paymentstatus";
import MyBookings from "./MyBookings";
import About from "./About";
import Contact from "./Contact";
import "./App.css";

// ------------------------------------
// API RESPONSE HELPER
// ------------------------------------

const getList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

// ------------------------------------
// JOURNEY CARD
// ------------------------------------


function JourneyCard({ journey, onBook }) {
  const [logoFailed, setLogoFailed] = useState(false);

  const operatorName =
    typeof journey.operator === "object"
      ? journey.operator?.name || "Transport operator"
      : journey.operator || "Transport operator";

  // Support common logo field names if supplied by the API.
  const operatorLogos = {
  "easy coach": "/images/operators/easy-coach.jpg",
  "guardian angel": "/images/operators/guardian-angel.png",
  "ena coach": "/images/operators/ena-coach.png",
};

const operatorLogo =
  operatorLogos[operatorName.trim().toLowerCase()] || "";

  const departureLocation =
    journey.origin ||
    journey.departure_location ||
    journey.from ||
    "";

  const arrivalLocation =
    journey.destination ||
    journey.arrival_location ||
    journey.to ||
    "";

  return (
    <article className="tc-journey-card">
      <div className="tc-journey-card-top">
        <div className="tc-operator-icon">
          {operatorLogo && !logoFailed ? (
            <img
              src={operatorLogo}
              alt={`${operatorName} logo`}
              onError={() => setLogoFailed(true)}
            />
          ) : (
            (operatorName.charAt(0) || "T").toUpperCase()
          )}
        </div>

        <div className="tc-operator-name">
          <h3>{operatorName}</h3>
          <span>Transport operator</span>
        </div>

        <span className="tc-availability">
          <span></span>
          Available
        </span>
      </div>

      <div className="tc-journey-route">
        <div>
          <span className="tc-route-label">ROUTE</span>
          <strong>{journey.route || "Route information"}</strong>
        </div>
        <span className="tc-route-symbol">→</span>
      </div>

      <div className="tc-journey-time-line">
        <div className="tc-time-point">
          <span className="tc-time-dot departure"></span>
          <div>
            <span className="tc-time-label">DEPARTURE</span>
            <strong>{journey.departure_time || "Not specified"}</strong>
            {departureLocation && <small>{departureLocation}</small>}
          </div>
        </div>

        <div className="tc-time-connector"></div>

        <div className="tc-time-point">
          <span className="tc-time-dot arrival"></span>
          <div>
            <span className="tc-time-label">ARRIVAL</span>
            <strong>{journey.arrival_time || "Not specified"}</strong>
            {arrivalLocation && <small>{arrivalLocation}</small>}
          </div>
        </div>
      </div>

      <div className="tc-journey-card-bottom">
        <div>
          <span className="tc-fare-label">TRAVEL FARE</span>
          <strong className="tc-journey-fare">
            KSh {journey.fare ?? "—"}
          </strong>
        </div>

        <button
          className="tc-journey-book-button"
          onClick={() => onBook(journey)}
          disabled={!journey.schedule_id}
        >
          Book journey <span>→</span>
        </button>
      </div>
    </article>
  );
}


// ------------------------------------
// HOME PAGE
// ------------------------------------

function Home() {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");

  const [results, setResults] = useState([]);
  const [featuredRoutes, setFeaturedRoutes] = useState([]);

  const [loading, setLoading] = useState(false);
  const [featuredLoading, setFeaturedLoading] = useState(true);

  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const [sortBy, setSortBy] = useState("default");

  const navigate = useNavigate();
  const handleSwap = () => {
  setOrigin(destination);
  setDestination(origin);
};

  // Search available transport journeys.
  const handleSearch = async (e) => {
    e.preventDefault();
    setHasSearched(true);

    if (!origin.trim() || !destination.trim()) {
      setResults([]);
      setError("Please enter both your departure and destination cities.");
      return;
    }

    setLoading(true);
    setError("");
    setResults([]);

    try {
      const response = await api.get("search/", {
  params: {
    origin: origin.trim(),
    destination: destination.trim(),
  },
});

      const journeys = getList(response.data);
      setResults(journeys);

      if (journeys.length === 0) {
        setError("No transport options found for this route. Try another destination.");
      }
    } catch (err) {
      console.error("Journey search failed:", err);
      setError("Unable to connect to the transport search service. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Booking requires an authenticated passenger.
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

  // Load featured journeys separately from search results.
  useEffect(() => {
    const fetchFeaturedRoutes = async () => {
      try {
        const response = await api.get("search/featured/");

        setFeaturedRoutes(getList(response.data));
      } catch (err) {
        console.error("Unable to load featured routes:", err);
      } finally {
        setFeaturedLoading(false);
      }
    };

    fetchFeaturedRoutes();
  }, []);

  const displayedRoutes = hasSearched ? results : featuredRoutes;
  const sortedRoutes = [...displayedRoutes].sort((a, b) => {
  const fareA = Number(String(a.fare ?? "").replace(/[^\d.]/g, "")) || 0;
  const fareB = Number(String(b.fare ?? "").replace(/[^\d.]/g, "")) || 0;

  const timeToMinutes = (time) => {
    if (!time) return Infinity;

    const value = String(time).trim();
    const match = value.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);

    if (!match) return Infinity;

    let hours = Number(match[1]);
    const minutes = Number(match[2]);
    const period = match[3]?.toUpperCase();

    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;

    if (hours > 23 || minutes > 59) return Infinity;

    return hours * 60 + minutes;
  };

  if (sortBy === "fare-low") return fareA - fareB;
  if (sortBy === "fare-high") return fareB - fareA;

  if (sortBy === "departure") {
    return (
      timeToMinutes(a.departure_time) -
      timeToMinutes(b.departure_time)
    );
  }

  return 0;
});

  return (
    <div className="tc-home">

      {/* HERO SECTION */}
      <section
  className="tc-home-hero"
  style={{
    backgroundImage: `
      linear-gradient(
        90deg,
        rgba(5, 19, 43, 0.94) 0%,
        rgba(5, 19, 43, 0.82) 48%,
        rgba(5, 19, 43, 0.42) 100%
      ),
      url("${process.env.PUBLIC_URL}/images/kenyan-coach.jpg")
    `,
    backgroundPosition: "center 48%",
    backgroundSize: "cover",
    backgroundRepeat: "no-repeat",
  }}
>
        <div className="tc-home-hero-overlay">
          <div className="tc-home-container">
            <div className="tc-home-hero-content">

              <span className="tc-home-eyebrow">
                YOUR JOURNEY, CONNECTED
              </span>

              <h1>
                Travel across Kenya.
                <br />
                <span>Plan with confidence.</span>
              </h1>

              <p>
                Discover transport operators, explore routes, check fares
                and departure schedules all in one convenient place.
              </p>

              <div className="tc-home-trust">
                <span> Multiple transport operators</span>
                <span> Clear fare information</span>
                <span> Convenient booking access</span>
              </div>

            </div>

            {/* SEARCH PANEL */}
            <div className="tc-search-panel">
              <div className="tc-search-heading">
                <div>
                  <span className="tc-section-kicker">START YOUR JOURNEY</span>
                  <h2>Where would you like to go?</h2>
                </div>

                <span className="tc-search-icon">⌕</span>
              </div>

              
<form className="tc-home-search-form" onSubmit={handleSearch}>
  <div className="tc-search-field">
    <label htmlFor="journey-origin">FROM</label>

    <div className="tc-search-input-wrap">
      <span className="tc-input-dot tc-origin-dot"></span>
      <input
        id="journey-origin"
        type="text"
        placeholder="Departure city"
        value={origin}
        onChange={(e) => setOrigin(e.target.value)}
      />
    </div>
  </div>

  <button
    type="button"
    className="tc-swap-button"
    onClick={handleSwap}
    title="Swap departure and destination"
    aria-label="Swap departure and destination"
  >
    ⇄
  </button>

  <div className="tc-search-field">
    <label htmlFor="journey-destination">TO</label>

    <div className="tc-search-input-wrap">
      <span className="tc-input-dot tc-destination-dot"></span>
      <input
        id="journey-destination"
        type="text"
        placeholder="Destination city"
        value={destination}
        onChange={(e) => setDestination(e.target.value)}
      />
    </div>
  </div>

  <button
    type="submit"
    className="tc-search-submit"
    disabled={loading}
  >
    {loading ? "Searching..." : "Search journeys"}
    {!loading && <span>→</span>}
  </button>
</form>


              {error && (
                <p className="tc-search-error" role="alert">
                  {error}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* PLATFORM BENEFITS */}
      <section className="tc-home-benefits">
        <div className="tc-home-container tc-benefits-grid">

          <div className="tc-benefit">
            <div className="tc-benefit-icon">⌕</div>
            <div>
              <h3>Explore routes</h3>
              <p>Find journeys between destinations.</p>
            </div>
          </div>

          <div className="tc-benefit">
            <div className="tc-benefit-icon">KSh</div>
            <div>
              <h3>Check fares</h3>
              <p>View available fare information.</p>
            </div>
          </div>

          <div className="tc-benefit">
            <div className="tc-benefit-icon">◷</div>
            <div>
              <h3>View schedules</h3>
              <p>Explore departure and arrival times.</p>
            </div>
          </div>

          <div className="tc-benefit">
            <div className="tc-benefit-icon">↗</div>
            <div>
              <h3>Book conveniently</h3>
              <p>Access available booking options.</p>
            </div>
          </div>

        </div>
      </section>

      {/* JOURNEY RESULTS / FEATURED ROUTES */}
      <section className="tc-home-journeys">
        <div className="tc-home-container">

          <div className="tc-journeys-heading">
            <div>
              <span className="tc-section-kicker">
                {hasSearched ? "YOUR SEARCH" : "DISCOVER DESTINATIONS"}
              </span>

              <h2>
                {hasSearched ? "Available journeys" : "Explore popular journeys"}
              </h2>

              <p>
                {hasSearched
                  ? `Journey options from ${origin} to ${destination}.`
                  : "Explore journey options available through our transport information platform."}
              </p>
            </div>

            {hasSearched && (
              <button
                className="tc-clear-search"
                onClick={() => {
                  setHasSearched(false);
                  setResults([]);
                  setError("");
                  setOrigin("");
                  setDestination("");
                }}
              >
                Clear search
              </button>
            )}
          </div>

          {loading && (
            <div className="tc-home-message">
              <div className="tc-loading-spinner"></div>
              <p>Searching available journeys...</p>
            </div>
          )}

          {!loading && featuredLoading && !hasSearched && (
            <div className="tc-home-message">
              <div className="tc-loading-spinner"></div>
              <p>Loading featured journeys...</p>
            </div>
          )}

          {!loading && !featuredLoading && displayedRoutes.length === 0 && (
            <div className="tc-empty-state">
              <div className="tc-empty-icon">⌕</div>
              <h3>
                {hasSearched ? "No journeys found" : "Journeys will appear here"}
              </h3>
              <p>
                {hasSearched
                  ? "We couldn't find transport options for your search. Try different departure or destination cities."
                  : "Available featured journeys will appear here when transport data is provided."}
              </p>
            </div>
          )}

          
{!loading && displayedRoutes.length > 0 && (
  <>
    <div className="tc-results-toolbar">
      <p>
        <strong>{displayedRoutes.length}</strong>{" "}
        journey option(s) found
      </p>

      <div className="tc-sort-control">
        <label htmlFor="journey-sort">Sort by:</label>

        <select
          id="journey-sort"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="default">Recommended order</option>
          <option value="fare-low">Lowest fare</option>
          <option value="fare-high">Highest fare</option>
          <option value="departure">Earliest departure</option>
        </select>
      </div>
    </div>

    <div className="tc-journeys-grid">
      {sortedRoutes.map((journey, index) => (
        <JourneyCard
          key={journey.schedule_id || index}
          journey={journey}
          onBook={handleBooking}
        />
      ))}
    </div>
  </>
)}


        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="tc-how-it-works">
        <div className="tc-home-container">
          <div className="tc-how-heading">
            <span className="tc-section-kicker">SIMPLE AND CONVENIENT</span>
            <h2>Your journey in three steps</h2>
            <p>
              Trans-Connect helps you find transport information and access
              available booking services.
            </p>
          </div>

          <div className="tc-steps-grid">
            <div className="tc-step">
              <span className="tc-step-number">01</span>
              <h3>Search your route</h3>
              <p>Enter your departure and destination cities.</p>
            </div>

            <div className="tc-step">
              <span className="tc-step-number">02</span>
              <h3>Explore your options</h3>
              <p>Review available operators, fares and schedules.</p>
            </div>

            <div className="tc-step">
              <span className="tc-step-number">03</span>
              <h3>Book your journey</h3>
              <p>Choose a journey and continue through the booking process.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CALL TO ACTION */}
      <section className="tc-home-cta">
        <div className="tc-home-container tc-cta-content">
          <div>
            <span>TRAVEL INFORMATION, SIMPLIFIED</span>
            <h2>Make your next journey easier to plan.</h2>
            <p>
              Explore transport information from different operators in one place.
            </p>
          </div>

          <Link to="/about" className="tc-cta-button">
            Learn about us <span>→</span>
          </Link>
        </div>
      </section>

    </div>
  );
}

// ------------------------------------
// PASSENGER WEBSITE LAYOUT
// ------------------------------------


function UserLayout({ user, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  const handleMobileLogout = () => {
    closeMenu();
    onLogout();
  };

  return (
    <div className="app">
      <nav className="tc-navbar">
        <div className="tc-navbar-inner">

          {/* BRAND */}
          <Link to="/" className="tc-navbar-brand" onClick={closeMenu}>
            <span className="tc-brand-mark">TC</span>
            <span className="tc-brand-name">Trans-Connect</span>
          </Link>

          {/* MOBILE MENU BUTTON */}
          <button
            type="button"
            className={`tc-menu-toggle ${menuOpen ? "active" : ""}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

          {/* NAVIGATION LINKS */}
          <div className={`tc-navbar-links ${menuOpen ? "open" : ""}`}>

            <NavLink
              to="/"
              end
              onClick={closeMenu}
              className={({ isActive }) =>
                isActive ? "tc-nav-link active" : "tc-nav-link"
              }
            >
              Home
            </NavLink>

            <NavLink
              to="/about"
              onClick={closeMenu}
              className={({ isActive }) =>
                isActive ? "tc-nav-link active" : "tc-nav-link"
              }
            >
              About
            </NavLink>

            <NavLink
              to="/contact"
              onClick={closeMenu}
              className={({ isActive }) =>
                isActive ? "tc-nav-link active" : "tc-nav-link"
              }
            >
              Contact
            </NavLink>

            {user ? (
              <>
                <NavLink
                  to="/my-bookings"
                  onClick={closeMenu}
                  className={({ isActive }) =>
                    isActive ? "tc-nav-link active" : "tc-nav-link"
                  }
                >
                  My Bookings
                </NavLink>

                <span className="tc-nav-welcome">
                  Welcome, {user}
                </span>

                <button
                  className="tc-nav-logout"
                  onClick={handleMobileLogout}
                >
                  Logout
                </button>
              </>
            ) : (
              <div className="tc-nav-auth">
                <Link
                  to="/register"
                  className="tc-nav-register"
                  onClick={closeMenu}
                >
                  Register
                </Link>

                <Link
                  to="/login"
                  className="tc-nav-login"
                  onClick={closeMenu}
                >
                  Login
                </Link>
              </div>
            )}

          </div>
        </div>
      </nav>

      <main>
        <Outlet />
      </main>

      {/* FOOTER */}
      <footer className="tc-footer">
        <div className="tc-home-container">

          <div className="tc-footer-main">

            <div className="tc-footer-brand">
              <Link to="/" className="tc-footer-logo">
                <span className="tc-brand-mark">TC</span>
                <span>Trans-Connect</span>
              </Link>

              <p>
                Connecting travellers with transport information
                across Kenya. Explore routes, fares and schedules
                from different transport operators.
              </p>
            </div>

            <div className="tc-footer-column">
              <h3>Explore</h3>
              <Link to="/">Home</Link>
              <Link to="/about">About Us</Link>
              <Link to="/contact">Contact Us</Link>
            </div>

            <div className="tc-footer-column">
              <h3>Passenger Services</h3>
              <Link to="/my-bookings">My Bookings</Link>
              <Link to="/register">Create Account</Link>
              <Link to="/login">Passenger Login</Link>
            </div>

            <div className="tc-footer-column">
              <h3>Platform</h3>
              <span>Route Information</span>
              <span>Fare Information</span>
              <span>Travel Schedules</span>
              <span>Booking Access</span>
            </div>

          </div>

          <div className="tc-footer-bottom">
            <p>© 2026 Trans-Connect. All rights reserved.</p>
            <span>Integrated Public Transport Information System</span>
          </div>

        </div>
      </footer>
    </div>
  );
}


// ------------------------------------
// ADMINISTRATOR LAYOUT
// ------------------------------------

function AdminLayout({ user, onLogout }) {
  return (
    <div className="tc-admin-layout">
      <header className="tc-admin-topbar">
        <Link to="/admin-dashboard" className="tc-admin-brand">
          <span className="tc-admin-brand-icon">TC</span>

          <span>
            <strong>Trans-Connect</strong>
            <small>Administration Portal</small>
          </span>
        </Link>

        <div className="tc-admin-topbar-right">
          <span>
            Administrator: <strong>{user || "Admin"}</strong>
          </span>

          <Link to="/" className="tc-admin-public-link">
            View website
          </Link>

          <button className="tc-admin-logout" onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>

      <main className="tc-admin-layout-content">
        <AdminDashboard />
      </main>
    </div>
  );
}

// ------------------------------------
// MAIN APPLICATION
// ------------------------------------

function App() {
  const [user, setUser] = useState(
    localStorage.getItem("username")
  );
  useEffect(() => {
  const handleSessionExpired = () => {
    setUser(null);
  };

  window.addEventListener(
    "transconnect:session-expired",
    handleSessionExpired
  );

  return () => {
    window.removeEventListener(
      "transconnect:session-expired",
      handleSessionExpired
    );
  };
}, []);

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

  const isAuthenticated = Boolean(
    localStorage.getItem("access_token")
  );

  return (
    <Routes>
      {/* Passenger website routes */}
      <Route element={<UserLayout user={user} onLogout={handleLogout} />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/login"
          element={<Login onLogin={handleLogin} />}
        />

        <Route path="/book/:scheduleId" element={<Booking />} />

        <Route
          path="/booking-success"
          element={<BookingSuccess />}
        />

        <Route
          path="/pay/:bookingId"
          element={<PaymentPage />}
        />

        <Route
          path="/payment-status/:bookingId"
          element={<PaymentStatus />}
        />

        <Route
          path="/my-bookings"
          element={
            isAuthenticated ? (
              <MyBookings />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Route>

      {/* Separate administrator login */}
      <Route
        path="/admin-login"
        element={<AdminLogin onLogin={handleLogin} />}
      />

      {/* Separate administrator dashboard */}
      <Route
        path="/admin-dashboard"
        element={
          isAuthenticated ? (
            <AdminLayout user={user} onLogout={handleLogout} />
          ) : (
            <Navigate to="/admin-login" replace />
          )
        }
      />

      {/* Unknown routes */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
