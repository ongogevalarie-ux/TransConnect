
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

  // Fetch booking details when the payment page opens.
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
          "Unable to retrieve your booking. Please check the booking ID and try again."
        );
      } finally {
        setLoadingBooking(false);
      }
    };

    if (bookingId) {
      fetchBooking();
    }
  }, [bookingId]);

  // Initiate M-Pesa payment.
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

  // Verify payment with the Django backend.
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
        <div className="payment-card">
          <h2>Loading Booking Details...</h2>
          <p>Please wait while we retrieve your journey information.</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="payment-page">
        <div className="payment-card">
          <h2>Booking Not Found</h2>
          <p>{message}</p>

          <button
            className="payment-back-button"
            onClick={onBack}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const totalAmount = booking.total_amount;

  return (
    <div className="payment-page">
      <div className="payment-card">

        <div className="payment-heading">
          <h1>Complete Your Payment</h1>
          <p>Secure your journey with Trans-Connect.</p>
        </div>

        {paymentStatus !== "SUCCESS" && (
          <div className="payment-summary">
            <h2>Booking Summary</h2>

            <p>
              <strong>Booking Reference:</strong>{" "}
              {booking.booking_reference}
            </p>

            <p>
              <strong>Passenger:</strong>{" "}
              {booking.passenger_name}
            </p>

            <p>
              <strong>Email:</strong>{" "}
              {booking.passenger_email}
            </p>

            <p>
              <strong>Phone:</strong>{" "}
              {booking.passenger_phone}
            </p>

            <hr />

            <h3>Journey Details</h3>

            <p>
              <strong>Operator:</strong> {booking.operator}
            </p>

            <p>
              <strong>Route:</strong>{" "}
              {booking.origin} → {booking.destination}
            </p>

            <p>
              <strong>Departure:</strong>{" "}
              {booking.departure_time}
            </p>

            <p>
              <strong>Arrival:</strong>{" "}
              {booking.arrival_time}
            </p>

            <p>
              <strong>Seats:</strong>{" "}
              {booking.selected_seats?.join(", ") || "Not available"}
            </p>

            <p>
              <strong>Booking Status:</strong>{" "}
              {booking.status}
            </p>

            <div className="payment-amount">
              <span>
                Total Amount ({booking.seats_requested} seat(s))
              </span>

              <strong>
                {totalAmount !== null && totalAmount !== undefined
                  ? `KSh ${Number(totalAmount).toLocaleString("en-KE")}`
                  : "Fare unavailable"}
              </strong>
            </div>
          </div>
        )}

        {paymentStatus === "READY" && (
          <>
            {booking.status === "CONFIRMED" ? (
              <form onSubmit={handleInitiatePayment}>
                <h2>M-Pesa Payment</h2>

                <p>
                  Enter the phone number that should receive the
                  M-Pesa payment prompt.
                </p>

                <label htmlFor="phoneNumber">
                  M-Pesa Phone Number
                </label>

                <input
                  id="phoneNumber"
                  type="tel"
                  placeholder="e.g. 0712345678"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                />

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
                    : "Pay with M-Pesa"}
                </button>
              </form>
            ) : (
              <div className="payment-feedback pending">
                <h2>Booking Awaiting Confirmation</h2>
                <p>
                  Payment will be available once the operator
                  confirms your booking.
                </p>
              </div>
            )}
          </>
        )}

        {paymentStatus === "PENDING" && (
          <div className="payment-feedback pending">
            <div className="payment-symbol">...</div>

            <h2>Payment Processing</h2>

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
              {loadingPayment
                ? "Checking..."
                : "Check Payment Status"}
            </button>
          </div>
        )}

        {paymentStatus === "FAILED" && (
          <div className="payment-feedback failed">
            <div className="payment-symbol">!</div>

            <h2>Payment Not Completed</h2>

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
              Try Again
            </button>
          </div>
        )}

        {paymentStatus === "SUCCESS" && (
          <div className="payment-feedback successful">
            <div className="payment-symbol">✓</div>

            <h2>Payment Successful!</h2>

            <p>{message}</p>

            {ticket && (
              <div className="ticket-summary">
                <h3>Your Ticket Details</h3>

                <p>
                  <strong>Ticket Number:</strong>{" "}
                  {ticket.ticket_number}
                </p>

                <p>
                  <strong>Passenger:</strong>{" "}
                  {ticket.passenger_name}
                </p>

                <p>
                  <strong>Operator:</strong> {ticket.operator}
                </p>

                <p>
                  <strong>Route:</strong>{" "}
                  {ticket.origin} → {ticket.destination}
                </p>

                <p>
                  <strong>Departure:</strong>{" "}
                  {ticket.departure_time}
                </p>

                <p>
                  <strong>Arrival:</strong>{" "}
                  {ticket.arrival_time}
                </p>

                <p>
                  <strong>Seats:</strong> {ticket.seats}
                </p>

                <p>
                  <strong>Amount Paid:</strong>{" "}
                  KSh {Number(ticket.amount_paid).toLocaleString("en-KE")}
                </p>

                <p>
                  <strong>M-Pesa Receipt:</strong>{" "}
                  {ticket.mpesa_receipt_number || "Not available"}
                </p>

                <p>
                  <strong>Payment Status:</strong>{" "}
                  {ticket.payment_status}
                </p>
              </div>
            )}

            <button
              className="payment-button"
              onClick={() => window.location.assign("/")}
            >
              Return Home
            </button>
          </div>
        )}

        {message && paymentStatus === "READY" && (
          <p className="payment-error">{message}</p>
        )}

        {paymentStatus !== "SUCCESS" && (
          <button
            type="button"
            className="payment-back-button"
            onClick={onBack}
            disabled={loadingPayment}
          >
            Back
          </button>
        )}

      </div>
    </div>
  );
}
