import { useState } from "react";
import { formatDateTime } from "../utils/dates";
import { to_$ } from "../utils/numbers";
import { DEBIT_TYPE, CREDIT_TYPE } from "../utils/transactions";
import TransactionModal from "../components/TransactionModal";

// CSS imports
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../styles/styles-new.css";
import "../styles/transactions-table.css";
import LoadingIcon from "./LoadingIcon";
import FailedMsg from "./FailedMsg";

function TransactionTable({ transactions = [], user = null, loading, error }) {
  if (loading) return <LoadingIcon />;
  if (error) return <FailedMsg message={"Failed to load transactions"} />;

  const [selectedTxn, setSelectedTxn] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const onTxnClick = (txn) => {
    setSelectedTxn(txn);
    setShowModal(true);
  };

  const txnIcon = (type, customer_id) => {
    if (type === "external") {
      if (user?._id === customer_id) return <i className="bi bi-caret-down-fill"></i>;

      return <i className="bi bi-caret-up-fill"></i>;
    } else if (DEBIT_TYPE.includes(type)) {
      return <i className="bi bi-caret-down-fill"></i>;
    } else if (CREDIT_TYPE.includes(type)) {
      return <i className="bi bi-caret-up-fill"></i>;
    } else {
      return <i className="bi bi-dash"></i>;
    }
  };

  const txnTypeColor = (type, customer_id) => {
    if (type === "external") {
      if (user?._id === customer_id) return "text-danger";

      return "text-success";
    } else if (DEBIT_TYPE.includes(type)) {
      return "text-danger";
    } else if (CREDIT_TYPE.includes(type)) {
      return "text-success";
    }
  };

  const txnStatusColor = (status) => {
    if (status == "posted") {
      return "text-success";
    } else if (status == "pending") {
      return "text-warning";
    } else {
      return "text-danger";
    }
  };

  if (loading) return <div className="container text-primary">Loading...</div>;
  if (error) return <div className="container text-danger">Failed to load transactions.</div>;

  return (
    <>
      {}
      <section className="component table-component">
        <div className="section-head">
          <h3 className="title">Recent transactions</h3>
          {/* <a href="#">
            See all <i className="bi bi-arrow-right"></i>
          </a> */}
        </div>
        <div className="table-responsive">
          <table className="table table-dark">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Description</th>
                <th scope="col">Type</th>
                <th scope="col">Amount</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" className="text-center">
                    <div className="spinner-grow text-light" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="5" className="text-center">
                    Oops. something went wrong.
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t.id} role="button" onClick={() => onTxnClick?.(t)}>
                    <td>{formatDateTime(t.created_at)}</td>
                    <td className="text-truncate description">{t.description}</td>
                    <td>{t.type}</td>
                    <td className={txnTypeColor(t.type, t.customer_id)}>
                      {txnIcon(t.type, t.customer_id)}&nbsp;
                      {to_$(t.amount)}
                    </td>
                    <td className={txnStatusColor(t.status)}>{t.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <TransactionModal show={showModal} onClose={() => setShowModal(false)} transaction={selectedTxn} />
    </>
  );
}

export default TransactionTable;
