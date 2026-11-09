
import React from "react";
import {
  Navigate,
  useNavigate,
  useParams,
} from "react-router-dom";

import PaymentStatus from "./paymentstatus";

export default function PaymentPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();

  if (!localStorage.getItem("access_token")) {
    return <Navigate to="/login" replace />;
  }

  return (
    <PaymentStatus
      bookingId={bookingId}
      onBack={() => navigate(-1)}
    />
  );
}
