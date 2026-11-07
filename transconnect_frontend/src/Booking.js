
import React, { useState } from "react";
import axios from "axios";
import { useLocation, useNavigate, useParams } from "react-router-dom";

function Booking() {
  const { scheduleId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const journey = location.state?.journey;

  const [formData, setFormData] = useState({
    passenger_name: "",
    passenger_email: "",
    passenger_phone: "",
    seats_requested: 1,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const token = localStorage.getItem("access_token");

    if (!token) {
      navigate("/login");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        "http://127.0.0.1:8000/api/bookings/",
        {
          schedule: Number(scheduleId),
          passenger_name: formData.passenger_name,
          passenger_email: formData.passenger_email,
          passenger_phone: formData.passenger_phone,
          seats_requested: Number(formData.seats_requested),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      navigate("/booking-success", {
        state: {
          booking: response.data,
          journey,
        },
      });
    } catch (err) {
      console.error(err);

      if (err.response?.status === 401) {
        setError("Your login session has expired. Please log in again.");
      } else if (err.response?.data) {
        setError(JSON.stringify(err.response.data));
      } else {
        setError("Unable to submit your booking. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!journey) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h2>Journey not available</h2>
          <p>Please return to the homepage and select a journey again.</p>
          <button onClick={() => navigate("/")}>Back to Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card booking-card">
        <h2>Book Your Journey</h2>
        <p>Enter your passenger details to request a reservation.</p>

        <div className="booking-summary">
          <h3>{journey.operator}</h3>
          <p>{journey.route}</p>
          <p>Fare: KSh {journey.fare}</p>
          <p>Departure: {journey.departure_time}</p>
          <p>Arrival: {journey.arrival_time}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <label>Passenger Name</label>
          <input
            type="text"
            name="passenger_name"
            value={formData.passenger_name}
            onChange={handleChange}
            required
          />

          <label>Email Address</label>
          <input
            type="email"
            name="passenger_email"
            value={formData.passenger_email}
            onChange={handleChange}
            required
          />

          <label>Phone Number</label>
          <input
            type="tel"
            name="passenger_phone"
            value={formData.passenger_phone}
            onChange={handleChange}
            required
          />

          <label>Number of Seats</label>
          <input
            type="number"
            name="seats_requested"
            min="1"
            max="10"
            value={formData.seats_requested}
            onChange={handleChange}
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? "Submitting..." : "Submit Booking Request"}
          </button>
        </form>

        {error && <p className="auth-error">{error}</p>}

        <p className="auth-link">
          Your booking will remain pending until confirmed.
        </p>
      </div>
    </div>
  );
}

export default Booking;
