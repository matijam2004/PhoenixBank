import { v4 as uuid } from "uuid";
import { useState, useRef } from "react";

import LoadingIcon from "../components/LoadingIcon";

import { useUser } from "../hooks/auth";
import { useAccounts, useAccountsByPhone } from "../hooks/accounts";
import { useTransactionsByCustomer, useCreateTransaction } from "../hooks/transactions";

import { maskId, capitalize } from "../utils/strings";
import { formatDateTime } from "../utils/dates";
import { formatPhoneNumber, validPhone } from "../utils/phone";
import { TRANSFER_TYPE } from "../utils/transactions";
import { to_$ } from "../utils/numbers";
import { INACTIVE_STATUS } from "../utils/accounts";

import "../styles/transfer.css";

export default function Transfer() {
  const { data: user, isLoading: userLoading, error: userError } = useUser();
  const { data: accounts = [], isLoading: aLoading, error: aError } = useAccounts();
  const { data: transactions = { items: [] }, isLoading: txnLoading, error: txnError } = useTransactionsByCustomer(user?._id);

  const [formData, setFormData] = useState({
    fromAccount: "",
    toAccount: "",
    amount: "",
    scheduledDate: "",
    memo: "",
    phone: "",
  });

  const { data: external_accounts = [], isLoading: extLoading, error: extError } = useAccountsByPhone(formData.phone);

  const [loading, setLoading] = useState(false);
  const [transferType, setTransferType] = useState("internal");
  const idempotencyKeyRef = useRef(null);

  const accountIds = [formData?.from_account_id, formData?.to_account_id].filter(Boolean);

  const useCreate = useCreateTransaction(user?._id, accountIds);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData((prev) => ({ ...prev, phone: formatted }));
  };

  const accountsFound = () => {
    if (transferType === "internal") return false;

    if (external_accounts.length <= 0) return false;

    return true;
  };

  const getAccountBalance = (accountId) => {
    const account = accounts.find((acc) => acc._id === accountId);
    return account ? account.balance : 0;
  };

  const transferFormComplete = () => {
    const { fromAccount, toAccount, amount } = formData;

    const allFilled = fromAccount && toAccount;

    const amountValid = parseFloat(amount) > 0;

    return Boolean(allFilled && amountValid);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (transferType === "external" && !formData?.toAccount) {
        alert("No recipient selected.");
        setLoading(false);
        return;
      }

      const payload = {
        amount: Number(formData.amount),
        description: formData.memo || undefined,
        from_account_id: formData.fromAccount,
        to_account_id: formData.toAccount,
        type: transferType,
      };

      if (formData.scheduledDate) {
        payload["run_at"] = formData.scheduledDate;
      }

      console.log(transferType === "external" ? "Submitting P2P payload:" : "Internal transfer:", payload);

      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = uuid();
      }

      useCreate.mutate({ payload: payload, idempotencyKey: idempotencyKeyRef.current });
      // const data = await transactionsAPI.postTransaction(payload, idempotencyKeyRef.current);

      idempotencyKeyRef.current = null;
      // console.log("Created transaction:", data);
      // ...navigate / toast / reset form, etc.
      // alert("Transfer successful.", data);
    } catch (err) {
      alert(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container transfer-page" data-bs-theme="dark">
      <div className="row">
        <div className="col-lg-10 offset-lg-1 transfer-header">
          <h1>Transfer Funds</h1>
          <p>Move money between your accounts or send to others</p>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-lg-6 offset-lg-1">
          <div className="component transfer-form-section">
            <div className="transfer-type-toggle">
              <button
                type="button"
                className={`toggle-btn ${transferType === "internal" ? "active" : ""}`}
                onClick={() => {
                  setTransferType("internal");
                  setFormData((prev) => ({ ...prev, phone: "" }));
                  setFormData((prev) => ({ ...prev, toAccount: "" }));
                }}
              >
                Between My Accounts
              </button>
              <button
                type="button"
                className={`toggle-btn ${transferType === "external" ? "active" : ""}`}
                onClick={() => {
                  setTransferType("external");
                  setFormData((prev) => ({ ...prev, toAccount: "" }));
                }}
              >
                To Someone Else
              </button>
            </div>

            <form onSubmit={handleSubmit} className="transfer-form">
              <div className="form-group">
                <label htmlFor="fromAccount">From Account</label>
                <select id="fromAccount" name="fromAccount" value={formData.fromAccount} onChange={handleChange} required>
                  <option value="">Select account</option>
                  {accounts.map((account) => (
                    <option key={account._id} value={account._id} disabled={INACTIVE_STATUS.includes(account.status) || account.balance <= 0}>
                      {capitalize(account.account_type)} ({maskId(account._id)}) - {to_$(account.balance)}
                    </option>
                  ))}
                </select>
              </div>

              {transferType === "internal" ? (
                <div className="form-group">
                  <label htmlFor="toAccount">To Account</label>
                  <select id="toAccount" name="toAccount" value={formData.toAccount} onChange={handleChange} required>
                    <option value="">Select account</option>
                    {accounts
                      .filter((account) => account._id !== formData.fromAccount)
                      .map((account) => (
                        <option key={account._id} value={account._id} disabled={INACTIVE_STATUS.includes(account.status)}>
                          {capitalize(account.account_type)} ({maskId(account._id)}) - {to_$(account.balance)}
                        </option>
                      ))}
                  </select>
                </div>
              ) : (
                <>
                  <div className="form-group">
                    <label htmlFor="recipientPhone">Phone Number</label>
                    <div className="phone-input-wrapper">
                      <input
                        type="text"
                        id="recipientPhone"
                        name="recipientPhone"
                        value={formData.phone}
                        onChange={handlePhoneChange}
                        placeholder="(555) 555-5555"
                        maxLength={14}
                        required={transferType === "external"}
                      />
                    </div>

                    {extLoading && validPhone(formData.phone) && <LoadingIcon />}
                    {accountsFound() && validPhone(formData.phone) && <small className="lookup-message found">Found accounts</small>}
                    {!accountsFound() && validPhone(formData.phone) && <small className="lookup-message not-found">No accounts associated with {formData.phone}</small>}
                  </div>

                  {accountsFound() && (
                    <div className="form-group">
                      <p className="from-group-label">Select an account</p>
                      <div className="radio-group accounts">
                        {external_accounts?.map((acc) => (
                          <label className={`radio-label ${formData.toAccount === acc._id ? "checked" : ""}`}>
                            <input type="radio" name="toAccount" value={acc._id} checked={formData.toAccount === acc._id} onChange={handleChange} />
                            <span>
                              {maskId(acc._id)} {acc.account_type}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="form-group">
                <label htmlFor="amount">Amount</label>
                <div className="amount-input-wrapper">
                  <span className="currency-symbol">$</span>
                  <input
                    type="number"
                    id="amount"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0.01"
                    max={formData.fromAccount ? getAccountBalance(formData.fromAccount) : undefined}
                    required
                  />
                </div>
                {formData.fromAccount && (
                  <small className="available-balance">
                    Available: $
                    {Number(getAccountBalance(formData.fromAccount).toString()).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </small>
                )}
                <div className="quick-amounts">
                  {[100, 500, 1000, 2000].map((amount) => (
                    <button key={amount} type="button" className="btn quick-amount-btn" onClick={() => setFormData((prev) => ({ ...prev, amount: amount.toString() }))}>
                      ${amount}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>When</label>
                <div className="radio-group">
                  <label className={`radio-label ${formData.date === "now" ? "checked" : ""}`}>
                    <input type="radio" name="date" value="now" checked={formData.date === "now"} onChange={handleChange} />
                    <span>Transfer Now</span>
                  </label>
                  <label className={`radio-label ${formData.date === "scheduled" ? "checked" : ""}`}>
                    <input type="radio" name="date" value="scheduled" checked={formData.date === "scheduled"} onChange={handleChange} />
                    <span>Schedule Transfer</span>
                  </label>
                </div>
                {formData.date === "scheduled" && (
                  <input type="date" name="scheduledDate" value={formData.scheduledDate} onChange={handleChange} min={new Date().toISOString().split("T")[0]} className="date-input" required />
                )}
              </div>

              <div className="form-group">
                <label htmlFor="memo">Message (Optional)</label>
                <input type="text" id="memo" name="memo" value={formData.memo} onChange={handleChange} placeholder="Add a note for this transfer" maxLength={100} />
              </div>

              <button type="submit" className="transfer-submit-btn" disabled={!transferFormComplete() || loading}>
                <i className="bi bi-arrow-up-right"></i>
                {transferType === "external" ? "Send Money" : "Transfer Funds"}
              </button>
            </form>
          </div>
        </div>
        <div className="col-lg-4">
          <div className="recent-transfers-list component">
            <h3>Recent Transfers</h3>
            {txnLoading && <LoadingIcon />}
            {transactions.items.length === 0 && !txnLoading && <span className="text-gray text-center">No transactions to show</span>}
            {transactions.items.map(
              (t) =>
                TRANSFER_TYPE.includes(t.type) && (
                  <div key={t._id} className="card recent-transfer-item">
                    <div className="transfer-icon">
                      <i className="bi bi-arrow-up-right"></i>
                    </div>
                    <div className="transfer-details">
                      <p className="transfer-route">
                        {maskId(t.from_account_id)} → {maskId(t.to_account_id)}
                      </p>
                      <p className="transfer-date">{formatDateTime(t.created_at)}</p>
                    </div>
                    <div className="transfer-amount">{to_$(t.amount)}</div>
                  </div>
                )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
