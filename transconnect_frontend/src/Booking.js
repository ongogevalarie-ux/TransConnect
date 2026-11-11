import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import api from "./services/api";

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

  const [seats, setSeats] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [loadingSeats, setLoadingSeats] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load available seats from Django
  useEffect(() => {
    const fetchSeats = async () => {
      try {
        const response = await api.get(
          `/bookings/schedules/${scheduleId}/seats/`
        );

        setSeats(response.data.seats);
      } catch (err) {
        setError("Unable to load available seats. Please try again.");
      } finally {
        setLoadingSeats(false);
      }
    };

    fetchSeats();
  }, [scheduleId]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "seats_requested" ? Number(value) : value,
    }));

    if (name === "seats_requested") {
      setSelectedSeats((prev) => prev.slice(0, Number(value)));
    }
  };

  // Select or deselect a seat
  const handleSeatClick = (seatNumber) => {
    setSelectedSeats((prev) => {
      if (prev.includes(seatNumber)) {
        return prev.filter((seat) => seat !== seatNumber);
      }

      if (prev.length >= formData.seats_requested) {
        return prev;
      }

      return [...prev, seatNumber];
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

    if (selectedSeats.length !== formData.seats_requested) {
      setError(
        `Please select exactly ${formData.seats_requested} seat(s).`
      );
      return;
    }

    setLoading(true);

    try {
      const bookingResponse = await api.post("bookings/", {
        schedule: Number(scheduleId),
        passenger_name: formData.passenger_name,
        passenger_email: formData.passenger_email,
        passenger_phone: formData.passenger_phone,
        seats_requested: formData.seats_requested,
        seat_numbers: selectedSeats,
      });

      const booking = bookingResponse.data;

      navigate(`/pay/${booking.id}`, {
        state: { booking, journey },
      });
    } catch (err) {
      console.error(
        "Booking error:",
        err.response?.data || err.message
      );

      if (err.response?.status === 401) {
        setError("Your session has expired. Please log in again.");
      } else {
        setError(
          err.response?.data?.seat_numbers?.[0] ||
          err.response?.data?.error ||
          JSON.stringify(err.response?.data) ||
          "Unable to process your booking."
        );
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
          <button onClick={() => navigate("/")}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card booking-card">
        <h2>Book Your Journey</h2>

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

          {/* Seat Selection */}
          <div className="seat-selection">
            <h3>Select Your Seats</h3>

            <p>
              Selected: {selectedSeats.length} of{" "}
              {formData.seats_requested}
            </p>

            <div className="seat-legend">
              <span>🟩 Available</span>
              <span>🟥 Occupied</span>
              <span>🟦 Selected</span>
            </div>

            {loadingSeats ? (
              <p>Loading available seats...</p>
            ) : (
              <div className="seat-grid">
                {seats.map((seat) => {
                  const selected = selectedSeats.includes(
                    seat.seat_number
                  );

                  const occupied = seat.status === "OCCUPIED";

                  return (
                    <button
                      key={seat.seat_number}
                      type="button"
                      disabled={occupied}
                      onClick={() =>
                        handleSeatClick(seat.seat_number)
                      }
                      className={`seat-button ${
                        occupied
                          ? "occupied"
                          : selected
                          ? "selected"
                          : "available"
                      }`}
                    >
                      {seat.seat_number}
                    </button>
                  );
                })}
              </div>
            )}

            <p>
              Your seats:{" "}
              {selectedSeats.length
                ? selectedSeats.join(", ")
                : "None selected"}
            </p>
          </div>

          
<button
  type="submit"
  className="pay-with-mpesa-button"
  disabled={
    loading ||
    loadingSeats ||
    selectedSeats.length !== formData.seats_requested
  }
>
  {loading ? (
    "Processing booking..."
  ) : (
    <>
      <span className="mpesa-button-icon">M</span>
      Pay with M-Pesa
      <span className="mpesa-button-arrow">→</span>
    </>
  )}
</button>

        </form>

        {error && <p className="auth-error">{error}</p>}

        <p className="auth-link">
          Your booking will be confirmed  after successful  payment.
        </p>
      </div>
    </div>
  );
}

export default Booking;