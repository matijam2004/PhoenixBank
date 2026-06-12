import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { authAPI } from "../services/api/auth";
import PasswordInput from "../components/PasswordInput";
import "../styles/auth.css";

function ResetPasswordPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);

  // Verify token when component loads
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError(
          "No reset token provided. Please use the link from your email."
        );
        setVerifying(false);
        return;
      }

      try {
        await authAPI.verifyResetToken(token);
        setTokenValid(true);
      } catch (err) {
        console.error("Token verification error:", err);
        setError(
          err.response?.data?.detail ||
          "Invalid or expired reset token. Please request a new password reset."
        );
      } finally {
        setVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  // Password validation
  const validatePassword = (pwd) => {
    const requirements = [
      pwd.length >= 8,
      /[a-z]/.test(pwd),
      /[A-Z]/.test(pwd),
      /[0-9]/.test(pwd),
      /[^a-zA-Z0-9]/.test(pwd),
    ];
    return requirements.every((req) => req);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Client-side validation
    if (!validatePassword(password)) {
      setError("Password does not meet all requirements.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      // Call the backend API to reset password
      const response = await authAPI.resetPassword(token, password);

      // Store the new token (rename to avoid shadowing the URL token parameter)
      const accessToken = response.access_token;

      // Store token in sessionStorage for banking security
      sessionStorage.setItem("token", accessToken);
      sessionStorage.setItem("access_token", accessToken);
      document.cookie = `access_token=${accessToken}; path=/; SameSite=Lax; max-age=43200`;

      // Decode token to get user type and ID
      const payload = JSON.parse(atob(accessToken.split(".")[1]));
      const userType = payload.scope || "customer";
      const userId = payload.sub;

      // Store user type for quick access
      sessionStorage.setItem("user_type", userType);

      queryClient.invalidateQueries({ queryKey: ["user"] });

      // Fetch user data to check profile completeness
      let redirectPath;
      if (userType === "manager") {
        redirectPath = "/manager-dashboard";
      } else {
        // For customers, check if profile is complete
        try {
          const userData = await authAPI.getCurrentUser();

          // Check if profile needs completion
          const isIncomplete =
            !userData.phone ||
            !userData.phone.trim() ||
            !userData.street ||
            !userData.street.trim() ||
            !userData.city ||
            !userData.city.trim() ||
            !userData.state ||
            !userData.state.trim() ||
            !userData.zip ||
            !userData.zip.trim();

          redirectPath = isIncomplete ? "/complete-profile" : "/dashboard";
        } catch (fetchError) {
          console.warn("Could not fetch user data, redirecting to dashboard:", fetchError);
          redirectPath = "/dashboard";
        }
      }

      window.dispatchEvent(new Event("authChange"));
      window.dispatchEvent(new CustomEvent("storage"));
      window.location.href = redirectPath;
    } catch (err) {
      console.error("Reset password error:", err);
      // Handle fetch API errors (not axios)
      let errorMessage = "Failed to reset password. Please try again.";
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === "string") {
        errorMessage = err;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="auth-container">
        <div className="auth-box">
          <div className="auth-header">
            <h1>Verifying Token</h1>
            <p>Please wait...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="auth-container">
        <div className="auth-box">
          <div className="auth-header">
            <h1>Invalid Token</h1>
          </div>
          {error && <div className="error-message">{error}</div>}
          <div className="auth-footer">
            <p>
              <Link to="/forgot-password">Request a new password reset</Link>
            </p>
            <p style={{ marginTop: "1rem" }}>
              <Link to="/login">Back to Sign In</Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-box">
        <div className="auth-header">
          <h1>Reset Password</h1>
          <p>Enter your new password</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            label="New Password"
            placeholder="Enter new password"
            id="password"
            required
            disabled={loading}
            autoComplete="new-password"
            showRequirements={true}
            showMatchIndicator={false}
          />

          <PasswordInput
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            confirmValue={password}
            label="Confirm Password"
            placeholder="Confirm new password"
            id="confirmPassword"
            required
            disabled={loading}
            autoComplete="new-password"
            showRequirements={false}
            showMatchIndicator={true}
          />

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            <Link to="/login">Back to Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default ResetPasswordPage;
