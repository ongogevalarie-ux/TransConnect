import React from "react";
import { Link, useLocation } from "react-router-dom";

// Shown after a booking request is submitted.
// Payment and the ticket now live on /pay/:bookingId (PaymentStatus), so this
// page only confirms the request and points to payment once it is allowed.
function BookingSuccess() {
  const location = useLocation();

  const booking = location.state?.booking;
  const journey = location.state?.journey;
  const paymentMessage = location.state?.paymentMessage;

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

  const canPay = booking.status === "CONFIRMED";

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Booking Request Submitted!</h2>

        <p>Your booking has been received by Trans-Connect.</p>

        <div className="booking-summary">
          <p>
            <strong>Booking Reference:</strong>{" "}
            {booking.booking_reference || booking.id}
          </p>

          {journey && (
            <>
              <p><strong>Operator:</strong> {journey.operator}</p>
              <p><strong>Journey:</strong> {journey.route}</p>
              <p><strong>Departure:</strong> {journey.departure_time}</p>
            </>
          )}

          <p><strong>Booking Status:</strong> {booking.status}</p>
        </div>

        {canPay ? (
          <Link
            to={`/pay/${booking.id}`}
            state={{ booking, journey }}
            className="book-button"
          >
            Pay with M-Pesa
          </Link>
        ) : (
          <p>
            {paymentMessage ||
              "Payment will be available once the operator confirms your booking."}
          </p>
        )}

        <Link to="/" className="book-button">
          Return to Homepage
        </Link>
      </div>
    </div>
  );
}

export default BookingSuccess;