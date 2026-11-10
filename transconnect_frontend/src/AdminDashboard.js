
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "./services/api";
import "./App.css";

function AdminDashboard() {
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [paymentsError, setPaymentsError] = useState("");
  const [paymentSearch, setPaymentSearch] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedBooking, setSelectedBooking] = useState(null);

  const navigate = useNavigate();

  // Retrieve administrator bookings.
  const getBookings = useCallback(async () => {
    if (!localStorage.getItem("access_token")) {
      navigate("/login");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await api.get("bookings/admin/");

      const data = response.data;

      setBookings(
        Array.isArray(data) ? data : data.results || []
      );
    } catch (err) {
      if (err.response?.status === 401) {
        setError("Your session has expired. Please log in again.");
      } else if (err.response?.status === 403) {
        setError("Access denied. Administrator privileges are required.");
      } else {
        setError("Unable to retrieve bookings. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);
  // Retrieve administrator payment records.
const getPayments = useCallback(async () => {
  if (!localStorage.getItem("access_token")) {
    navigate("/login");
    return;
  }

  try {
    setPaymentsLoading(true);
    setPaymentsError("");

    const response = await api.get("payments/admin/");

    const data = response.data;

    setPayments(
      Array.isArray(data) ? data : data.results || []
    );
  } catch (err) {
    if (err.response?.status === 401) {
      setPaymentsError("Your session has expired. Please log in again.");
    } else if (err.response?.status === 403) {
      setPaymentsError("Administrator privileges are required to view payments.");
    } else {
      setPaymentsError("Unable to retrieve payment records. Please try again.");
    }
  } finally {
    setPaymentsLoading(false);
  }
}, [navigate]);

  useEffect(() => {
    getBookings();
    getPayments();
  }, [getBookings, getPayments]);

  const refreshDashboard = () => {
  getBookings();
  getPayments();
};
  // Booking statistics.
  const statistics = useMemo(() => ({
    total: bookings.length,
    pending: bookings.filter(b => b.status === "PENDING").length,
    confirmed: bookings.filter(b => b.status === "CONFIRMED").length,
    rejected: bookings.filter(b => b.status === "REJECTED").length,
  }), [bookings]);

  // Search and filter.
  const filteredBookings = useMemo(() => {
    return bookings.filter(booking => {
      const query = search.toLowerCase();

      const matchesSearch = [
        booking.passenger_name,
        booking.passenger_email,
        booking.passenger_phone,
        booking.booking_reference,
        booking.operator,
        booking.route,
      ].some(value =>
        String(value || "").toLowerCase().includes(query)
      );

      const matchesStatus =
        statusFilter === "ALL" ||
        booking.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [bookings, search, statusFilter]);

  // Payment statistics.
const paymentStatistics = useMemo(() => ({
  total: payments.length,
  successful: payments.filter(p => p.status === "SUCCESS").length,
  pending: payments.filter(p => p.status === "PENDING").length,
  verified: payments.filter(p => p.safaricom_verified === true).length,
}), [payments]);

// Search and filter payments.
const filteredPayments = useMemo(() => {
  return payments.filter(payment => {
    const query = paymentSearch.toLowerCase();

    const matchesSearch = [
      payment.payment_reference,
      payment.passenger,
      payment.booking_reference,
      payment.mpesa_receipt_number,
    ].some(value =>
      String(value || "").toLowerCase().includes(query)
    );

    const matchesStatus =
      paymentStatusFilter === "ALL" ||
      payment.status === paymentStatusFilter;

    return matchesSearch && matchesStatus;
  });
}, [payments, paymentSearch, paymentStatusFilter]);
  // Confirm or reject booking.
  const updateBooking = async (bookingId, newStatus) => {
    const confirmation =
      newStatus === "CONFIRMED"
        ? "Confirm this booking? Ensure the operator has approved it."
        : "Reject this booking? Its reserved seats will be released.";

    if (!window.confirm(confirmation)) return;

    try {
      setUpdatingId(bookingId);
      setError("");

      await api.patch(
        `bookings/admin/${bookingId}/`,
        { status: newStatus }
      );

      setSelectedBooking(null);
      await getBookings();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Unable to update booking. Please try again."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const formatDate = value => {
    if (!value) return "Not available";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleString("en-KE", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const statusClass = status =>
    `tc-admin-status ${String(status || "").toLowerCase()}`;

  if (loading && bookings.length === 0) {
    return (
      <div className="tc-admin-loading">
        <div className="tc-admin-spinner"></div>
        <h2>Loading administrator dashboard</h2>
        <p>Retrieving booking information...</p>
      </div>
    );
  }

  return (
    <div className="tc-admin-page">

      {/* Header */}
      <header className="tc-admin-header">
        <div>
          <span className="tc-admin-eyebrow">TRANS-CONNECT</span>
          <h1>Administrator Dashboard</h1>
          <p>Manage bookings and monitor platform activity.</p>
        </div>

        <button
          className="tc-admin-refresh"
          onClick={refreshDashboard}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "↻ Refresh"}
        </button>
      </header>

      {error && (
        <div className="tc-admin-error">
          {error}
          {error.includes("log in") && (
            <button onClick={() => navigate("/login")}>
              Log in
            </button>
          )}
        </div>
      )}

      {/* Statistics */}
      <section className="tc-admin-stats">

        <div className="tc-admin-stat-card">
          <span>Total bookings</span>
          <strong>{statistics.total}</strong>
          <small>Bookings retrieved</small>
        </div>

        <div className="tc-admin-stat-card pending-card">
          <span>Pending bookings</span>
          <strong>{statistics.pending}</strong>
          <small>Awaiting review</small>
        </div>

        <div className="tc-admin-stat-card confirmed-card">
          <span>Confirmed bookings</span>
          <strong>{statistics.confirmed}</strong>
          <small>Approved bookings</small>
        </div>

        <div className="tc-admin-stat-card rejected-card">
          <span>Rejected bookings</span>
          <strong>{statistics.rejected}</strong>
          <small>Declined bookings</small>
        </div>

      </section>

      {/* Booking management */}
      <section className="tc-admin-section">

        <div className="tc-admin-section-heading">
          <div>
            <span className="tc-admin-eyebrow">MANAGEMENT</span>
            <h2>Booking management</h2>
            <p>Review passenger requests and manage reservations.</p>
          </div>

          <span className="tc-admin-count">
            {filteredBookings.length} results
          </span>
        </div>

        {/* Search and filters */}
        <div className="tc-admin-toolbar">

          <input
            type="search"
            placeholder="Search passenger, reference, phone or operator..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="REJECTED">Rejected</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

        </div>

        {/* Booking table */}
        {filteredBookings.length === 0 ? (

          <div className="tc-admin-empty">
            <h3>No bookings found</h3>
            <p>
              Try changing your search or status filter.
            </p>
          </div>

        ) : (

          <div className="tc-admin-table-wrapper">
            <table className="tc-admin-table">

              <thead>
                <tr>
                  <th>Passenger</th>
                  <th>Journey</th>
                  <th>Operator</th>
                  <th>Seats</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredBookings.map(booking => (

                  <tr key={booking.id}>

                    <td>
                      <strong>{booking.passenger_name}</strong>
                      <small>{booking.passenger_email}</small>
                      <small>{booking.passenger_phone}</small>
                    </td>

                    <td>
                      {booking.route || "Route unavailable"}
                    </td>

                    <td>
                      {booking.operator || "Not available"}
                    </td>

                    <td>{booking.seats_requested}</td>

                    <td>
                      <span className={statusClass(booking.status)}>
                        {booking.status}
                      </span>
                    </td>

                    <td>
                      <div className="tc-admin-actions">

                        <button
                          className="tc-admin-view"
                          onClick={() => setSelectedBooking(booking)}
                        >
                          View
                        </button>

                        {booking.status === "PENDING" && (
                          <>
                            <button
                              className="tc-admin-confirm"
                              disabled={updatingId === booking.id}
                              onClick={() =>
                                updateBooking(booking.id, "CONFIRMED")
                              }
                            >
                              Confirm
                            </button>

                            <button
                              className="tc-admin-reject"
                              disabled={updatingId === booking.id}
                              onClick={() =>
                                updateBooking(booking.id, "REJECTED")
                              }
                            >
                              Reject
                            </button>
                          </>
                        )}

                      </div>

                      {updatingId === booking.id && (
                        <small>Updating...</small>
                      )}
                    </td>

                  </tr>

                ))}
              </tbody>

            </table>
          </div>

        )}

      </section>
      {/* Payment monitoring */}
<section className="tc-admin-section tc-admin-payments">

  <div className="tc-admin-section-heading">
    <div>
      <span className="tc-admin-eyebrow">FINANCIAL MONITORING</span>
      <h2>Payment monitoring</h2>
      <p>
        Monitor M-Pesa transactions and Safaricom verification results.
      </p>
    </div>

    <button
      className="tc-admin-refresh"
      onClick={getPayments}
      disabled={paymentsLoading}
    >
      {paymentsLoading ? "Refreshing..." : "Refresh payments"}
    </button>
  </div>

  {/* Payment statistics */}
  <div className="tc-admin-stats">

    <div className="tc-admin-stat-card">
      <span>Total payments</span>
      <strong>{paymentStatistics.total}</strong>
      <small>Payment records retrieved</small>
    </div>

    <div className="tc-admin-stat-card confirmed-card">
      <span>Successful payments</span>
      <strong>{paymentStatistics.successful}</strong>
      <small>Transactions marked successful</small>
    </div>

    <div className="tc-admin-stat-card pending-card">
      <span>Pending payments</span>
      <strong>{paymentStatistics.pending}</strong>
      <small>Awaiting transaction results</small>
    </div>

    <div className="tc-admin-stat-card">
      <span>Verified payments</span>
      <strong>{paymentStatistics.verified}</strong>
      <small>Verified by Safaricom</small>
    </div>

  </div>

  {paymentsError && (
    <div className="tc-admin-error">
      {paymentsError}
    </div>
  )}

  {/* Payment search and filter */}
  <div className="tc-admin-toolbar">

    <input
      type="search"
      placeholder="Search passenger, payment reference or M-Pesa receipt..."
      value={paymentSearch}
      onChange={e => setPaymentSearch(e.target.value)}
    />

    <select
      value={paymentStatusFilter}
      onChange={e => setPaymentStatusFilter(e.target.value)}
    >
      <option value="ALL">All payment statuses</option>
      <option value="PENDING">Pending</option>
      <option value="SUCCESS">Successful</option>
      <option value="FAILED">Failed</option>
      <option value="CANCELLED">Cancelled</option>
    </select>

  </div>

  {paymentsLoading && payments.length === 0 ? (

    <div className="tc-admin-empty">
      <h3>Loading payment records...</h3>
      <p>Please wait while payment information is retrieved.</p>
    </div>

  ) : filteredPayments.length === 0 ? (

    <div className="tc-admin-empty">
      <h3>No payment records found</h3>
      <p>
        Try changing your search or payment status filter.
      </p>
    </div>

  ) : (

    <div className="tc-admin-table-wrapper">
      <table className="tc-admin-table">

        <thead>
          <tr>
            <th>Payment reference</th>
            <th>Passenger</th>
            <th>Amount</th>
            <th>M-Pesa receipt</th>
            <th>Transaction status</th>
            <th>Verification</th>
          </tr>
        </thead>

        <tbody>
          {filteredPayments.map(payment => (

            <tr key={payment.id}>

              <td>
                <strong>{payment.payment_reference || `PAY-${payment.id}`}</strong>
                <small>Payment ID: {payment.id}</small>
              </td>

              <td>
                <strong>{payment.passenger || "Not available"}</strong>
                <small>
                  Booking: {payment.booking_reference || "Unavailable"}
                </small>
              </td>

              <td>
                <strong>
                  KSh {Number(payment.amount || 0).toLocaleString("en-KE", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </strong>
              </td>

              <td>
                {payment.mpesa_receipt_number || "Not received"}
              </td>

              <td>
                <span className={`tc-admin-status ${String(payment.status || "").toLowerCase()}`}>
                  {payment.status}
                </span>
              </td>

              <td>
                <span className={`tc-admin-verification ${
                  payment.safaricom_verified ? "verified" : "not-verified"
                }`}>
                  {payment.safaricom_verified
                    ? "Verified"
                    : "Not verified"}
                </span>
              </td>

            </tr>

          ))}
        </tbody>

      </table>
    </div>

  )}

  <div className="tc-admin-payment-footer">
    Showing {filteredPayments.length} of {payments.length} payment records
  </div>

</section>
      {/* Booking details modal */}
      {selectedBooking && (
        <div
          className="tc-admin-modal-overlay"
          onClick={() => setSelectedBooking(null)}
        >
          <div
            className="tc-admin-modal"
            onClick={e => e.stopPropagation()}
          >

            <div className="tc-admin-modal-heading">
              <div>
                <span className="tc-admin-eyebrow">BOOKING DETAILS</span>
                <h2>Passenger reservation</h2>
              </div>

              <button
                onClick={() => setSelectedBooking(null)}
                aria-label="Close booking details"
              >
                ×
              </button>
            </div>

            <div className="tc-admin-detail-grid">

              <div>
                <span>Booking reference</span>
                <strong>{selectedBooking.booking_reference}</strong>
              </div>

              <div>
                <span>Passenger</span>
                <strong>{selectedBooking.passenger_name}</strong>
              </div>

              <div>
                <span>Email</span>
                <strong>{selectedBooking.passenger_email}</strong>
              </div>

              <div>
                <span>Phone</span>
                <strong>{selectedBooking.passenger_phone}</strong>
              </div>

              <div>
                <span>Transport operator</span>
                <strong>{selectedBooking.operator}</strong>
              </div>

              <div>
                <span>Journey</span>
                <strong>{selectedBooking.route}</strong>
              </div>

              <div>
                <span>Seats requested</span>
                <strong>{selectedBooking.seats_requested}</strong>
              </div>

              <div>
                <span>Booking status</span>
                <strong>
                  <span className={statusClass(selectedBooking.status)}>
                    {selectedBooking.status}
                  </span>
                </strong>
              </div>

              <div>
                <span>Confirmation reference</span>
                <strong>
                  {selectedBooking.operator_confirmation_reference || "Not provided"}
                </strong>
              </div>

              <div>
                <span>Booking date</span>
                <strong>{formatDate(selectedBooking.created_at)}</strong>
              </div>

            </div>

            {selectedBooking.status === "PENDING" && (
              <div className="tc-admin-modal-actions">

                <button
                  className="tc-admin-confirm"
                  disabled={updatingId === selectedBooking.id}
                  onClick={() =>
                    updateBooking(selectedBooking.id, "CONFIRMED")
                  }
                >
                  Confirm booking
                </button>

                <button
                  className="tc-admin-reject"
                  disabled={updatingId === selectedBooking.id}
                  onClick={() =>
                    updateBooking(selectedBooking.id, "REJECTED")
                  }
                >
                  Reject booking
                </button>

              </div>
            )}

          </div>
        </div>
      )}

      <footer className="tc-admin-footer">
        Trans-Connect Administration · Booking Management
      </footer>

    </div>
  );
}

export default AdminDashboard;
