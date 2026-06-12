import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authAPI } from "../services/api/auth";
import PasswordInput from "../components/PasswordInput";
import "../styles/auth.css";

function SignUpPage() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    street: "",
    city: "",
    state: "",
    zip: "",
  });
  const [error, setError] = useState("");

  const phoneRegex = /^\d{10}$/;
  const [errors, setErrors] = useState({
    phone: "",
  });

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get("error");
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: value,
    });

    if (name === "phone") {
      const digits = value.replace(/\D/g, "");

      setFormData((prev) => ({
        ...prev,
        phone: digits,
      }));

      if (digits && !phoneRegex.test(digits)) {
        setErrors((prev) => ({
          ...prev,
          phone: "Phone number must be exactly 10 digits",
        }));
      } else {
        setErrors((prev) => ({
          ...prev,
          phone: "",
        }));
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  // Password validation
  const validatePassword = (pwd) => {
    const requirements = [pwd.length >= 8, /[a-z]/.test(pwd), /[A-Z]/.test(pwd), /[0-9]/.test(pwd), /[^a-zA-Z0-9]/.test(pwd)];
    return requirements.every((req) => req);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!validatePassword(formData.password)) {
      setError("Password does not meet all requirements.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const signupData = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        street: formData.street,
        city: formData.city,
        state: formData.state,
        zip: formData.zip,
      };

      await authAPI.signup(signupData);

      navigate("/verify-email-pending", { state: { email: formData.email } });
    } catch (err) {
      setError(err.response?.data?.detail || err.message || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = () => {
    const apiBase = import.meta.env.VITE_API_BASE_URL || "/api";
    window.location.href = `${apiBase}/auth/google/signup`;
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <div className="auth-header">
          <h1>Create Account</h1>
          <p>Join our bank and become member of the best bank</p>
        </div>

        <button className="google-btn" onClick={handleGoogleSignUp} type="button">
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" />
            <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" />
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
          </svg>
          Continue with Google
        </button>

        <div className="divider-container">
          <div className="divider-line"></div>
          <span className="divider-text">OR</span>
          <div className="divider-line"></div>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">First Name</label>
              <input type="text" id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} placeholder="John" required disabled={loading} />
            </div>

            <div className="form-group">
              <label htmlFor="lastName">Last Name</label>
              <input type="text" id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Doe" required disabled={loading} />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} placeholder="john.doe@example.com" required disabled={loading} />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone Number</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="5551234567"
              required
              disabled={loading}
              inputMode="numeric"
              pattern="[0-9]{10}"
              maxLength={10}
              minLength={10}
            />
            {errors.phone && <small className="error-text">{errors.phone}</small>}
          </div>

          <div className="form-group">
            <label htmlFor="street">Street Address</label>
            <input type="text" id="street" name="street" value={formData.street} onChange={handleChange} placeholder="123 Main St" required disabled={loading} />
          </div>

          <div className="form-row-three">
            <div className="form-group">
              <label htmlFor="city">City</label>
              <input type="text" id="city" name="city" value={formData.city} onChange={handleChange} placeholder="San Francisco" required disabled={loading} />
            </div>

            <div className="form-group">
              <label htmlFor="state">State</label>
              <input type="text" id="state" name="state" value={formData.state} onChange={handleChange} placeholder="CA" maxLength="2" required disabled={loading} />
            </div>

            <div className="form-group">
              <label htmlFor="zip">ZIP</label>
              <input type="text" id="zip" name="zip" value={formData.zip} onChange={handleChange} placeholder="94102" maxLength="5" required disabled={loading} />
            </div>
          </div>

          <PasswordInput
            value={formData.password}
            onChange={(e) =>
              handleChange({
                target: { name: "password", value: e.target.value },
              })
            }
            label="Password"
            placeholder="Enter password"
            id="password"
            name="password"
            required
            disabled={loading}
            autoComplete="new-password"
            showRequirements={true}
            showMatchIndicator={false}
          />

          <PasswordInput
            value={formData.confirmPassword}
            onChange={(e) =>
              handleChange({
                target: { name: "confirmPassword", value: e.target.value },
              })
            }
            confirmValue={formData.password}
            label="Confirm Password"
            placeholder="Confirm password"
            id="confirmPassword"
            name="confirmPassword"
            required
            disabled={loading}
            autoComplete="new-password"
            showRequirements={false}
            showMatchIndicator={true}
          />

          <div className="form-options">
            <label className="checkbox-label">
              <input type="checkbox" required />
              <span>I agree to the Terms of Service and Privacy Policy</span>
            </label>
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account? <Link to="/login">Sign In</Link>
          </p>
        </div>
      </div>

      <div className="auth-visual">
        <div className="visual-content">
          <h2>Begin Your Journey</h2>
          <p>Open an account in minutes and experience best banking in the world.</p>
        </div>
      </div>
    </div>
  );
}

export default SignUpPage;
