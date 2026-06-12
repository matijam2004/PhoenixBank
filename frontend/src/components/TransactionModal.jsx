import { createPortal } from "react-dom";

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../styles/styles-new.css";
import "../styles/transaction-modal.css";
import { formatDateTime } from "../utils/dates";
import { to_$ } from "../utils/numbers";

export default function TransactionModal({ show, onClose, transaction }) {
  const txnStatusColor = (status) => {
    if (status == "posted") {
      return "rounded-pill text-bg-success";
    } else if (status == "pending") {
      return "rounded-pill text-bg-warning";
    } else {
      return "rounded-pill text-bg-danger";
    }
  };

  if (!show) return null;

  return createPortal(
    <div
      className={`modal fade show transaction-details`}
      tabIndex="-1"
      role="dialog"
      style={{
        display: "block",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
      }}
      onClick={onClose}
    >
      <div className="modal-dialog" role="document" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Transaction details</h5>
            <button type="button" className="btn close text-danger" onClick={onClose}>
              <i className="bi bi-x-circle-fill"></i>
            </button>
          </div>

          <div className="modal-body card">
            {transaction ? (
              <>
                <span className="date text-sm text-gray">
                  transaction date: {formatDateTime(transaction.created_at)}
                  <br />
                  {transaction.run_at && <>scheduled on: {formatDateTime(transaction.run_at)}</>}
                  <br />
                  {transaction.posted_at && <>posted on: {formatDateTime(transaction.posted_at)}</>}
                </span>
                <h1 className="amount">{to_$(transaction.amount)}</h1>
                <div className="modal-row">
                  <span className={txnStatusColor(transaction.status)}>{transaction.status}</span>
                  <span className="rounded-pill text-bg-secondary">{transaction.type}</span>
                </div>
                <div className="accounts">
                  <strong>Accounts</strong>
                  {transaction.from_account_id && (
                    <span>
                      <strong>From:</strong> {transaction.from_account_id}
                    </span>
                  )}
                  {transaction.to_account_id && (
                    <span>
                      <strong>To:</strong> {transaction.to_account_id}
                    </span>
                  )}
                </div>
                {transaction.description && (
                  <section className="description">
                    <strong>Description</strong>
                    <br />
                    <span className="content">{transaction.description}</span>
                  </section>
                )}
              </>
            ) : (
              <p>No transaction selected.</p>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
