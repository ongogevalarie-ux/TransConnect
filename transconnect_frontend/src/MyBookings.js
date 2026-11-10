
import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "./services/api";

export default function MyBookings() {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("bookings/");
      const data = response.data;

      // Supports both paginated and ordinary DRF list responses.
      const records = Array.isArray(data) ? data : data.results || [];
      setBookings(records);
    } catch (err) {
      console.error("Unable to retrieve bookings:", err);

      setError(
        err.response?.data?.detail ||
        "Unable to load your bookings. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

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
      return "Not available";
    }

    return `KSh ${Number(value).toLocaleString("en-KE")}`;
  };

  const getPaymentStatus = (booking) => {
    const status =
      booking.payment_status ||
      booking.payment?.status ||
      booking.latest_payment_status;

    if (status) return String(status).toUpperCase();

    if (booking.status !== "CONFIRMED") {
      return "NOT AVAILABLE";
    }

    return "NOT PAID";
  };

  const getBookingClass = (status) => {
    return String(status || "UNKNOWN").toLowerCase();
  };

  const filteredBookings = bookings.filter((booking) => {
    if (filter === "ALL") return true;

    if (filter === "PAID") {
      return ["SUCCESS", "PAID"].includes(getPaymentStatus(booking));
    }

    if (filter === "UNPAID") {
      return ["NOT PAID", "PENDING", "FAILED"].includes(
        getPaymentStatus(booking)
      );
    }

    return booking.status === filter;
  });

  const paidCount = bookings.filter((booking) =>
    ["SUCCESS", "PAID"].includes(getPaymentStatus(booking))
  ).length;

  const unpaidCount = bookings.filter((booking) =>
    ["NOT PAID", "PENDING", "FAILED"].includes(getPaymentStatus(booking))
  ).length;

  return (
    <main className="my-bookings-page">
      <div className="my-bookings-container">

        <header className="my-bookings-header">
          <div>
            <span className="my-bookings-eyebrow">TRANS-CONNECT</span>
            <h1>My Bookings</h1>
            <p>Manage your reservations and keep track of your journeys.</p>
          </div>

          <button
            className="bookings-refresh-button"
            onClick={fetchBookings}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "↻ Refresh"}
          </button>
        </header>

        <section className="booking-overview">
          <div className="overview-card">
            <span>Total bookings</span>
            <strong>{bookings.length}</strong>
          </div>

          <div className="overview-card">
            <span>Paid bookings</span>
            <strong>{paidCount}</strong>
          </div>

          <div className="overview-card">
            <span>Awaiting payment</span>
            <strong>{unpaidCount}</strong>
          </div>
        </section>

        <section className="bookings-list-section">
          <div className="bookings-list-heading">
            <div>
              <h2>Your reservations</h2>
              <p>View your booking and payment information below.</p>
            </div>

            <span>{filteredBookings.length} booking(s)</span>
          </div>

          <div className="booking-filters">
            {[
              "ALL",
              "CONFIRMED",
              "PENDING",
              "PAID",
              "UNPAID",
              "CANCELLED",
              "REJECTED",
            ].map((item) => (
              <button
                key={item}
                className={filter === item ? "active" : ""}
                onClick={() => setFilter(item)}
              >
                {item === "ALL"
                  ? "All"
                  : item.charAt(0) + item.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="bookings-message">
              <div className="loading-spinner"></div>
              <p>Loading your bookings...</p>
            </div>
          ) : error ? (
            <div className="bookings-error">
              <p>{error}</p>
              <button onClick={fetchBookings}>Try again</button>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="bookings-empty">
              <div className="empty-booking-icon">▤</div>
              <h3>No bookings found</h3>
              <p>
                {bookings.length === 0
                  ? "You have not made any bookings yet."
                  : "There are no bookings matching this filter."}
              </p>

              {bookings.length === 0 && (
                <button onClick={() => navigate("/")}>
                  Find a journey
                </button>
              )}
            </div>
          ) : (
            <div className="my-bookings-list">
              {filteredBookings.map((booking) => {
                const paymentStatus = getPaymentStatus(booking);
                const isPaid = ["SUCCESS", "PAID"].includes(paymentStatus);
                const canPay =
                  booking.status === "CONFIRMED" && !isPaid;

                return (
                  <article className="my-booking-card" key={booking.id}>
                    <div className="my-booking-top">
                      <div>
                        <span className="booking-reference-label">
                          BOOKING REFERENCE
                        </span>
                        <strong className="my-booking-reference">
                          {booking.booking_reference || `#${booking.id}`}
                        </strong>
                      </div>

                      <span
                        className={`booking-status ${getBookingClass(
                          booking.status
                        )}`}
                      >
                        {booking.status || "UNKNOWN"}
                      </span>
                    </div>

                    <div className="my-booking-route">
                      <div>
                        <span>FROM</span>
                        <h3>{booking.origin || "Not available"}</h3>
                        <p>{formatDate(booking.departure_time)}</p>
                      </div>

                      <span className="my-booking-arrow">→</span>

                      <div>
                        <span>TO</span>
                        <h3>{booking.destination || "Not available"}</h3>
                        <p>{formatDate(booking.arrival_time)}</p>
                      </div>
                    </div>

                    <div className="my-booking-details">
                      <div>
                        <span>Operator</span>
                        <strong>{booking.operator || "Not available"}</strong>
                      </div>

                      <div>
                        <span>Seats</span>
                        <strong>
                          {booking.selected_seats?.join(", ") ||
                            booking.seats_requested ||
                            "Not available"}
                        </strong>
                      </div>

                      <div>
                        <span>Total fare</span>
                        <strong>{formatAmount(booking.total_amount)}</strong>
                      </div>

                      <div>
                        <span>Payment status</span>
                        <strong
                          className={
                            isPaid
                              ? "payment-label-paid"
                              : "payment-label-unpaid"
                          }
                        >
                          {paymentStatus}
                        </strong>
                      </div>
                    </div>

                    <div className="my-booking-actions">
                      {canPay && (
                        <button
                          className="booking-pay-button"
                          onClick={() => navigate(`/pay/${booking.id}`)}
                        >
                          Pay Now
                        </button>
                      )}

                      {isPaid && (
                        <button
                          className="booking-ticket-button"
                          onClick={() => navigate(`/pay/${booking.id}`)}
                        >
                          View Payment
                        </button>
                      )}

                      {!canPay && !isPaid && (
                        <span className="booking-waiting-note">
                          {booking.status === "CONFIRMED"
                            ? "Payment not yet completed"
                            : "Awaiting booking confirmation"}
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
