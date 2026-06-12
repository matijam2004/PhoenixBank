import { useEffect, useRef, useMemo, useState } from "react";
import { useAccounts } from "../hooks/accounts";
import { useUser } from "../hooks/auth";
import { useNavigate } from "react-router-dom";

// CSS imports
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../styles/styles-new.css";
import "../styles/chase-atm-page.css";

import { v4 as uuid } from "uuid";

import { transactionsAPI } from "../services/api/transactions";

import { maskId, capitalize } from "../utils/strings";
import { to_$ } from "../utils/numbers";
import { INACTIVE_STATUS } from "../utils/accounts";
import LoadingIcon from "../components/LoadingIcon";
import { useCreateTransaction } from "../hooks/transactions";

function ChaseATMpage() {
  // Dynamic data
  const navigate = useNavigate();

  const fixed_amounts = [20, 40, 60, 80, 100, 200];
  const { data: user, isLoading: userLoading, error: userError } = useUser();
  const { data: accounts = [], isLoading: aLoading, error: aError } = useAccounts();

  const [loading, setLoading] = useState(false);
  const [pin, setPin] = useState("");
  const [pinValid, setValid] = useState(false);
  const idempotencyKeyRef = useRef(null);

  const [transactionForm, setTransactionForm] = useState({
    type: "deposit",
    account_id: "",
    amount: "",
    memo: "",
  });

  const useCreate = useCreateTransaction(user?._id, [transactionForm?.account_id]);

  useEffect(() => {
    // Only redirect to login if there's no token AND a clear 401 error
    // If token exists, don't redirect (might be temporary network issue)
    const hasToken = localStorage.getItem("token") || localStorage.getItem("access_token");
    if (!userLoading && !hasToken && userError) {
      // Check if it's actually a 401 authentication error
      const isAuthError =
        userError?.status === 401 ||
        userError?.response?.status === 401 ||
        (typeof userError?.message === "string" &&
          (userError.message.includes("401") || userError.message.includes("Not authenticated") || userError.message.includes("Invalid token") || userError.message.includes("Unauthorized")));

      if (isAuthError) {
        navigate("/login", { replace: true, state: { from: location } });
      }
    }
  }, [userLoading, userError, navigate, location]);

  if (userLoading)
    return (
      <div className="container">
        Loading...
        <LoadingIcon></LoadingIcon>
      </div>
    );
  if (userError && userError.status !== 401) {
    return <div className="container text-danger">Something went wrong. Please try again.</div>;
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTransactionForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePinChange = (e) => {
    const value = e.target.value.replace(/\D/g, ""); // remove non-digits
    setPin(value);
  };

  const handlePINSubmit = (e) => {
    e.preventDefault();
    if (pin.length !== 4) {
      alert("PIN must be exactly 4 digits");
      return;
    }

    alert("Success!");
    setValid(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        amount: Number(transactionForm.amount),
        description: "ATM " + transactionForm.type,
        account_id: transactionForm.account_id,
        type: transactionForm.type,
      };

      payload["run_at"] = Date.now();

      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = uuid();
      }

      useCreate.mutate({ payload: payload, idempotencyKey: idempotencyKeyRef.current });
      // const data = await transactionsAPI.postTransaction(payload, idempotencyKeyRef.current);

      idempotencyKeyRef.current = null;
      // console.log("Created transaction:", payload);
      // alert("Transaction successful.");
    } catch (err) {
      alert(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="container white-container chase-atm-page" data-bs-theme="light">
        <div className="content col-lg-6 offset-lg-3">
          { }
          <h1 className="chase-logo">
            <img src="/images/chase-bank-logo-brandlogos.svg"></img>
          </h1>
          {!pinValid && (
            <form onSubmit={handlePINSubmit}>
              <h3>Enter your PIN</h3>
              <input className="form-control" type="password" id="pin" maxLength={4} minLength={4} value={pin} onChange={handlePinChange} required></input>
              <div className="actions">
                <button className="btn btn-lg btn-blue" type="submit">
                  Confirm
                </button>
              </div>
            </form>
          )}
          {pinValid && (
            <form onSubmit={handleSubmit}>
              <h3>What would you like to do today?</h3>
              <div className="option-select txn-type">
                <div className={`form-check ${transactionForm.type === "deposit" ? "checked" : ""}`}>
                  <input className="form-check-input" type="radio" name="type" id="deposit" value="deposit" checked={transactionForm.type === "deposit"} onChange={handleChange} />
                  <label className="form-check-label" htmlFor="deposit">
                    Deposit
                  </label>
                </div>
                <div className={`form-check ${transactionForm.type === "withdraw" ? "checked" : ""}`}>
                  <input className="form-check-input" type="radio" name="type" id="withdraw" value="withdraw" checked={transactionForm.type === "withdraw"} onChange={handleChange} />
                  <label className="form-check-label" htmlFor="withdraw">
                    Withdraw
                  </label>
                </div>
              </div>
              <h3>Select Account</h3>
              <div className="option-select accounts">
                {accounts.map((account) => (
                  <div className={`form-check ${transactionForm.account_id === account._id ? "checked" : ""}`} key={account._id}>
                    <input
                      className="form-check-input"
                      type="radio"
                      name="account_id"
                      id={account._id}
                      value={account._id}
                      checked={transactionForm.account_id === account._id}
                      onChange={handleChange}
                      disabled={INACTIVE_STATUS.includes(account.status)}
                      required
                    />
                    <label className="form-check-label" htmlFor={account._id}>
                      <span className="info">
                        {capitalize(account.account_type)} ({maskId(account._id)})
                      </span>
                      <span className="balance">{to_$(account.balance)}</span>
                    </label>
                  </div>
                ))}
              </div>
              <h3>
                Enter Amount <br />
                <sub>Select a quick amount below or enter a custom amount.</sub>
              </h3>
              <div className="option-select amount">
                <input
                  className="form-control custom-amount"
                  id="amount"
                  type="number"
                  step={1}
                  placeholder="$"
                  name="amount"
                  value={transactionForm.amount}
                  onChange={handleChange}
                  required
                  min={1}
                ></input>
                {fixed_amounts.map((amount) => (
                  <div className={`form-check ${Number(transactionForm.amount) === amount ? "checked" : ""}`} key={amount}>
                    <input className="form-check-input" type="radio" name="amount" id={`amount-${amount}`} value={amount} checked={transactionForm.amount === amount} onChange={handleChange} />
                    <label className="form-check-label" htmlFor={`amount-${amount}`}>
                      {to_$(amount)}
                    </label>
                  </div>
                ))}
              </div>

              <div className="actions">
                <button className="btn btn-lg btn-blue text-white" type="submit" disabled={loading}>
                  {loading && <i className="bi spinner-grow spinner-grow-sm"></i>}
                  Confirm
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}

export default ChaseATMpage;
