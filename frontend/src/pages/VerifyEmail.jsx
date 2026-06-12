import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import "../styles/auth.css";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    if (success) setStatus("success");
    else if (error) setStatus("error");
    else setStatus("error");
  }, [searchParams]);

  return (
    <div className="auth-container">
      <div className="auth-box" style={{ textAlign: "center", padding: "48px 40px" }}>
        {status === "success" ? (
          <>
            <div style={{ fontSize: "56px", marginBottom: "20px" }}>✅</div>
            <h2 style={{ color: "#d4af37", marginBottom: "12px" }}>Email Verified!</h2>
            <p style={{ color: "#ccc", marginBottom: "32px" }}>
              Your account has been activated. You can now log in.
            </p>
            <Link
              to="/login"
              style={{
                background: "#d4af37", color: "#000", borderRadius: "6px",
                padding: "12px 32px", fontWeight: "bold", textDecoration: "none",
                fontSize: "15px"
              }}
            >
              Go to Login
            </Link>
          </>
        ) : (
          <>
            <div style={{ fontSize: "56px", marginBottom: "20px" }}>❌</div>
            <h2 style={{ color: "#e55", marginBottom: "12px" }}>Verification Failed</h2>
            <p style={{ color: "#ccc", marginBottom: "32px" }}>
              {decodeURIComponent(searchParams.get("error") || "This link is invalid or has expired.")}
            </p>
            <Link
              to="/signup"
              style={{
                background: "#d4af37", color: "#000", borderRadius: "6px",
                padding: "12px 32px", fontWeight: "bold", textDecoration: "none",
                fontSize: "15px"
              }}
            >
              Back to Sign Up
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
