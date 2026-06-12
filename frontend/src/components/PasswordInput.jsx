import { useState } from "react";

/**
 * Password input with show/hide toggle and strength validation
 *
 * Props:
 * - value: Current password value
 * - onChange: Change handler
 * - confirmValue: Confirmation password value (optional, for matching)
 * - label: Input label
 * - placeholder: Input placeholder
 * - id: Input ID
 * - required: Whether field is required
 * - disabled: Whether field is disabled
 * - autoComplete: Autocomplete attribute
 * - showRequirements: Whether to show password requirements (default: true)
 * - showMatchIndicator: Whether to show password match indicator (default: false)
 */
function PasswordInput({
  value,
  onChange,
  confirmValue = "",
  label = "Password",
  placeholder = "Enter password",
  id = "password",
  required = true,
  disabled = false,
  autoComplete = "new-password",
  showRequirements = true,
  showMatchIndicator = false,
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState(false);

  // Password requirements
  const requirements = [
    { test: (pwd) => pwd.length >= 8, label: "At least 8 characters" },
    { test: (pwd) => /[a-z]/.test(pwd), label: "One lowercase letter" },
    { test: (pwd) => /[A-Z]/.test(pwd), label: "One uppercase letter" },
    { test: (pwd) => /[0-9]/.test(pwd), label: "One number" },
    { test: (pwd) => /[^a-zA-Z0-9]/.test(pwd), label: "One special character" },
  ];

  const getRequirementStatus = (requirement) => {
    if (!value) return null; // Not checked yet
    return requirement.test(value);
  };

  const allRequirementsMet = requirements.every((req) =>
    getRequirementStatus(req)
  );

  // Password match indicator
  const passwordsMatch =
    showMatchIndicator && confirmValue && value === confirmValue;
  const passwordsDontMatch =
    showMatchIndicator && confirmValue && value && value !== confirmValue;

  return (
    <div className="form-group">
      <label htmlFor={id}>{label}</label>

      {/* Password Requirements - Show ABOVE the input - ALWAYS VISIBLE */}
      {showRequirements && (
        <div className="password-requirements">
          <div className="requirements-title">Password must contain:</div>
          <ul className="requirements-list">
            {requirements.map((requirement, index) => {
              const status = getRequirementStatus(requirement);
              return (
                <li
                  key={index}
                  className={
                    status === null
                      ? "requirement-pending"
                      : status
                        ? "requirement-met"
                        : "requirement-unmet"
                  }
                >
                  <span className="requirement-icon">
                    {status === null ? "○" : status ? "✓" : "✗"}
                  </span>
                  <span className="requirement-text">{requirement.label}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="password-input-wrapper">
        <input
          type={showPassword ? "text" : "password"}
          id={id}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete={autoComplete}
          className={
            focused && value
              ? allRequirementsMet
                ? "password-valid"
                : "password-invalid"
              : ""
          }
        />
        <button
          type="button"
          className="password-toggle"
          onClick={() => setShowPassword(!showPassword)}
          disabled={disabled}
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
              <line x1="1" y1="1" x2="23" y2="23"></line>
            </svg>
          ) : (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          )}
        </button>
      </div>

      {/* Password Match Indicator */}
      {showMatchIndicator && confirmValue && (
        <div className="password-match-indicator">
          {passwordsMatch && (
            <span className="match-success">✓ Passwords match</span>
          )}
          {passwordsDontMatch && (
            <span className="match-error">✗ Passwords do not match</span>
          )}
        </div>
      )}
    </div>
  );
}

export default PasswordInput;
