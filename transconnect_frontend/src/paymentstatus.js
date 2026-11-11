
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

  const retrieveTicket = async () => {
    try {
      const response = await api.get(
        `payments/bookings/${bookingId}/ticket/`
      );

      if (response.data?.ticket) {
  setTicket(response.data.ticket);

  setBooking((previous) => ({
    ...previous,
    status: response.data.ticket.booking_status || "CONFIRMED",
  }));

  setPaymentStatus("SUCCESS");
        setMessage(
          response.data.message ||
          "Your verified ticket has been retrieved."
        );
        return true;
      }

      return false;
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error("Ticket retrieval failed:", error);
      }

      return false;
    }
  };

  useEffect(() => {
    const fetchBooking = async () => {
      setLoadingBooking(true);
      setMessage("");

      try {
        const response = await api.get(`bookings/${bookingId}/`);

        setBooking(response.data);
        setPhoneNumber(response.data.passenger_phone || "");

        await retrieveTicket();
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

  const formatAmount = (value) => {
    if (value === null || value === undefined || value === "") {
      return "Fare unavailable";
    }

    return `KSh ${Number(value).toLocaleString("en-KE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatTime = (value) => {
    if (!value) return "Not available";

    if (/^\d{2}:\d{2}/.test(value)) {
      return value.slice(0, 5);
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleString("en-KE", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const handleInitiatePayment = async (e) => {
    e.preventDefault();

    if (!phoneNumber.trim()) {
      setMessage("Please enter your M-Pesa phone number.");
      return;
    }

    if (
  !booking ||
  !["PENDING", "CONFIRMED"].includes(booking.status)
) {
  setMessage(
    "This booking cannot be paid for because it has been rejected or cancelled."
  );
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

      if (data.payment_id) {
        setPaymentId(data.payment_id);
      }

      if (data.amount) {
        setBooking((previous) => ({
          ...previous,
          total_amount: data.amount,
        }));
      }

      if (data.status === "SUCCESS") {
        setPaymentStatus("SUCCESS");
        setMessage("Payment already completed. Retrieving your ticket...");

        const retrieved = await retrieveTicket();

        if (!retrieved) {
          setMessage(
            "Payment is successful, but ticket retrieval is temporarily unavailable. Please try again."
          );
        }
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
        const retrieved = await retrieveTicket();

        if (!retrieved) {
          setPaymentStatus("SUCCESS");
          setMessage(
            "Payment verified successfully, but ticket retrieval is temporarily unavailable. Please try again."
          );
        }
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
          <p>Retrieving your journey details...</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="payment-page">
        <div className="payment-card">
          <h2>Booking not found</h2>
          <p className="payment-error">{message}</p>
          <button className="payment-back-button" onClick={onBack}>
            Go back
          </button>
        </div>
      </div>
    );
  }

  const farePerSeat = booking.fare_per_seat;
  const totalAmount = booking.total_amount;
  const seatCount = Number(booking.seats_requested || 0);

  return (
    <div className="payment-page">
      <div className="payment-container">

        <header className="payment-top">
          <div>
            <span className="payment-eyebrow">TRANS-CONNECT CHECKOUT</span>
            <h1>Complete your payment</h1>
            <p>Review your booking and pay securely using M-Pesa.</p>
          </div>

          <div className="secure-label">
            <span>✓</span> Secure checkout
          </div>
        </header>

        {paymentStatus !== "SUCCESS" && (
          <>
            <div className="checkout-progress">
              <div className="checkout-step completed">
                <span>✓</span>
                <div>
                  <strong>Booking</strong>
                  <small>Reservation created</small>
                </div>
              </div>

              <div className="checkout-progress-line"></div>

              <div className={`checkout-step ${
                paymentStatus === "PENDING" ? "completed" : "active"
              }`}>
                <span>2</span>
                <div>
                  <strong>Payment</strong>
                  <small>Complete checkout</small>
                </div>
              </div>

              <div className="checkout-progress-line"></div>

              <div className="checkout-step">
                <span>3</span>
                <div>
                  <strong>Ticket</strong>
                  <small>Receive your ticket</small>
                </div>
              </div>
            </div>

            <div className="payment-layout">

              {/* BOOKING SUMMARY */}

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
                  <div>
                    <span>BOOKING REFERENCE</span>
                    <strong>
                      {booking.booking_reference || `#${booking.id}`}
                    </strong>
                  </div>
                  <span className="reference-tag">TRANS-CONNECT</span>
                </div>

                <div className="journey-visual">
                  <div className="journey-point">
                    <span className="journey-dot"></span>
                    <div>
                      <span>DEPARTURE</span>
                      <h3>{booking.origin || "Origin unavailable"}</h3>
                      <p>{formatTime(booking.departure_time)}</p>
                    </div>
                  </div>

                  <div className="journey-line">
                    <span>YOUR JOURNEY</span>
                  </div>

                  <div className="journey-point">
                    <span className="journey-dot destination-dot"></span>
                    <div>
                      <span>ARRIVAL</span>
                      <h3>{booking.destination || "Destination unavailable"}</h3>
                      <p>{formatTime(booking.arrival_time)}</p>
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
                    <strong>{seatCount}</strong>
                  </div>

                  <div className="booking-info-item">
                    <span>Selected seats</span>
                    <strong>
                      {booking.selected_seats?.join(", ") || "Not available"}
                    </strong>
                  </div>

                  <div className="booking-info-item">
                    <span>Passenger</span>
                    <strong>{booking.passenger_name || "Not available"}</strong>
                  </div>

                  <div className="booking-info-item">
                    <span>Email address</span>
                    <strong>{booking.passenger_email || "Not available"}</strong>
                  </div>

                  <div className="booking-info-item">
                    <span>Contact number</span>
                    <strong>{booking.passenger_phone || "Not available"}</strong>
                  </div>
                </div>

                <div className="fare-breakdown">
                  <h3>Fare breakdown</h3>

                  <div className="fare-row">
                    <span>Fare per seat</span>
                    <strong>{formatAmount(farePerSeat)}</strong>
                  </div>

                  <div className="fare-row">
                    <span>Number of seats</span>
                    <strong>× {seatCount}</strong>
                  </div>

                  <div className="fare-total">
                    <div>
                      <span>Total amount payable</span>
                      <small>Includes all selected seats</small>
                    </div>

                    <strong>{formatAmount(totalAmount)}</strong>
                  </div>
                </div>
              </section>

              {/* PAYMENT PANEL */}

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

                    {["PENDING", "CONFIRMED"].includes(booking.status) ? (
                    <form onSubmit={handleInitiatePayment}>
                        <div className="checkout-amount">
                          <span>AMOUNT TO PAY</span>
                          <strong>{formatAmount(totalAmount)}</strong>
                          <small>Pay using your M-Pesa registered number</small>
                        </div>

                        <label htmlFor="phoneNumber">
                          M-Pesa phone number
                        </label>

                        <div className="mpesa-phone-input">
                          <span>KE</span>
                          <input
                            id="phoneNumber"
                            type="tel"
                            placeholder="0712345678"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            required
                          />
                        </div>

                        <p className="phone-helper">
                          You will receive an M-Pesa payment prompt on this number.
                        </p>

                        <div className="instruction-card">
                          <h3>How to complete payment</h3>

                          <ol>
                            <li>
                              <span>1</span>
                              Enter the M-Pesa phone number you want to pay with.
                            </li>
                            <li>
                              <span>2</span>
                              Tap the button below to request payment.
                            </li>
                            <li>
                              <span>3</span>
                              Check your phone for the M-Pesa STK prompt.
                            </li>
                            <li>
                              <span>4</span>
                              Confirm the displayed amount and enter your M-Pesa PIN in the official prompt.
                            </li>
                            <li>
                              <span>5</span>
                              Return here and check your payment status.
                            </li>
                          </ol>
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
                            : `Pay ${formatAmount(totalAmount)} with M-Pesa`}
                        </button>

                        <p className="payment-disclaimer">
                          Only proceed if the amount and phone number are correct.
                          Never share your M-Pesa PIN with anyone.
                        </p>
                      </form>
                    ) : (
                      <div className="payment-feedback failed">
                        <div className="payment-symbol">!</div>
                        <h2>Booking unavailable</h2>
                        <p>
                            This booking cannot be paid for because it has been
                            rejected or cancelled. Please contact support.
                        </p>
                      </div>
                    )}
                  </>
                )}

                {paymentStatus === "PENDING" && (
                  <div className="payment-feedback pending">
                    <div className="payment-symbol">...</div>
                    <span className="panel-eyebrow">M-PESA REQUEST SENT</span>
                    <h2>Check your phone</h2>
                    <p>{message}</p>

                    <div className="pending-payment-summary">
                      <span>Amount requested</span>
                      <strong>{formatAmount(totalAmount)}</strong>
                      <span>Payment number</span>
                      <strong>{phoneNumber}</strong>
                    </div>

                    <div className="instruction-card">
                      <h3>What to do next</h3>
                      <p>
                        Complete the M-Pesa prompt on your phone. Once finished,
                        return here and check your payment status.
                      </p>
                    </div>

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
          </>
        )}

        {/* VERIFIED PAYMENT AND TICKET */}

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
                    <small>{formatTime(ticket.departure_time)}</small>
                  </div>

                  <div className="ticket-route-arrow">→</div>

                  <div>
                    <span>TO</span>
                    <h3>{ticket.destination}</h3>
                    <small>{formatTime(ticket.arrival_time)}</small>
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
                    <span>Selected seats</span>
                    <strong>
                      {ticket.selected_seats?.join(", ") || ticket.seats}
                    </strong>
                  </div>

                  <div>
                    <span>Booking reference</span>
                    <strong>
                      {ticket.booking_reference || booking.booking_reference}
                    </strong>
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
                  are not available yet. Please try retrieving your ticket
                  again before travelling.
                </p>

                <button
                  className="payment-button"
                  onClick={retrieveTicket}
                >
                  Retrieve ticket
                </button>
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
