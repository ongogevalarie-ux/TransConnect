import React, { useState } from "react";
import "./App.css";

function Contact() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const [notice, setNotice] = useState("");

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    setNotice(
      "The contact form is ready for backend integration. Messages are not being sent yet."
    );
  };

  return (
    <div className="tc-contact-page">
      <section className="tc-contact-hero">
        <span>WE ARE HERE TO HELP</span>
        <h1>Let's talk about your journey.</h1>
        <p>
          Have a question, suggestion or feedback about Trans-Connect?
          We'd like to hear from you.
        </p>
      </section>

      <section className="tc-contact-content">
        <div className="tc-contact-info">
          <span className="tc-section-label">GET IN TOUCH</span>
          <h2>How can we help?</h2>
          <p>
            Use the contact form to share your questions, report an
            issue or suggest improvements to the platform.
          </p>

          <div className="tc-contact-info-card">
            <span className="tc-contact-icon">01</span>
            <div>
              <h3>General enquiries</h3>
              <p>
                Ask questions about the services and information
                available on Trans-Connect.
              </p>
            </div>
          </div>

          <div className="tc-contact-info-card">
            <span className="tc-contact-icon">02</span>
            <div>
              <h3>Technical support</h3>
              <p>
                Report problems experienced while searching routes,
                making bookings or checking payments.
              </p>
            </div>
          </div>

          <div className="tc-contact-info-card">
            <span className="tc-contact-icon">03</span>
            <div>
              <h3>Operator enquiries</h3>
              <p>
                Share enquiries about transport operators and
                their information on the platform.
              </p>
            </div>
          </div>
        </div>

        <div className="tc-contact-form-card">
          <h2>Send us a message</h2>
          <p>Fill in the details below.</p>

          <form onSubmit={handleSubmit}>
            <label htmlFor="contact-name">Your name</label>
            <input
              id="contact-name"
              type="text"
              name="name"
              placeholder="Enter your name"
              value={form.name}
              onChange={handleChange}
              required
            />

            <label htmlFor="contact-email">Email address</label>
            <input
              id="contact-email"
              type="email"
              name="email"
              placeholder="Enter your email"
              value={form.email}
              onChange={handleChange}
              required
            />

            <label htmlFor="contact-subject">Subject</label>
            <input
              id="contact-subject"
              type="text"
              name="subject"
              placeholder="What is your enquiry about?"
              value={form.subject}
              onChange={handleChange}
              required
            />

            <label htmlFor="contact-message">Message</label>
            <textarea
              id="contact-message"
              name="message"
              placeholder="Write your message here..."
              rows="5"
              value={form.message}
              onChange={handleChange}
              required
            />

            <button type="submit">
              Submit message
            </button>
          </form>

          {notice && (
            <p className="tc-contact-notice" role="status">
              {notice}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

export default Contact;