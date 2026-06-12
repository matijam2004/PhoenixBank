import { useLocation, useNavigate } from "react-router-dom";
import "../styles/auth.css";

export default function VerifyEmailPending() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const email = state?.email || "your email";

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0a",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "Garamond, 'Times New Roman', serif",
    }}>
      <div style={{
        background: "#111",
        border: "1px solid #d4af37",
        borderRadius: "16px",
        padding: "56px 48px",
        maxWidth: "480px",
        width: "90%",
        textAlign: "center",
      }}>
        <div style={{ fontSize: "64px", marginBottom: "24px" }}>✉️</div>

        <h1 style={{ color: "#d4af37", fontSize: "28px", marginBottom: "16px", fontWeight: "normal" }}>
          Check your inbox
        </h1>

        <p style={{ color: "#aaa", fontSize: "16px", marginBottom: "8px", lineHeight: "1.6" }}>
          We sent a verification link to:
        </p>
        <p style={{ color: "#fff", fontSize: "18px", fontWeight: "bold", marginBottom: "28px" }}>
          {email}
        </p>

        <p style={{ color: "#888", fontSize: "14px", marginBottom: "40px", lineHeight: "1.7" }}>
          Click the link in that email to activate your account and be taken directly to your dashboard.
          <br /><br />
          Don't see it? Check your spam folder.
        </p>

        <div style={{ borderTop: "1px solid #222", paddingTop: "28px" }}>
          <button
            onClick={() => navigate("/signup")}
            style={{
              background: "transparent",
              color: "#888",
              border: "none",
              cursor: "pointer",
              fontSize: "14px",
              textDecoration: "underline",
            }}
          >
            Back to sign up
          </button>
        </div>
      </div>
    </div>
  );
}
