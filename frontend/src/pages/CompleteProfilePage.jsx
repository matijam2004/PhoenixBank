import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { customersAPI } from "../services/api/customers";
import { useUser } from "../hooks/auth";
import { useOAuthToken } from "../hooks/useOAuthToken";
import { authAPI } from "../services/api/auth";
import "../styles/auth.css";
import "../styles/navbar.css";

function CompleteProfilePage() {
  const isProcessingToken = useOAuthToken(); // Extract token from URL if present
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: user, isLoading: userLoading } = useUser();

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    street: "",
    city: "",
    state: "",
    zip: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Pre-fill form with existing data if available
  useEffect(() => {
    if (user) {
      // Format phone number if it exists
      let formattedPhone = "";
      if (user.phone) {
        const phoneDigits = user.phone.replace(/\D/g, "");
        if (phoneDigits.length === 10) {
          formattedPhone = `(${phoneDigits.slice(0, 3)}) ${phoneDigits.slice(
            3,
            6
          )}-${phoneDigits.slice(6)}`;
        } else {
          formattedPhone = user.phone;
        }
      }

      setFormData((prev) => ({
        first_name: prev.first_name || "", // Preserve user input
        last_name: prev.last_name || "", // Preserve user input
        phone: formattedPhone || prev.phone,
        street: user.street || prev.street || "",
        city: user.city || prev.city || "",
        state: user.state || prev.state || "",
        zip: user.zip || prev.zip || "",
      }));
    }
  }, [user]);

  useEffect(() => {
    if (!userLoading && user) {
      if (
        user.first_name &&
        user.last_name &&
        user.phone &&
        user.street &&
        user.city &&
        user.state &&
        user.zip
      ) {
        // Profile is already complete, redirect to dashboard
        navigate("/dashboard", { replace: true });
      }
    }
  }, [user, userLoading, navigate]);

  // Format phone number as user types
  const formatPhoneNumber = (value) => {
    // Remove all non-digit characters
    const phoneNumber = value.replace(/\D/g, "");

    // Format as (XXX) XXX-XXXX
    if (phoneNumber.length <= 3) {
      return phoneNumber;
    } else if (phoneNumber.length <= 6) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    } else {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(
        3,
        6
      )}-${phoneNumber.slice(6, 10)}`;
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let processedValue = value;

    if (name === "phone") {
      processedValue = formatPhoneNumber(value);
    } else if (name === "state") {
      processedValue = value.toUpperCase();
    } else if (name === "zip") {
      processedValue = value.replace(/\D/g, "").slice(0, 5);
    }

    setFormData({
      ...formData,
      [name]: processedValue,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const cleanPhone = formData.phone.replace(/\D/g, "");

    if (!formData.first_name.trim()) {
      setError("First Name is required.");
      return;
    }

    if (!formData.last_name.trim()) {
      setError("Last Name is required.");
      return;
    }

    if (!formData.phone.trim() || cleanPhone.length < 10) {
      setError("Please enter a valid 10-digit phone number.");
      return;
    }

    if (!formData.street.trim()) {
      setError("Street address is required.");
      return;
    }

    if (!formData.city.trim()) {
      setError("City is required.");
      return;
    }

    if (!formData.state.trim()) {
      setError("State is required.");
      return;
    }

    if (formData.state.trim().length !== 2) {
      setError("State must be a 2-letter abbreviation (e.g., CA, NY).");
      return;
    }

    if (!formData.zip.trim()) {
      setError("ZIP code is required.");
      return;
    }

    if (!/^\d{5}$/.test(formData.zip.trim())) {
      setError("ZIP code must be exactly 5 digits.");
      return;
    }

    setLoading(true);

    try {
      const cleanPhone = formData.phone.replace(/\D/g, "");

      const profileData = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        phone: cleanPhone,
        street: formData.street.trim(),
        city: formData.city.trim(),
        state: formData.state.trim().toUpperCase(),
        zip: formData.zip.trim(),
      };

      await customersAPI.updateProfile(profileData);
      queryClient.invalidateQueries(["user"]);
      navigate("/dashboard");
    } catch (err) {
      console.error("Profile update error:", err);
      setError(
        err.response?.data?.detail ||
          err.message ||
          "Failed to update profile. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();

      // Clear associated tokens and info from sessionStorage
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("access_token");
      sessionStorage.removeItem("user_id");
      sessionStorage.removeItem("user_type");

      // Also clear from localStorage (in case any old data exists)
      localStorage.removeItem("token");
      localStorage.removeItem("access_token");
      localStorage.removeItem("user_id");
      localStorage.removeItem("user_type");

      document.cookie =
        "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

      // Clear react query cache
      queryClient.clear();

      // Dispatch auth change event
      window.dispatchEvent(new Event("authChange"));

      // Navigate to home (same as navbar logout)
      navigate("/");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  if (isProcessingToken || (userLoading && !user)) {
    return (
      <div className="auth-container">
        <div className="auth-box">
          <div className="auth-header">
            <h1>Loading...</h1>
            <p>Please wait...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="auth-container"
      style={{
        padding: "2rem 1rem",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Logout button in top right - styled like navbar button */}
      <div
        style={{
          position: "absolute",
          top: "20px",
          right: "20px",
          zIndex: 1000,
        }}
      >
        <button
          type="button"
          onClick={handleLogout}
          className="btn-primary"
          style={{
            margin: 0,
          }}
        >
          Logout
        </button>
      </div>

      <div
        className="auth-box"
        style={{
          maxWidth: "600px",
          width: "100%",
          maxHeight: "none",
          overflow: "visible",
          padding: "2.5rem 2rem",
        }}
      >
        <div className="auth-header" style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
            Complete Your Profile
          </h1>
          <p style={{ fontSize: "0.9rem" }}>
            Please provide your contact information and address to complete your
            account setup.
          </p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div style={{ marginBottom: "1.5rem" }}>
            <h3
              style={{
                color: "#DAA520",
                fontSize: "1rem",
                fontWeight: "400",
                marginBottom: "1rem",
                letterSpacing: "0.5px",
                borderBottom: "1px solid rgba(218, 165, 32, 0.3)",
                paddingBottom: "0.5rem",
              }}
            >
              Personal Information
            </h3>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="first_name">
                  First Name <span style={{ color: "#DAA520" }}>*</span>
                </label>
                <input
                  type="text"
                  id="first_name"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  placeholder="John"
                  required
                  disabled={loading}
                  style={{ fontSize: "1rem" }}
                />
              </div>

              <div className="form-group">
                <label htmlFor="last_name">
                  Last Name <span style={{ color: "#DAA520" }}>*</span>
                </label>
                <input
                  type="text"
                  id="last_name"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  placeholder="Doe"
                  required
                  disabled={loading}
                  style={{ fontSize: "1rem" }}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="phone">
                Phone Number <span style={{ color: "#DAA520" }}>*</span>
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="(555) 123-4567"
                required
                disabled={loading}
                pattern="[0-9\s\(\)\-]+"
                style={{ fontSize: "1rem" }}
              />
              <small
                style={{
                  color: "rgba(255, 255, 255, 0.5)",
                  fontSize: "0.75rem",
                  marginTop: "0.4rem",
                  display: "block",
                  fontStyle: "italic",
                }}
              >
                Include area code. Format: (555) 123-4567
              </small>
            </div>
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <h3
              style={{
                color: "#DAA520",
                fontSize: "1rem",
                fontWeight: "400",
                marginBottom: "1rem",
                letterSpacing: "0.5px",
                borderBottom: "1px solid rgba(218, 165, 32, 0.3)",
                paddingBottom: "0.5rem",
              }}
            >
              Address Information
            </h3>

            <div className="form-group">
              <label htmlFor="street">
                Street Address <span style={{ color: "#DAA520" }}>*</span>
              </label>
              <input
                type="text"
                id="street"
                name="street"
                value={formData.street}
                onChange={handleChange}
                placeholder="123 Main Street, Apt 4B"
                required
                disabled={loading}
                style={{ fontSize: "1rem" }}
              />
              <small
                style={{
                  color: "rgba(255, 255, 255, 0.5)",
                  fontSize: "0.75rem",
                  marginTop: "0.4rem",
                  display: "block",
                  fontStyle: "italic",
                }}
              >
                Include street number, street name, and apartment/unit if
                applicable
              </small>
            </div>

            <div className="form-row-three" style={{ marginTop: "1rem" }}>
              <div className="form-group" style={{ flex: "2" }}>
                <label htmlFor="city">
                  City <span style={{ color: "#DAA520" }}>*</span>
                </label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="San Francisco"
                  required
                  disabled={loading}
                  style={{ fontSize: "1rem" }}
                />
              </div>

              <div className="form-group" style={{ flex: "1" }}>
                <label htmlFor="state">
                  State <span style={{ color: "#DAA520" }}>*</span>
                </label>
                <input
                  type="text"
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="CA"
                  maxLength="2"
                  required
                  disabled={loading}
                  style={{
                    fontSize: "1rem",
                    textTransform: "uppercase",
                  }}
                />
                <small
                  style={{
                    color: "rgba(255, 255, 255, 0.5)",
                    fontSize: "0.75rem",
                    marginTop: "0.5rem",
                    display: "block",
                  }}
                >
                  2-letter code
                </small>
              </div>

              <div className="form-group" style={{ flex: "1" }}>
                <label htmlFor="zip">
                  ZIP Code <span style={{ color: "#DAA520" }}>*</span>
                </label>
                <input
                  type="text"
                  id="zip"
                  name="zip"
                  value={formData.zip}
                  onChange={handleChange}
                  placeholder="94102"
                  maxLength="5"
                  pattern="[0-9]{5}"
                  required
                  disabled={loading}
                  style={{ fontSize: "1rem" }}
                />
                <small
                  style={{
                    color: "rgba(255, 255, 255, 0.5)",
                    fontSize: "0.75rem",
                    marginTop: "0.5rem",
                    display: "block",
                  }}
                >
                  5 digits
                </small>
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: "1.5rem",
              paddingTop: "1rem",
              borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <button
              type="submit"
              className="submit-btn"
              disabled={loading}
              style={{
                width: "100%",
                padding: "0.9rem 2rem",
                fontSize: "0.95rem",
              }}
            >
              {loading
                ? "Saving Information..."
                : "Complete Profile & Continue"}
            </button>
            <p
              style={{
                color: "rgba(255, 255, 255, 0.5)",
                fontSize: "0.8rem",
                textAlign: "center",
                marginTop: "0.75rem",
                fontStyle: "italic",
              }}
            >
              All fields marked with <span style={{ color: "#DAA520" }}>*</span>{" "}
              are required
            </p>
          </div>
        </form>
      </div>

      <div className="auth-visual">
        <div className="visual-content">
          <h2>Almost There!</h2>
          <p>
            Just a few more details and you'll be ready to start banking with
            us.
          </p>
        </div>
      </div>
    </div>
  );
}

export default CompleteProfilePage;
