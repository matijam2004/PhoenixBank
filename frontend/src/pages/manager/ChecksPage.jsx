import React, { useState, useEffect } from "react";

// This page's design depends on manager-dashboard.css
import "../../styles/manager-dashboard.css";
// manager-checks.css overwrites some manager-dashboard styles
import "../../styles/manager-checks.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";

import { managersAPI } from "../../services/api/managers";
import { checksAPI } from "../../services/api/checks";
import { maskId, capitalize } from "../../utils/strings";
import { to_$ } from "../../utils/numbers";
const checkPlaceholderImage = "/images/check.png";
import { formatDateTime } from "../../utils/dates";
import { useChecks, useUpdateCheck } from "../../hooks/checks";
import { useUser } from "../../hooks/auth";

function ChecksPage() {
  // Treat loading as an object since we read loading.checks below
  const [loading, setLoading] = useState({ checks: false });
  const [error, setError] = useState(null);
  const [checkEditModal, setCheckEditModal] = useState({
    open: false,
    check: null,
    formData: null,
    error: "",
  });
  const [isSubmittingCheck, setIsSubmittingCheck] = useState(false);

  const { data: user, isLoading: userLoading, error: userError } = useUser();
  const { data: checks = [], isLoading: checksLoading, error: checksError } = useChecks(user?.id);
  const useUpdate = useUpdateCheck();

  // Check handlers
  const openCheckEditModal = (check) => {
    setCheckEditModal({
      open: true,
      check,
      formData: {
        date: check.date ? new Date(check.date).toISOString().split("T")[0] : "",
        payee_name: check.payee_name || "",
        amount: check.amount || "",
        memo: check.memo || "",
        routing_no: check.routing_no || "",
        payer_account_id: check.payer_account_id || "",
        check_no: check.check_no || "",
      },
      error: "",
    });
  };

  const closeCheckEditModal = () => {
    setCheckEditModal({
      open: false,
      check: null,
      formData: null,
      error: "",
    });
    setIsSubmittingCheck(false);
  };

  const handleCheckFormChange = (field, value) => {
    setCheckEditModal((prev) => ({
      ...prev,
      formData: {
        ...prev.formData,
        [field]: value,
      },
      error: "",
    }));
  };

  const isCheckValid = (check) => {
    if (!check) return false;

    const requiredStrings = ["account_id", "customer_id", "payee_name", "routing_no", "payer_account_id", "check_no"];
    const hasAllStrings = requiredStrings.every((key) => typeof check[key] === "string" && check[key].trim() !== "");

    const hasValidAmount = check.amount && !isNaN(parseFloat(check.amount)) && parseFloat(check.amount) > 0;
    const hasValidDate = !check.date || !isNaN(Date.parse(check.date)) || check.date === null;

    console.log(hasAllStrings && hasValidAmount && hasValidDate);

    return hasAllStrings && hasValidAmount && hasValidDate;
  };

  const handleApproveCheck = async (check) => {
    if (!confirm(`Are you sure you want to approve this check for $${check.amount}?`)) return;

    try {
      useUpdate.mutate({ id: check._id, payload: { status: "approved" } });
    } catch (err) {
      console.error("Failed to approve check:", err);
      alert(`Failed to approve check: ${err.message}`);
    }
  };

  const handleDenyCheck = async (check) => {
    if (!confirm(`Are you sure you want to deny this check for $${check.amount}?`)) return;

    try {
      useUpdate.mutate({ id: check._id, payload: { status: "denied" } });
    } catch (err) {
      console.error("Failed to deny check:", err);
      alert(`Failed to deny check: ${err.message}`);
    }
  };

  const submitCheckUpdate = async (event) => {
    event.preventDefault();
    if (!checkEditModal.check || isSubmittingCheck) return;

    setIsSubmittingCheck(true);
    try {
      const check_id = checkEditModal.check._id;
      useUpdate.mutate({ id: check_id, payload: checkEditModal.formData });

      closeCheckEditModal();
      // alert("Check updated successfully");
    } catch (err) {
      console.error("Failed to update check:", err);
      // Avoid undefined formatErrorMessage
      setCheckEditModal((prev) => ({
        ...prev,
        error: err?.message || "Failed to update check. Please try again.",
      }));
      setIsSubmittingCheck(false);
    }
  };

  return (
    <>
      <div className="container" data-bs-theme="dark">
        <section className="md-section">
          <div className="md-section-head">
            <h1>Check Submissions</h1>
          </div>

          {loading.checks ? (
            <div className="text-center">Loading checks...</div>
          ) : error ? (
            <div className="text-danger text-center">{error}</div>
          ) : (
            <>
              {checks.length === 0 ? (
                <div className="text-center text-gray">No checks found</div>
              ) : (
                <div className="md-accounts-list actually-checks-list">
                  {checks.map((check) => (
                    <div key={check.id} className="md-card md-account-card">
                      <div className="md-card-header">
                        <div>
                          <h1>{to_$(parseFloat(check.amount || 0))}</h1>
                          <h3>{maskId(check._id, 6)}</h3>
                        </div>
                        <span className={`md-pill ${check.status === "approved" ? "md-pill-success" : check.status === "denied" ? "md-pill-warning" : "md-pill-warn"}`}>
                          {capitalize(check.status || "pending")}
                        </span>
                      </div>
                      <div className="md-card-body">
                        <div className="md-info-row">
                          <span className="md-label">Submitted</span>
                          <span className="md-value">{formatDateTime(check.created_at, "dt") || "N/A"}</span>
                        </div>
                        <div className="md-info-row">
                          <span className="md-label">Amount</span>
                          <span className="md-value md-balance">{to_$(parseFloat(check.amount || 0))}</span>
                        </div>
                        <div className="md-info-row">
                          <span className="md-label">Deposit to</span>
                          <span className="md-value">{maskId(check.account_id)}</span>
                        </div>
                      </div>
                      <div className="md-card-actions">
                        <button className="md-btn md-btn-primary" onClick={() => openCheckEditModal(check)}>
                          {check.status === "pending" ? "Edit Check" : "View Details"}
                        </button>
                        {check.status === "pending" && (
                          <>
                            <button className="md-btn md-btn-secondary btn-approve" onClick={() => handleApproveCheck(check)} disabled={!isCheckValid(check) || loading.checks}>
                              Approve
                            </button>
                            <button className="md-btn md-btn-secondary btn-deny" onClick={() => handleDenyCheck(check)} disabled={loading.checks}>
                              Deny
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {checkEditModal.open && checkEditModal.formData && (
        <div
          className="md-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="check-edit-modal-title"
          onClick={(e) => e.target === e.currentTarget && closeCheckEditModal()}
          data-bs-theme="light"
        >
          <div className="md-check-edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="md-modal-header">
              <h3 id="check-edit-modal-title">Edit Check Information</h3>
              <p className="md-modal-subtitle">Check #{checkEditModal.check ? maskId(checkEditModal.check._id, 6) : ""}</p>
            </div>

            <div className="md-check-edit-content">
              {/* Check Image Display */}
              <div className="md-check-image-container">
                <h4 className="md-check-image-label">Check Image</h4>
                <div className="md-check-image-wrapper">
                  <img
                    src={`data:${checkEditModal.check?.front.mime};base64,${checkEditModal.check?.front.data}`}
                    alt="Check"
                    title="Front check photo"
                    className="md-check-image front"
                    onError={(e) => {
                      // Fallback to placeholder if check image fails to load
                      e.target.src = checkPlaceholderImage;
                    }}
                  />

                  <img
                    src={`data:${checkEditModal.check?.back.mime};base64,${checkEditModal.check?.back.data}`}
                    alt="Check"
                    title="Back check photo"
                    className="md-check-image back"
                    onError={(e) => {
                      // Fallback to placeholder if check image fails to load
                      e.target.src = checkPlaceholderImage;
                    }}
                  />
                </div>
              </div>

              {/* Check Edit Form */}
              <form onSubmit={submitCheckUpdate} className="md-check-edit-form">
                <fieldset disabled={checkEditModal.check.status !== "pending"}>
                  {/* Check Layout - Matching the image */}
                  <div className="md-check-form-layout">
                    {/* Top Section: Payer Info and Date */}
                    <div className="instruction">
                      <p>Fill out all missing fields before approval.</p>
                    </div>
                    <div className="md-check-form-top">
                      {/* <div className="md-check-payer-section">
                      <input
                        type="text"
                        className="md-check-input md-check-payer-name"
                        value={checkEditModal.formData.payer_name}
                        onChange={(e) => handleCheckFormChange("payer_name", e.target.value)}
                        placeholder="Payer Name"
                      />
                      <input
                        type="text"
                        className="md-check-input md-check-payer-address"
                        value={checkEditModal.formData.payer_address}
                        onChange={(e) => handleCheckFormChange("payer_address", e.target.value)}
                        placeholder="Street Address"
                      />
                      <input
                        type="text"
                        className="md-check-input md-check-payer-city"
                        value={checkEditModal.formData.payer_city_state_zip}
                        onChange={(e) => handleCheckFormChange("payer_city_state_zip", e.target.value)}
                        placeholder="City, State ZIP"
                      />
                    </div> */}
                      <div className="md-check-date-section">
                        <input type="date" className="md-check-input md-check-date" value={checkEditModal.formData.date} onChange={(e) => handleCheckFormChange("date", e.target.value)} />
                        <span className="md-check-label">DATE</span>
                      </div>
                    </div>

                    {/* Middle Section: Payee and Amount */}
                    <div className="md-check-form-middle">
                      <div className="md-check-payee-section">
                        <span className="md-check-label-bold">PAY TO THE ORDER OF</span>
                        <input
                          type="text"
                          className="md-check-input md-check-payee"
                          value={checkEditModal.formData.payee_name}
                          onChange={(e) => handleCheckFormChange("payee_name", e.target.value)}
                          placeholder="Payee Name"
                          maxLength={50}
                          minLength={1}
                        />
                      </div>
                      <div className="md-check-amount-section">
                        <span className="md-check-dollar">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="md-check-input md-check-amount"
                          value={checkEditModal.formData.amount}
                          onChange={(e) => handleCheckFormChange("amount", e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    {/* Written Amount */}
                    {/* <div className="md-check-form-written-amount">
                    <input
                      type="text"
                      className="md-check-input md-check-written-amount"
                      value={checkEditModal.formData.written_amount}
                      onChange={(e) => handleCheckFormChange("written_amount", e.target.value)}
                      placeholder="Amount in words"
                    />
                    <span className="md-check-label-bold">DOLLARS</span>
                  </div> */}

                    {/* Memo Section */}
                    <div className="md-check-form-memo">
                      <span className="md-check-label-bold">MEMO</span>
                      <input
                        type="text"
                        className="md-check-input md-check-memo"
                        value={checkEditModal.formData.memo}
                        onChange={(e) => handleCheckFormChange("memo", e.target.value)}
                        placeholder="Memo"
                        maxLength={50}
                        minLength={0}
                      />
                    </div>

                    {/* Additional Fields */}
                    <div className="md-check-form-additional">
                      {/* <div className="md-check-form-field">
                      <label className="md-label">Bank Name</label>
                      <input type="text" className="md-input" value={checkEditModal.formData.bank_name} onChange={(e) => handleCheckFormChange("bank_name", e.target.value)} placeholder="Bank Name" />
                    </div> */}
                      <div className="instruction">
                        <p>The following info is found at the lowest section of the check. Please double check correctness before approval.</p>
                      </div>
                      <div className="md-check-form-field routing_no">
                        <label className="md-label">Routing Number</label>
                        <input
                          type="text"
                          className="form-control"
                          value={checkEditModal.formData.routing_no}
                          onChange={(e) => handleCheckFormChange("routing_no", e.target.value)}
                          placeholder="9-digit routing number"
                          maxLength={9}
                          minLength={9}
                        />
                      </div>
                      <div className="md-check-form-field account_no">
                        <label className="md-label">Account Number</label>
                        <input
                          type="text"
                          className="form-control"
                          value={checkEditModal.formData.payer_account_id}
                          onChange={(e) => handleCheckFormChange("payer_account_id", e.target.value)}
                          placeholder="Enter account number"
                          maxLength={16}
                          minLength={10}
                        />
                      </div>
                      <div className="md-check-form-field check">
                        <label className="md-label">Check Number</label>
                        <input
                          type="text"
                          className="form-control"
                          value={checkEditModal.formData.check_no}
                          onChange={(e) => handleCheckFormChange("check_no", e.target.value)}
                          placeholder="enter check number"
                          maxLength={4}
                          minLength={1}
                        />
                      </div>
                    </div>
                  </div>

                  {checkEditModal.error && <p className="md-modal-error">{checkEditModal.error}</p>}
                </fieldset>
                <div className="md-modal-actions">
                  <button type="button" className="md-btn md-btn-secondary btn-deny light" onClick={closeCheckEditModal} disabled={isSubmittingCheck}>
                    Close
                  </button>
                  <button type="submit" className="md-btn md-btn-secondary btn-approve light" disabled={isSubmittingCheck || checkEditModal.check.status !== "pending"}>
                    {isSubmittingCheck ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ChecksPage;
