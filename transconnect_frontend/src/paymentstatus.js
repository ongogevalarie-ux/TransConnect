
import React, { useEffect, useState } from "react";
import api from "./services/api";

export default function PaymentStatus({ bookingId, onBack }) {
  const [booking, setBooking] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [paymentId, setPaymentId] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState("READY");
  const [message, setMessage] = useState("");
  const [ticket, setTicket] = useState(null);
  const [loadingBooking, setLoadingBooking] = useState(true);
  const [loadingPayment, setLoadingPayment] = useState(false);

  useEffect(() => {
    const fetchBooking = async () => {
      setLoadingBooking(true);
      setMessage("");

      try {
        const response = await api.get(`bookings/${bookingId}/`);
        setBooking(response.data);
        setPhoneNumber(response.data.passenger_phone || "");
      } catch (error) {
        console.error("Booking retrieval failed:", error);
        setMessage(
          error.response?.data?.detail ||
          "Unable to retrieve your booking. Please try again."
        );
      } finally {
        setLoadingBooking(false);
      }
    };

    if (bookingId) fetchBooking();
  }, [bookingId]);

  const formatDate = (value) => {
    if (!value) return "Not available";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleString("en-KE", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const formatAmount = (value) => {
    if (value === null || value === undefined) {
      return "Fare unavailable";
    }

    return `KSh ${Number(value).toLocaleString("en-KE")}`;
  };

  const handleInitiatePayment = async (e) => {
    e.preventDefault();

    if (!phoneNumber.trim()) {
      setMessage("Please enter your M-Pesa phone number.");
      return;
    }

    if (!booking || booking.status !== "CONFIRMED") {
      setMessage("Your booking must be confirmed before payment.");
      return;
    }

    setLoadingPayment(true);
    setMessage("");

    try {
      const response = await api.post("payments/initiate/", {
        booking_id: bookingId,
        phone_number: phoneNumber.trim(),
      });

      const data = response.data;

      if (data.payment_id) setPaymentId(data.payment_id);

      if (data.amount) {
        setBooking((previous) => ({
          ...previous,
          total_amount: data.amount,
        }));
      }

      if (data.status === "SUCCESS") {
        setPaymentStatus("SUCCESS");
        setMessage(
          data.message || "This booking has already been paid for."
        );
      } else if (data.status === "FAILED") {
        setPaymentStatus("FAILED");
        setMessage(data.message || "Payment could not be completed.");
      } else {
        setPaymentStatus("PENDING");
        setMessage(
          data.message ||
          "Payment request accepted. Check your phone for the M-Pesa prompt."
        );
      }
    } catch (error) {
      console.error("Payment initiation failed:", error);
      setPaymentStatus("READY");
      setMessage(
        error.response?.data?.error ||
        error.response?.data?.detail ||
        "Unable to initiate payment. Please try again."
      );
    } finally {
      setLoadingPayment(false);
    }
  };

  const handleVerifyPayment = async () => {
    if (!paymentId) {
      setMessage("Payment reference is unavailable. Please try again.");
      return;
    }

    setLoadingPayment(true);
    setMessage("");

    try {
      const response = await api.post(
        `payments/${paymentId}/verify/`
      );

      const data = response.data;

      if (data.successful && data.verified) {
        setPaymentStatus("SUCCESS");
        setTicket(data.ticket);
        setMessage("Your payment has been verified successfully.");
      } else if (data.status === "FAILED") {
        setPaymentStatus("FAILED");
        setMessage(data.message || "Payment was not completed.");
      } else {
        setPaymentStatus("PENDING");
        setMessage(
          data.message ||
          "Payment is still being processed. Please check again shortly."
        );
      }
    } catch (error) {
      console.error("Payment verification failed:", error);
      setMessage(
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Unable to verify payment right now. Please try again."
      );
    } finally {
      setLoadingPayment(false);
    }
  };

  if (loadingBooking) {
    return (
      <div className="payment-page">
        <div className="payment-card payment-loading">
          <div className="loading-spinner"></div>
          <h2>Loading your booking</h2>
          <p>Please wait while we retrieve your journey details.</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="payment-page">
        <div className="payment-card">
          <h2>Booking Not Found</h2>
          <p className="payment-error">{message}</p>
          <button className="payment-back-button" onClick={onBack}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const totalAmount = booking.total_amount;

  return (
    <div className="payment-page">
      <div className="payment-container">

        <div className="payment-top">
          <div>
            <span className="payment-eyebrow">TRANS-CONNECT</span>
            <h1>Complete your payment</h1>
            <p>Review your journey and secure your seat.</p>
          </div>

          <div className="secure-label">
            <span>✓</span> Secure checkout
          </div>
        </div>

        {paymentStatus !== "SUCCESS" && (
          <div className="payment-layout">

            <section className="payment-card booking-panel">
              <div className="panel-heading">
                <div>
                  <span className="panel-eyebrow">YOUR RESERVATION</span>
                  <h2>Booking summary</h2>
                </div>

                <span className={`status-badge ${booking.status?.toLowerCase()}`}>
                  {booking.status}
                </span>
              </div>

              <div className="booking-reference">
                <span>BOOKING REFERENCE</span>
                <strong>{booking.booking_reference || `#${booking.id}`}</strong>
              </div>

              <div className="journey-visual">
                <div className="journey-point">
                  <span className="journey-dot"></span>
                  <div>
                    <span>FROM</span>
                    <h3>{booking.origin || "Origin unavailable"}</h3>
                    <p>{formatDate(booking.departure_time)}</p>
                  </div>
                </div>

                <div className="journey-line">
                  <span>JOURNEY</span>
                </div>

                <div className="journey-point">
                  <span className="journey-dot destination-dot"></span>
                  <div>
                    <span>TO</span>
                    <h3>{booking.destination || "Destination unavailable"}</h3>
                    <p>{formatDate(booking.arrival_time)}</p>
                  </div>
                </div>
              </div>

              <div className="booking-info-grid">
                <div className="booking-info-item">
                  <span>Transport operator</span>
                  <strong>{booking.operator || "Not available"}</strong>
                </div>

                <div className="booking-info-item">
                  <span>Number of seats</span>
                  <strong>{booking.seats_requested}</strong>
                </div>

                <div className="booking-info-item">
                  <span>Selected seats</span>
                  <strong>
                    {booking.selected_seats?.join(", ") || "Not available"}
                  </strong>
                </div>

                <div className="booking-info-item">
                  <span>Passenger</span>
                  <strong>{booking.passenger_name}</strong>
                </div>

                <div className="booking-info-item">
                  <span>Email address</span>
                  <strong>{booking.passenger_email}</strong>
                </div>

                <div className="booking-info-item">
                  <span>Contact number</span>
                  <strong>{booking.passenger_phone || "Not available"}</strong>
                </div>
              </div>

              <div className="fare-total">
                <div>
                  <span>Total amount payable</span>
                  <small>
                    {booking.seats_requested} seat(s) reserved
                  </small>
                </div>

                <strong>{formatAmount(totalAmount)}</strong>
              </div>
            </section>

            <section className="payment-card payment-method-panel">
              {paymentStatus === "READY" && (
                <>
                  <div className="mpesa-heading">
                    <div className="mpesa-mark">M</div>
                    <div>
                      <span className="panel-eyebrow">PAYMENT METHOD</span>
                      <h2>M-Pesa</h2>
                    </div>
                  </div>

                  {booking.status === "CONFIRMED" ? (
                    <form onSubmit={handleInitiatePayment}>
                      <p className="payment-instructions">
                        Enter your M-Pesa number below. A payment request
                        will be sent to your phone.
                      </p>

                      <label htmlFor="phoneNumber">
                        M-Pesa phone number
                      </label>

                      <input
                        id="phoneNumber"
                        type="tel"
                        placeholder="e.g. 0712345678"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        required
                      />

                      <div className="payment-notice">
                        <span>i</span>
                        <p>
                          Keep your phone nearby and follow the instructions
                          displayed by M-Pesa to complete payment.
                        </p>
                      </div>

                      <button
                        type="submit"
                        className="payment-button"
                        disabled={
                          loadingPayment ||
                          totalAmount === null ||
                          totalAmount === undefined
                        }
                      >
                        {loadingPayment
                          ? "Requesting payment..."
                          : `Pay ${formatAmount(totalAmount)}`}
                      </button>
                    </form>
                  ) : (
                    <div className="payment-feedback pending">
                      <div className="payment-symbol">!</div>
                      <h2>Awaiting confirmation</h2>
                      <p>
                        Payment will become available once the operator
                        confirms your booking.
                      </p>
                    </div>
                  )}
                </>
              )}

              {paymentStatus === "PENDING" && (
                <div className="payment-feedback pending">
                  <div className="payment-symbol">...</div>
                  <h2>Payment processing</h2>
                  <p>{message}</p>
                  <p>
                    Check your phone and complete the M-Pesa prompt
                    if it has arrived.
                  </p>

                  <button
                    className="payment-button"
                    onClick={handleVerifyPayment}
                    disabled={loadingPayment}
                  >
                    {loadingPayment ? "Checking..." : "Check payment status"}
                  </button>
                </div>
              )}

              {paymentStatus === "FAILED" && (
                <div className="payment-feedback failed">
                  <div className="payment-symbol">!</div>
                  <h2>Payment not completed</h2>
                  <p>{message}</p>

                  <button
                    className="payment-button"
                    onClick={() => {
                      setPaymentStatus("READY");
                      setPaymentId(null);
                      setMessage("");
                    }}
                    disabled={loadingPayment}
                  >
                    Try again
                  </button>
                </div>
              )}

              {message && paymentStatus === "READY" && (
                <p className="payment-error">{message}</p>
              )}
            </section>
          </div>
        )}

        {paymentStatus === "SUCCESS" && (
          <section className="payment-card success-panel">
            <div className="success-heading">
              <div className="success-icon">✓</div>
              <span className="panel-eyebrow">TRANSACTION COMPLETE</span>
              <h2>Payment successful!</h2>
              <p>{message}</p>
            </div>

            {ticket ? (
              <div className="ticket-print-area">
                <div className="ticket-header">
                  <div>
                    <span className="panel-eyebrow">TRANS-CONNECT</span>
                    <h2>Travel Ticket</h2>
                  </div>
                  <span className="ticket-paid">PAID</span>
                </div>

                <div className="ticket-number">
                  <span>TICKET NUMBER</span>
                  <strong>{ticket.ticket_number || "Not available"}</strong>
                </div>

                <div className="ticket-route">
                  <div>
                    <span>FROM</span>
                    <h3>{ticket.origin}</h3>
                    <small>{formatDate(ticket.departure_time)}</small>
                  </div>

                  <div className="ticket-route-arrow">→</div>

                  <div>
                    <span>TO</span>
                    <h3>{ticket.destination}</h3>
                    <small>{formatDate(ticket.arrival_time)}</small>
                  </div>
                </div>

                <div className="ticket-details-grid">
                  <div>
                    <span>Passenger</span>
                    <strong>{ticket.passenger_name}</strong>
                  </div>

                  <div>
                    <span>Operator</span>
                    <strong>{ticket.operator}</strong>
                  </div>

                  <div>
                    <span>Seats</span>
                    <strong>{ticket.seats}</strong>
                  </div>

                  <div>
                    <span>Booking reference</span>
                    <strong>{booking.booking_reference}</strong>
                  </div>

                  <div>
                    <span>Amount paid</span>
                    <strong>{formatAmount(ticket.amount_paid)}</strong>
                  </div>

                  <div>
                    <span>M-Pesa receipt</span>
                    <strong>{ticket.mpesa_receipt_number || "Not available"}</strong>
                  </div>
                </div>

                <div className="ticket-footer">
                  <span>Payment status: {ticket.payment_status}</span>
                  <span>Present this ticket when boarding.</span>
                </div>
              </div>
            ) : (
              <div className="ticket-unavailable">
                <p>
                  Your payment is marked as successful, but ticket details
                  are not available in this response. Please contact the
                  transport operator or check your booking before travelling.
                </p>
              </div>
            )}

            {ticket && (
              <button
                className="payment-button print-ticket-button"
                onClick={() => window.print()}
              >
                Print ticket
              </button>
            )}

            <button
              className="payment-back-button"
              onClick={() => window.location.assign("/")}
            >
              Return to home
            </button>
          </section>
        )}

        {paymentStatus !== "SUCCESS" && (
          <button
            type="button"
            className="payment-back-button"
            onClick={onBack}
            disabled={loadingPayment}
          >
            Back to bookings
          </button>
        )}

        <p className="payment-security-note">
          Trans-Connect · Your journey, connected.
        </p>
      </div>
    </div>
  );
}
