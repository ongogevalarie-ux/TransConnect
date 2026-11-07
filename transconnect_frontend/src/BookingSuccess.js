
import React from "react";
import { Link, useLocation } from "react-router-dom";

function BookingSuccess() {
  const location = useLocation();
  const booking = location.state?.booking;
  const journey = location.state?.journey;

  if (!booking) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h2>Booking information unavailable</h2>
          <Link to="/">Return Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Booking Request Submitted!</h2>

        <p>
          Your booking request has been received by Trans-Connect.
        </p>

        <div className="booking-summary">
          <p>
            <strong>Booking Reference:</strong>
          </p>
          <p>{booking.booking_reference}</p>

          {journey && (
            <>
              <p><strong>Operator:</strong> {journey.operator}</p>
              <p><strong>Journey:</strong> {journey.route}</p>
              <p><strong>Departure:</strong> {journey.departure_time}</p>
            </>
          )}

          <p>
            <strong>Status:</strong> {booking.status}
          </p>
        </div>

        <p>
          Your reservation will be confirmed shortly.
        </p>

        <Link to="/" className="book-button">
          Return to Homepage
        </Link>
      </div>
    </div>
  );
}

export default BookingSuccess;
