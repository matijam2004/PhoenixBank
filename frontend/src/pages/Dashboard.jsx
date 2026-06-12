import { useMemo, useEffect, useState } from "react";

import { useAccounts } from "../hooks/accounts";
import { useTransactions } from "../hooks/transactions";
import { useUser } from "../hooks/auth";
import { useOAuthToken } from "../hooks/useOAuthToken";

import { capitalize, maskId } from "../utils/strings";
import { to_$, to_percent } from "../utils/numbers";
import { formatDateTime, getLastAndCurrentMonthRange } from "../utils/dates";
import { countTransactionsTodayByAccount, getMonthlyChangeBuckets } from "../utils/transactions";
import { Link, useNavigate } from "react-router-dom";
import TransactionTable from "../components/TransactionTable";
import { reportingAPI } from "../services/api/reporting";
import { downloadFile } from "../utils/download";
import { cardApplicationsAPI } from "../services/api/card_applications";

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../styles/styles-new.css";
import "../styles/dashboard.css";

const CARD_IMAGES = {
  "c-by-phoenix":      "/images/phoenix-credit-card.png",
  "platinum-business": "/images/PhoenixBlue.png",
  "blue":              "/images/PhoenixTravel.png",
  "polo":              "/images/PhoenixAdventure.png",
  "glamour":           "/images/PhoenixLifestyle.png",
  "billionaire":       "/images/BusinessClassic.png",
  "titanium":          "/images/BusinessGlobal.png",
  "diamond":           "/images/BusinessElite.png",
};

const CARD_PERKS = {
  "c-by-phoenix":      [{ icon: "bi-airplane-fill", text: "Private aviation access" }, { icon: "bi-building", text: "1,200+ global lounges" }, { icon: "bi-infinity", text: "Unlimited rewards, no cap" }],
  "platinum-business": [{ icon: "bi-building-fill", text: "Hotel upgrades at 500+ properties" }, { icon: "bi-headset", text: "24/7 premium support" }, { icon: "bi-bag-fill", text: "5× points at luxury retailers" }],
  "blue":              [{ icon: "bi-globe2", text: "Accepted in 200+ countries" }, { icon: "bi-luggage-fill", text: "Travel insurance up to €500K" }, { icon: "bi-map-fill", text: "Dedicated trip concierge" }],
  "polo":              [{ icon: "bi-shield-fill", text: "Extreme sports coverage" }, { icon: "bi-compass-fill", text: "2× points on outdoor activities" }, { icon: "bi-bandaid-fill", text: "24/7 rescue coordination" }],
  "glamour":           [{ icon: "bi-stars", text: "VIP fashion & art premiere access" }, { icon: "bi-heart-fill", text: "$500 annual wellness credit" }, { icon: "bi-gem", text: "5× points at luxury boutiques" }],
  "billionaire":       [{ icon: "bi-briefcase-fill", text: "Real-time expense management" }, { icon: "bi-people-fill", text: "Up to 10 employee sub-cards" }, { icon: "bi-bank2", text: "Dedicated account manager" }],
  "titanium":          [{ icon: "bi-currency-dollar", text: "Transact in 150+ currencies" }, { icon: "bi-bar-chart-fill", text: "AI-powered spend analytics" }, { icon: "bi-airplane-engines-fill", text: "Business travel priority" }],
  "diamond":           [{ icon: "bi-diamond-fill", text: "Tier 1 status at 200+ hotels" }, { icon: "bi-airplane-fill", text: "Private jet network access" }, { icon: "bi-person-badge-fill", text: "Full-time executive assistant" }],
};

function FlipCard({ img, name, last4, approvedDate, holderName, perks }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <div className="db-card-flip" onClick={() => setFlipped(f => !f)}>
      <div className={`db-card-flipper ${flipped ? "db-card-flipper--flipped" : ""}`}>
        {/* FRONT */}
        <div className="db-card-front">
          {img
            ? <img src={img} alt={name} draggable="false" />
            : <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#1a1200,#3d2c00)" }} />
          }
          <div className="db-card-overlay">
            <div className="db-card-overlay-top">
              <span className="db-card-bank">Phoenix Bank</span>
              <span className="db-card-status db-card-status--active">Active</span>
            </div>
            <div>
              <div className="db-card-name">{name}</div>
              <div className="db-card-since">Approved {approvedDate}</div>
            </div>
          </div>
        </div>

        {/* BACK */}
        <div className="db-card-back">
          <div className="db-card-back-top">
            <span className="db-card-back-bank">Phoenix Bank</span>
            <span className="db-card-back-status">Active</span>
          </div>
          <div className="db-card-back-name">{name}</div>
          <div className="db-card-back-divider" />

          {/* masked card number + holder */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontFamily: "monospace", fontSize: 12, color: "rgba(255,255,255,0.6)", letterSpacing: 2, marginBottom: 3 }}>
              •••• •••• •••• {last4}
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1 }}>
              {holderName}
            </div>
          </div>

          {/* perks */}
          <div className="db-card-back-perks">
            {perks.map((p, i) => (
              <div key={i} className="db-card-back-perk">
                <div className="db-card-back-perk-icon"><i className={`bi ${p.icon}`} /></div>
                <div className="db-card-back-perk-text">{p.text}</div>
              </div>
            ))}
          </div>

          <div className="db-card-back-footer">
            <span className="db-card-back-since">Since {approvedDate}</span>
            <span className="db-card-back-hint">Click to flip</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const [cardApps, setCardApps] = useState([]);

  const dateRange = getLastAndCurrentMonthRange();
  const navigate  = useNavigate();
  useOAuthToken();

  const { data: user,          isLoading: userLoading, error: userError } = useUser();
  const { data: accounts = [],  isLoading: aLoading }                     = useAccounts();
  const { data: transactions = { items: [] }, isLoading: txnLoading, error: txnError } =
    useTransactions(
      { customer_id: user?._id, start_date: dateRange.start_date, end_date: dateRange.end_date },
      { enabled: !!user?._id }
    );

  const { spending, savings } = getMonthlyChangeBuckets(transactions.items, user?._id);
  const totalBalance          = useMemo(() => accounts.reduce((sum, a) => sum + parseFloat(a.balance), 0), [accounts]);
  const transactionsToday     = countTransactionsTodayByAccount(transactions.items);
  const [downloading, setDownloading] = useState({ csv: false, pdf: false });

  const approvedCards = cardApps.filter(a => a.status === "approved");
  const pendingCards  = cardApps.filter(a => a.status === "pending");

  /* auth guard */
  useEffect(() => {
    const hasToken = localStorage.getItem("token") || localStorage.getItem("access_token");
    if (!userLoading && !hasToken && userError) {
      const isAuthError =
        userError?.status === 401 ||
        userError?.response?.status === 401 ||
        (typeof userError?.message === "string" &&
          (userError.message.includes("401") || userError.message.includes("Not authenticated")));
      if (isAuthError) navigate("/login", { replace: true });
    }
  }, [userLoading, userError, navigate]);

  /* force dark body */
  useEffect(() => {
    const prev  = document.body.style.background;
    const prevH = document.documentElement.style.background;
    const root  = document.getElementById("root");
    const prevR = root?.style.background ?? "";
    document.body.style.background = "#080808";
    document.documentElement.style.background = "#080808";
    if (root) root.style.background = "#080808";
    return () => {
      document.body.style.background = prev;
      document.documentElement.style.background = prevH;
      if (root) root.style.background = prevR;
    };
  }, []);

  /* load card applications */
  useEffect(() => {
    cardApplicationsAPI.getMy().then(apps => setCardApps(apps || [])).catch(() => {});
  }, []);

  /* guards */
  if (userLoading) return <div className="db-loading"><div className="db-spinner" /></div>;
  if (userError && userError.status !== 401) return <div>Something went wrong.</div>;
  if (user) {
    const userType = localStorage.getItem("user_type");
    if (userType === "customer") {
      const isIncomplete = !user.phone?.trim() || !user.street?.trim() || !user.city?.trim() || !user.state?.trim() || !user.zip?.trim();
      if (isIncomplete) { navigate("/complete-profile", { replace: true }); return null; }
    }
  }

  /* helpers */
  const accountClick = (a) => navigate(`/accounts/${a._id}`, { state: { user, account: a } });

  const handleDownload = (fmt) => async (e) => {
    e.preventDefault(); e.stopPropagation();
    if (downloading[fmt]) return;
    setDownloading(p => ({ ...p, [fmt]: true }));
    try {
      const { blob, filename } = await reportingAPI.downloadMyTransactions(fmt);
      if (!blob || blob.size === 0) { alert("No transactions yet."); return; }
      downloadFile(blob, filename);
    } catch (err) { alert(`Failed: ${err.message}`); }
    finally { setDownloading(p => ({ ...p, [fmt]: false })); }
  };

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const safe     = (v) => (isNaN(v) || !isFinite(v) ? null : v);
  const netChange = safe(((savings.current - spending.current) / (totalBalance || 1)) * 100);
  const initials  = user ? `${(user.first_name || "?")[0]}${(user.last_name || "?")[0]}`.toUpperCase() : "?";

  return (
    <div className="db-wrap">

      {/* ── GREETING ── */}
      <div className="db-greeting">
        <div className="db-greeting-left">
          <div className="db-avatar">{initials}</div>
          <div className="db-greeting-text">
            <p className="db-eyebrow">{greeting}</p>
            <h1 className="db-name">{user?.first_name ?? "…"} {user?.last_name ?? ""}</h1>
          </div>
        </div>
        <div className="db-greeting-right">
          <span className="db-date">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </span>
          <div className="db-status-pill">
            <span className="db-status-dot" />
            All Systems Normal
          </div>
        </div>
      </div>

      {/* ── KPI ROW ── */}
      <div className="db-kpi-row">
        <div className="db-kpi db-kpi--large">
          <div className="db-kpi-header">
            <span className="db-kpi-label">Total Balance</span>
            <i className="bi bi-wallet2 db-kpi-icon" />
          </div>
          <div className="db-kpi-value">{to_$(totalBalance)}</div>
          <div className="db-kpi-change db-kpi-change--neutral">
            {accounts.length} account{accounts.length !== 1 ? "s" : ""}
          </div>
        </div>

        <div className="db-kpi">
          <div className="db-kpi-header">
            <span className="db-kpi-label">Total Spent</span>
            <i className="bi bi-arrow-up-right db-kpi-icon" />
          </div>
          <div className="db-kpi-value">{to_$(spending.current)}</div>
          {safe(spending.changePct) !== null
            ? <div className={`db-kpi-change ${spending.changePct > 0 ? "db-kpi-change--down" : "db-kpi-change--up"}`}>
                {spending.changePct > 0 ? "↑" : "↓"} {Math.abs(to_percent(spending.changePct))} vs last month
              </div>
            : <div className="db-kpi-change db-kpi-change--neutral">No data last month</div>
          }
        </div>

        <div className="db-kpi">
          <div className="db-kpi-header">
            <span className="db-kpi-label">Total Earned</span>
            <i className="bi bi-arrow-down-left db-kpi-icon" />
          </div>
          <div className="db-kpi-value">{to_$(savings.current)}</div>
          {safe(savings.changePct) !== null
            ? <div className={`db-kpi-change ${savings.changePct > 0 ? "db-kpi-change--up" : "db-kpi-change--down"}`}>
                {savings.changePct > 0 ? "↑" : "↓"} {Math.abs(to_percent(savings.changePct))} vs last month
              </div>
            : <div className="db-kpi-change db-kpi-change--neutral">No data last month</div>
          }
        </div>

        <div className="db-kpi">
          <div className="db-kpi-header">
            <span className="db-kpi-label">Net Change</span>
            <i className="bi bi-bar-chart db-kpi-icon" />
          </div>
          <div className={`db-kpi-value ${netChange !== null ? (netChange >= 0 ? "db-val--green" : "db-val--red") : ""}`}>
            {netChange !== null ? `${netChange >= 0 ? "+" : ""}${netChange.toFixed(1)}%` : "—"}
          </div>
          <div className="db-kpi-change db-kpi-change--neutral">This month</div>
        </div>
      </div>

      {/* ── QUICK ACTIONS ── */}
      <div className="db-actions-row">
        <Link to="/transfer"           className="db-action-pill"><i className="bi bi-arrow-left-right" />Transfer</Link>
        <Link to="/deposit-check"      className="db-action-pill"><i className="bi bi-phone" />Deposit Check</Link>
        <Link to="/scheduled-payments" className="db-action-pill"><i className="bi bi-calendar3" />Scheduled Payments</Link>
        <Link to="/atm-locator"        className="db-action-pill"><i className="bi bi-geo-alt" />ATM Locator</Link>
        <Link to="/transactions"       className="db-action-pill"><i className="bi bi-list-ul" />All Transactions</Link>
      </div>

      {/* ── ACCOUNTS ── */}
      <div className="db-section" style={{ marginBottom: 16 }}>
        <div className="db-section-head">
          <div className="db-section-label">
            <span className="db-section-eyebrow">Banking</span>
            <h2 className="db-section-title">Your Accounts</h2>
          </div>
        </div>
        <div className="db-accounts-grid">
          {accounts.map(a => (
            <div key={String(a._id)} className="db-account-card" onClick={() => accountClick(a)}>
              <div className="db-account-header">
                <span className="db-account-type">{capitalize(a.account_type)}</span>
                <span className="db-account-badge">{a.status}</span>
              </div>
              <div className="db-account-balance">{to_$(parseFloat(a.balance))}</div>
              <div className="db-account-id">···· {maskId(a._id, 4)}</div>
              <div className="db-account-txn">{transactionsToday[a._id] || 0} transactions today</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CREDIT CARDS ── */}
      <div className="db-section" style={{ marginBottom: 16 }}>
        <div className="db-section-head">
          <div className="db-section-label">
            <span className="db-section-eyebrow">Financial Products</span>
            <h2 className="db-section-title">Credit Cards</h2>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Link to="/cards" className="db-outline-btn">Explore</Link>
            <Link to="/apply-card" className="db-apply-btn" style={{ margin: 0 }}>
              <i className="bi bi-plus-circle" /> Apply for a Card
            </Link>
          </div>
        </div>

        {approvedCards.length === 0 && pendingCards.length === 0 ? (
          <div className="db-no-cards">
            <div className="db-no-cards-icon"><i className="bi bi-credit-card-2-front" /></div>
            <div className="db-no-cards-title">No Active Cards</div>
            <p className="db-no-cards-sub">Unlock premium benefits with a Phoenix credit card. Apply in minutes.</p>
          </div>
        ) : (
          <div className="db-cards-grid">
            {approvedCards.map(card => {
              const img   = CARD_IMAGES[card.card_id];
              const perks = CARD_PERKS[card.card_id] || [];
              const last4 = String(card._id).slice(-4).toUpperCase();
              const approvedDate = new Date(card.reviewed_at || card.created_at)
                .toLocaleDateString("en-US", { month: "short", year: "numeric" });
              return (
                <FlipCard
                  key={card._id}
                  img={img}
                  name={card.card_name}
                  last4={last4}
                  approvedDate={approvedDate}
                  holderName={user ? `${user.first_name} ${user.last_name}` : ""}
                  perks={perks}
                />
              );
            })}
            {pendingCards.map(card => (
              <div key={card._id} className="db-pending-app">
                <div className="db-pending-icon"><i className="bi bi-hourglass-split" /></div>
                <div>
                  <div className="db-pending-name">{card.card_name}</div>
                  <div className="db-pending-sub">Under Review</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── TRANSACTIONS ── */}
      <div className="db-section">
        <div className="db-section-head">
          <div className="db-section-label">
            <span className="db-section-eyebrow">
              {formatDateTime(dateRange.start_date, "dt")} — {formatDateTime(dateRange.end_date, "dt")}
            </span>
            <h2 className="db-section-title">Recent Transactions</h2>
          </div>
          <div className="db-section-actions">
            <button className="db-outline-btn" onClick={handleDownload("csv")} disabled={downloading.csv}>
              {downloading.csv ? "…" : "CSV"}
            </button>
            <button className="db-outline-btn db-outline-btn--gold" onClick={handleDownload("pdf")} disabled={downloading.pdf}>
              {downloading.pdf ? "…" : "PDF"}
            </button>
          </div>
        </div>
        <TransactionTable transactions={transactions.items} user={user} loading={txnLoading} error={txnError} />
        <Link className="db-view-all" to="/transactions">View all transactions →</Link>
      </div>

      <footer style={{ height: 40 }} />
    </div>
  );
}

export default Dashboard;
