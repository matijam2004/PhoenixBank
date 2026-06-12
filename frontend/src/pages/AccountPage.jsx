import { useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { useTransactionsByAccount } from "../hooks/transactions";
import { useAccount } from "../hooks/accounts";
import { useUser } from "../hooks/auth";
import TransactionTable from "../components/TransactionTable";

// CSS imports
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../styles/styles-new.css";
import "../styles/account-banner.css";
import "../styles/transactions-table.css";
import { formatDateTime } from "../utils/dates";
import { capitalize, maskId } from "../utils/strings";
import { to_$ } from "../utils/numbers";

export default function AccountPage() {
  const navigate = useNavigate();

  const { id } = useParams(); // accountId from route
  const location = useLocation();

  const { data: user, isLoading: userLoading, error: userError } = useUser();
  const { data: account, isLoading: accLoading, error: accError } = useAccount(id);
  const { data: transactions = { items: [] }, isLoading: txnLoading, error: txnError } = useTransactionsByAccount(user?._id, account?._id);

  const [visible, setVisible] = useState(false);

  const toggleVisibility = () => setVisible((prev) => !prev);

  const depositCheckClick = () => {
    navigate("/deposit-check", { state: { user, account } });
  };

  const cashDepositClick = () => {
    navigate("/atm-locator", { state: { user, account } });
  };

  const transferClick = () => {
    navigate("/transfer", { state: { user, account } });
  };

  if (!account) {
    return (
      <div className="container">
        <div>404: Account not found.</div>
        <button className="btn btn-sm btn-outline-secondary" onClick={() => navigate("/dashboard")}>
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="container">
        <div className="component component-emphasized account-banner">
          <h2 className="type text-gold">{capitalize(account.account_type)}</h2>
          <div className="top-info">
            <div className="routing-no">
              <span className="text-gray">Routing No.</span>&nbsp; 123456789
            </div>
            <div className="account-id">
              <span className="text-gray">Account No.</span> {visible ? account._id.toUpperCase() : maskId(account._id, 4)}
              <a type="button" className="btn btn-sm text-white" onClick={toggleVisibility}>
                {visible ? <i className="bi bi-eye-fill"></i> : <i className="bi bi-eye"></i>}
              </a>
            </div>
          </div>
          <p className="balance-label text-gray">Total Available Balance</p>
          <h1 className="balance">{to_$(account.balance)}</h1>
          <div className="info">
            <span className="status badge-custom">{capitalize(account.status)}</span>
            <span className="created text-gray">Created in {formatDateTime(account.created_at, "dt")}</span>
          </div>
          <div className="actions">
            <div className="dropdown">
              <button className="btn btn-simple" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                <i className="bi bi-box-arrow-in-down"></i>
                Deposit
              </button>

              <ul className="dropdown-menu">
                <li>
                  <a className="dropdown-item" href="#" onClick={() => depositCheckClick()}>
                    <i className="bi bi-card-text"></i>&nbsp; Deposit Check
                  </a>
                </li>
                <li>
                  <a className="dropdown-item" href="#" onClick={() => cashDepositClick()}>
                    <i className="bi bi-cash-stack"></i>&nbsp; Cash Deposit
                  </a>
                </li>
              </ul>
            </div>
            <button className="btn btn-simple" type="button" href="#" onClick={() => transferClick()}>
              <i className="bi bi-arrow-left-right"></i>
              Transfer
            </button>
          </div>
        </div>

        <TransactionTable transactions={transactions.items} user={user} loading={txnLoading} error={txnError} />
      </div>
    </>
  );
}
