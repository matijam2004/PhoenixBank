import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { cardApplicationsAPI } from "../services/api/card_applications";
import { useOAuthToken } from "../hooks/useOAuthToken";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../styles/card-review.css";

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

const STATUS_FILTERS = ["pending", "approved", "rejected", "all"];

function fmt$(n) { return `$${Number(n || 0).toLocaleString()}`; }
function fmtDate(d) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtTime(d) {
  return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function CardReviewPage() {
  useOAuthToken();

  const [apps,        setApps]        = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [filter,      setFilter]      = useState("pending");
  const [search,      setSearch]      = useState("");
  const [expandedId,    setExpandedId]    = useState(null);
  const [expandedDetail, setExpandedDetail] = useState({}); // id -> full detail with ssn/dob
  const [actionBusy,    setActionBusy]    = useState({});
  const [rejectModal,   setRejectModal]   = useState({ open: false, app: null, reason: "" });

  const expandApp = useCallback(async (id) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (!expandedDetail[id]) {
      try {
        const full = await cardApplicationsAPI.getOne(id);
        setExpandedDetail(prev => ({ ...prev, [id]: full }));
      } catch (err) {
        console.error("Failed to load application detail:", err);
      }
    }
  }, [expandedId, expandedDetail]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await cardApplicationsAPI.getAll(null);
      setApps(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  /* stats */
  const pending  = apps.filter(a => a.status === "pending").length;
  const approved = apps.filter(a => a.status === "approved").length;
  const rejected = apps.filter(a => a.status === "rejected").length;

  /* today's approvals */
  const today = new Date().toDateString();
  const approvedToday = apps.filter(a => a.status === "approved" && a.reviewed_at && new Date(a.reviewed_at).toDateString() === today).length;

  /* filtered + searched list */
  const visible = useMemo(() => {
    let list = filter === "all" ? apps : apps.filter(a => a.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        `${a.first_name} ${a.last_name}`.toLowerCase().includes(q) ||
        a.card_name.toLowerCase().includes(q) ||
        a.city?.toLowerCase().includes(q) ||
        a.employment?.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [apps, filter, search]);

  const handleApprove = async (app) => {
    setActionBusy(p => ({ ...p, [app._id]: "approving" }));
    try {
      await cardApplicationsAPI.approve(app._id);
      setApps(prev => prev.map(a => a._id === app._id
        ? { ...a, status: "approved", reviewed_at: new Date().toISOString() }
        : a
      ));
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setActionBusy(p => ({ ...p, [app._id]: null }));
    }
  };

  const handleRejectConfirm = async () => {
    const { app, reason } = rejectModal;
    setActionBusy(p => ({ ...p, [app._id]: "rejecting" }));
    try {
      await cardApplicationsAPI.reject(app._id, reason);
      setApps(prev => prev.map(a => a._id === app._id
        ? { ...a, status: "rejected", reviewed_at: new Date().toISOString(), rejection_reason: reason }
        : a
      ));
      setRejectModal({ open: false, app: null, reason: "" });
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setActionBusy(p => ({ ...p, [app._id]: null }));
    }
  };

  if (loading) return (
    <div className="cr-loading" style={{ background: "#080808" }}>
      <div className="cr-spinner" />
    </div>
  );

  return (
    <div className="cr-page">

      {/* ── HEADER ── */}
      <div className="cr-header">
        <div className="cr-header-left">
          <Link to="/manager-dashboard" className="cr-back-btn">
            <i className="bi bi-arrow-left" /> Dashboard
          </Link>
          <div className="cr-header-title-group">
            <span className="cr-eyebrow">Manager Portal</span>
            <h1 className="cr-title">
              Card Applications
              {pending > 0 && <span className="cr-pending-badge">{pending} pending</span>}
            </h1>
          </div>
        </div>
        <button className="cr-back-btn" onClick={load} style={{ gap: 6 }}>
          <i className="bi bi-arrow-clockwise" /> Refresh
        </button>
      </div>

      {/* ── STATS ── */}
      <div className="cr-stats">
        <div className="cr-stat">
          <div className="cr-stat-label">Pending Review</div>
          <div className="cr-stat-value" style={{ color: "#c9a84c" }}>{pending}</div>
          <div className="cr-stat-sub">Awaiting decision</div>
        </div>
        <div className="cr-stat">
          <div className="cr-stat-label">Approved Today</div>
          <div className="cr-stat-value" style={{ color: "#4ade80" }}>{approvedToday}</div>
          <div className="cr-stat-sub">{approved} total approved</div>
        </div>
        <div className="cr-stat">
          <div className="cr-stat-label">Rejected</div>
          <div className="cr-stat-value" style={{ color: "#f87171" }}>{rejected}</div>
          <div className="cr-stat-sub">
            {apps.length > 0 ? `${Math.round((rejected / apps.length) * 100)}% rejection rate` : "No applications"}
          </div>
        </div>
        <div className="cr-stat">
          <div className="cr-stat-label">Total Applications</div>
          <div className="cr-stat-value">{apps.length}</div>
          <div className="cr-stat-sub">All time</div>
        </div>
      </div>

      {/* ── TOOLBAR ── */}
      <div className="cr-toolbar">
        <div className="cr-search">
          <i className="bi bi-search cr-search-icon" />
          <input
            className="cr-search-input"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, card, city…"
          />
        </div>
        <div className="cr-filter-pills">
          {STATUS_FILTERS.map(f => (
            <button
              key={f}
              className={`cr-filter-pill ${filter === f ? "cr-filter-pill--active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
              {f === "pending" && pending > 0 && (
                <span className="cr-pill-count">{pending}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── LIST ── */}
      {visible.length === 0 ? (
        <div className="cr-empty">
          <div className="cr-empty-icon"><i className="bi bi-credit-card-2-front" /></div>
          <h2 className="cr-empty-title">No {filter !== "all" ? filter : ""} applications</h2>
          <p className="cr-empty-sub">When customers apply for cards, they'll appear here.</p>
        </div>
      ) : (
        <div className="cr-list">
          {visible.map(app => {
            const img      = CARD_IMAGES[app.card_id];
            const isOpen   = expandedId === app._id;
            const busy     = actionBusy[app._id];
            // Use full detail (with ssn/dob) when expanded, fall back to list data
            const detail   = expandedDetail[app._id] || app;

            return (
              <div
                key={app._id}
                className={`cr-app-row ${isOpen ? "cr-app-row--expanded" : ""}`}
              >
                {/* ── SUMMARY ROW ── */}
                <div
                  className="cr-app-summary"
                  onClick={() => expandApp(app._id)}
                >
                  {/* card thumbnail */}
                  <div className="cr-app-thumb">
                    {img
                      ? <img src={img} alt={app.card_name} />
                      : <div style={{ width: "100%", height: "100%", background: "#1a1200" }} />
                    }
                  </div>

                  {/* applicant */}
                  <div>
                    <div className="cr-app-name">{app.first_name} {app.last_name}</div>
                    <div className="cr-app-location">{app.city}, {app.state} {app.zip}</div>
                  </div>

                  {/* card */}
                  <div>
                    <div className="cr-app-card-name">{app.card_name}</div>
                    <div className="cr-app-card-id">{app.card_id}</div>
                  </div>

                  {/* income */}
                  <div>
                    <div className="cr-app-income">{fmt$(app.income)}<span style={{ fontSize: 10, color: "#555" }}>/yr</span></div>
                    <div className="cr-app-employ">{app.employment}</div>
                  </div>

                  {/* date */}
                  <div className="cr-app-date">{fmtDate(app.created_at)}</div>

                  {/* status */}
                  <div>
                    <span className={`cr-status cr-status--${app.status}`}>
                      <span className="cr-status-dot" />
                      {app.status}
                    </span>
                  </div>

                  {/* chevron */}
                  <div className="cr-app-chevron">
                    <i className="bi bi-chevron-down" />
                  </div>
                </div>

                {/* ── EXPANDED DETAIL ── */}
                {isOpen && (
                  <div className="cr-app-detail">
                    {/* left: card image */}
                    <div className="cr-detail-card-col">
                      <div className="cr-detail-card-img">
                        {img
                          ? <img src={img} alt={app.card_name} />
                          : <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg,#1a1200,#3d2c00)" }} />
                        }
                      </div>
                      <div className="cr-detail-card-name">{app.card_name}</div>
                      <div className="cr-detail-card-cat">Application</div>
                    </div>

                    {/* right: info + actions */}
                    <div className="cr-detail-info-col">
                      <div className="cr-detail-grid">
                        {/* personal — uses full detail fetch so ssn/dob are available */}
                        <div className="cr-detail-section">
                          <div className="cr-detail-section-title">Personal Info</div>
                          <div className="cr-detail-field">
                            <div className="cr-detail-key">Full Name</div>
                            <div className="cr-detail-val">{detail.first_name} {detail.last_name}</div>
                          </div>
                          <div className="cr-detail-field">
                            <div className="cr-detail-key">Date of Birth</div>
                            <div className="cr-detail-val">{detail.dob || "—"}</div>
                          </div>
                          <div className="cr-detail-field">
                            <div className="cr-detail-key">SSN Last 4</div>
                            <div className="cr-detail-val">···· {detail.ssn_last4 || "—"}</div>
                          </div>
                          <div className="cr-detail-field">
                            <div className="cr-detail-key">Address</div>
                            <div className="cr-detail-val">{detail.address}</div>
                            <div className="cr-detail-val">{detail.city}, {detail.state} {detail.zip}</div>
                          </div>
                        </div>

                        {/* financial */}
                        <div className="cr-detail-section">
                          <div className="cr-detail-section-title">Financial Info</div>
                          <div className="cr-detail-field">
                            <div className="cr-detail-key">Annual Income</div>
                            <div className="cr-detail-val">{fmt$(app.income)}</div>
                          </div>
                          <div className="cr-detail-field">
                            <div className="cr-detail-key">Employment</div>
                            <div className="cr-detail-val" style={{ textTransform: "capitalize" }}>{app.employment}</div>
                          </div>
                          {app.employer && (
                            <div className="cr-detail-field">
                              <div className="cr-detail-key">Employer</div>
                              <div className="cr-detail-val">{app.employer}</div>
                            </div>
                          )}
                          <div className="cr-detail-field">
                            <div className="cr-detail-key">Housing</div>
                            <div className="cr-detail-val" style={{ textTransform: "capitalize" }}>{app.housing}</div>
                          </div>
                          {app.monthly_rent > 0 && (
                            <div className="cr-detail-field">
                              <div className="cr-detail-key">Monthly Rent</div>
                              <div className="cr-detail-val">{fmt$(app.monthly_rent)}/mo</div>
                            </div>
                          )}
                          <div className="cr-detail-field">
                            <div className="cr-detail-key">Applied</div>
                            <div className="cr-detail-val">{fmtTime(app.created_at)}</div>
                          </div>
                        </div>
                      </div>

                      {/* rejection reason if present */}
                      {app.status === "rejected" && app.rejection_reason && (
                        <div className="cr-reject-reason">
                          <div className="cr-reject-reason-label">Rejection Reason</div>
                          <div className="cr-reject-reason-text">{app.rejection_reason}</div>
                        </div>
                      )}

                      {/* action bar */}
                      <div className="cr-action-bar">
                        {app.status === "pending" && (
                          <>
                            <button
                              className="cr-approve-btn"
                              disabled={!!busy}
                              onClick={() => handleApprove(app)}
                            >
                              {busy === "approving"
                                ? <><i className="bi bi-hourglass-split" /> Approving…</>
                                : <><i className="bi bi-check-lg" /> Approve</>
                              }
                            </button>
                            <button
                              className="cr-reject-btn"
                              disabled={!!busy}
                              onClick={() => setRejectModal({ open: true, app, reason: "" })}
                            >
                              {busy === "rejecting"
                                ? <><i className="bi bi-hourglass-split" /> Rejecting…</>
                                : <><i className="bi bi-x-lg" /> Reject</>
                              }
                            </button>
                          </>
                        )}
                        {app.status !== "pending" && (
                          <span className={`cr-status cr-status--${app.status}`}>
                            <span className="cr-status-dot" />
                            {app.status === "approved" ? "Approved" : "Rejected"}
                          </span>
                        )}
                        {app.reviewed_at && (
                          <span className="cr-action-bar-reviewed">
                            Reviewed {fmtTime(app.reviewed_at)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── REJECT MODAL ── */}
      {rejectModal.open && (
        <div className="cr-modal-overlay" onClick={e => e.target === e.currentTarget && setRejectModal({ open: false, app: null, reason: "" })}>
          <div className="cr-modal">
            <h2 className="cr-modal-title">Reject Application</h2>
            <p className="cr-modal-sub">
              Rejecting <strong>{rejectModal.app?.card_name}</strong> for{" "}
              <strong>{rejectModal.app?.first_name} {rejectModal.app?.last_name}</strong>
            </p>
            <label className="cr-modal-label">Reason (optional)</label>
            <textarea
              className="cr-modal-textarea"
              value={rejectModal.reason}
              onChange={e => setRejectModal(p => ({ ...p, reason: e.target.value }))}
              placeholder="e.g. Insufficient income, unable to verify employment…"
              rows={3}
            />
            <div className="cr-modal-footer">
              <button className="cr-modal-cancel" onClick={() => setRejectModal({ open: false, app: null, reason: "" })}>
                Cancel
              </button>
              <button className="cr-modal-confirm" onClick={handleRejectConfirm}>
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
