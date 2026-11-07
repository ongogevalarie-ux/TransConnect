
import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./App.css";

const API_URL = "http://127.0.0.1:8000/api/bookings/admin/";

function AdminDashboard() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const navigate = useNavigate();

  const getBookings = useCallback(async () => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await axios.get(API_URL, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Supports both normal lists and paginated DRF responses.
      const data = response.data;
      setBookings(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      if (err.response?.status === 401) {
        setError("Your login session has expired. Please log in again.");
      } else if (err.response?.status === 403) {
        setError("Access denied. This page is only available to administrators.");
      } else {
        setError("Unable to load bookings. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    getBookings();
  }, [getBookings]);

  const updateBooking = async (bookingId, status) => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      navigate("/login");
      return;
    }

    const message =
      status === "CONFIRMED"
        ? "Confirm this booking? Only proceed if the operator has confirmed it."
        : "Reject this booking?";

    if (!window.confirm(message)) return;

    try {
      setUpdatingId(bookingId);
      setError("");

      await axios.patch(
        `${API_URL}${bookingId}/`,
        { status },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      await getBookings();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to update this booking. Please try again."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const pending = bookings.filter((b) => b.status === "PENDING").length;
  const confirmed = bookings.filter((b) => b.status === "CONFIRMED").length;
  const rejected = bookings.filter((b) => b.status === "REJECTED").length;

  const getStatusClass = (status) => {
    return `booking-status ${status.toLowerCase()}`;
  };

  if (loading) {
    return <div className="admin-page">Loading bookings...</div>;
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <p className="admin-eyebrow">TRANS-CONNECT</p>
          <h1>Admin Dashboard</h1>
          <p>Booking Management Dashboard</p>
        </div>

        <button className="refresh-button" onClick={getBookings}>
          Refresh
        </button>
      </div>

      {error && <div className="admin-error">{error}</div>}

      <div className="admin-stats">
        <div className="admin-stat-card">
          <span>Total Bookings</span>
          <strong>{bookings.length}</strong>
        </div>

        <div className="admin-stat-card">
          <span>Pending</span>
          <strong>{pending}</strong>
        </div>

        <div className="admin-stat-card">
          <span>Confirmed</span>
          <strong>{confirmed}</strong>
        </div>

        <div className="admin-stat-card">
          <span>Rejected</span>
          <strong>{rejected}</strong>
        </div>
      </div>

      <section className="admin-bookings-section">
        <div className="admin-section-heading">
          <div>
            <h2>Recent Bookings</h2>
            <p>Review and manage passenger booking requests.</p>
          </div>
          <span>{bookings.length} bookings</span>
        </div>

        {bookings.length === 0 ? (
          <div className="empty-bookings">
            No bookings have been submitted yet.
          </div>
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-bookings-table">
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
                {bookings.map((booking) => (
                  <tr key={booking.id}>
                    <td>
                      <strong>{booking.passenger_name}</strong>
                      <small>{booking.passenger_email}</small>
                      <small>{booking.passenger_phone}</small>
                    </td>

                    <td>{booking.route || "Route unavailable"}</td>
                    <td>{booking.operator || "Not available"}</td>
                    <td>{booking.seats_requested}</td>

                    <td>
                      <span className={getStatusClass(booking.status)}>
                        {booking.status}
                      </span>
                    </td>

                    <td>
                      {booking.status === "PENDING" ? (
                        <div className="booking-actions">
                          <button
                            className="confirm-button"
                            disabled={updatingId === booking.id}
                            onClick={() =>
                              updateBooking(booking.id, "CONFIRMED")
                            }
                          >
                            Confirm
                          </button>

                          <button
                            className="reject-button"
                            disabled={updatingId === booking.id}
                            onClick={() =>
                              updateBooking(booking.id, "REJECTED")
                            }
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="no-action">No actions</span>
                      )}

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
    </div>
  );
}

export default AdminDashboard;
