import React from "react";
import "./App.css";

function About() {
  return (
    <div className="tc-about-page">
      <section className="tc-about-hero" style={{
    backgroundImage: `
      linear-gradient(
        90deg,
        rgba(5, 19, 43, 0.94) 0%,
        rgba(5, 19, 43, 0.82) 48%,
        rgba(5, 19, 43, 0.42) 100%
      ),
      url("${process.env.PUBLIC_URL}/images/kenyan-coach.jpg")
    `,
    backgroundPosition: "center 48%",
    backgroundSize: "cover",
    backgroundRepeat: "no-repeat",
  }}>
        <span>ABOUT TRANS-CONNECT</span>
        <h1>Connecting journeys across Kenya.</h1>
        <p>
          Your journey begins with better transport information.
          Discover routes, compare available schedules and fares,
          and connect with transport operators through one platform.
        </p>
      </section>

      <section className="tc-about-content">
        <div>
          <span className="tc-section-label">WHO WE ARE</span>
          <h2>Making travel information easier to access.</h2>
          <p>
            Trans-Connect is an integrated public transport
            information system designed to bring information from
            different transport companies together.
          </p>
          <p>
            Instead of visiting multiple websites to find journey
            information, passengers can explore available transport
            options from one convenient platform.
          </p>
        </div>

        <div className="tc-about-highlight">
          <h3>One platform. Multiple operators. Easier journeys.</h3>
          <p>
            Find the information you need before choosing your
            preferred transport provider.
          </p>
        </div>
      </section>

      <section className="tc-about-features">
        <h2>What Trans-Connect offers</h2>

        <div className="tc-about-grid">
          <article>
            <h3>Route Information</h3>
            <p>
              Explore available routes between different
              destinations.
            </p>
          </article>

          <article>
            <h3>Fare Information</h3>
            <p>
              View available transport fares before making
              your travel decision.
            </p>
          </article>

          <article>
            <h3>Travel Schedules</h3>
            <p>
              Access departure and arrival information from
              participating operators.
            </p>
          </article>

          <article>
            <h3>Convenient Booking</h3>
            <p>
              Make reservations through the platform and
              access supported payment services.
            </p>
          </article>
        </div>
      </section>
    </div>
  );
}

export default About;