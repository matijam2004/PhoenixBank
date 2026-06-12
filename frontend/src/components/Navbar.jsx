import { Link, useNavigate, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { authAPI } from "../services/api/auth";

function Navbar() {
  const location = useLocation();
  const queryClient = useQueryClient();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userType, setUserType] = useState(null);
  const [openAccounts, setOpenAccounts] = useState(false);
  const navigate = useNavigate();
  const accountsRef = useRef(null);

  // Re-derive auth state on mount and whenever another part of the app modifies
  // sessionStorage (e.g. after login/logout or an OAuth redirect). We cache
  // user_type separately so we don't have to decode the JWT on every render.
  useEffect(() => {
    const checkAuth = () => {
      const token = sessionStorage.getItem("token") || sessionStorage.getItem("access_token");
      setIsLoggedIn(!!token);

      const storedUserType = sessionStorage.getItem("user_type");
      if (storedUserType) {
        setUserType(storedUserType);
      } else if (token) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          const type = payload.scope || null;
          setUserType(type);
          if (type) sessionStorage.setItem("user_type", type);
        } catch (e) {
          // Malformed token — leave userType null and let the protected routes
          // handle the redirect.
        }
      } else {
        setUserType(null);
      }
    };

    checkAuth();
    window.addEventListener("storage", checkAuth);
    window.addEventListener("authChange", checkAuth);

    return () => {
      window.removeEventListener("storage", checkAuth);
      window.removeEventListener("authChange", checkAuth);
    };
  }, []);

  // Close the dropdown when the user clicks outside it or presses Escape.
  // Using a document-level listener rather than onBlur because the dropdown
  // contains focusable children and onBlur fires too eagerly.
  useEffect(() => {
    const onDocClick = (e) => {
      if (!accountsRef.current) return;
      if (!accountsRef.current.contains(e.target)) setOpenAccounts(false);
    };
    const onEsc = (e) => {
      if (e.key === "Escape") setOpenAccounts(false);
    };
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await authAPI.logout();

      // Wipe every auth artefact from sessionStorage and the cookie so the next
      // request can't accidentally carry a stale token.
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("access_token");
      sessionStorage.removeItem("user_id");
      sessionStorage.removeItem("user_type");
      document.cookie = "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

      setIsLoggedIn(false);
      setUserType(null);

      // Notify any other components listening for auth changes, then clear the
      // React Query cache so stale user data doesn't leak into the next session.
      window.dispatchEvent(new Event("authChange"));
      queryClient.clear();

      navigate("/");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // The password reset and complete-profile pages render their own full-screen
  // layouts that don't expect a floating navbar sitting on top of them.
  const authPages = ["/forgot-password", "/reset-password", "/complete-profile"];
  if (authPages.includes(location.pathname)) {
    return null;
  }

  return (
    <header>
      <nav>
        <Link to={isLoggedIn ? (userType === "manager" || userType === "managers" ? "/manager-dashboard" : "/dashboard") : "/"} className="logo">
          <img src="/images/Logo.png" alt="Phoenix Elite Banking" className="logo-img" />
        </Link>

        {!isLoggedIn ? (
          <>
            <ul className="nav-top-bar-links">
              <li>
                <Link to="/">Home</Link>
              </li>
              <li>
                <Link to="/cards">Cards</Link>
              </li>
              <li>
                <Link to="/rewards">Rewards & Benefits</Link>
              </li>
              <li>
                <Link to="/home-loans">Home Loans</Link>
              </li>
              <li>
                <Link to="/travel">Travel</Link>
              </li>
              <li>
                <Link to="/about">About</Link>
              </li>
              <li>
                <Link to="/contact">Contact</Link>
              </li>
            </ul>

            <div className="nav-buttons">
              <Link to="/signup">
                <button className="btn-secondary" style={{boxShadow: 'none'}}>Create Account</button>
              </Link>
              <Link to="/login">
                <button className="btn-primary" style={{boxShadow: 'none'}}>Log In</button>
              </Link>
            </div>
          </>
        ) : (
          <>
            {userType === "manager" || userType === "managers" ? (
              <>
                <ul className="nav-top-bar-links">
                  <li>
                    <Link to="/manager-dashboard">Manager Dashboard</Link>
                  </li>
                  <li>
                    <Link to="/checks">Review Checks</Link>
                  </li>
                  <li>
                    <Link to="/manager/card-review">Card Review</Link>
                  </li>
                </ul>
                <div className="nav-buttons">
                  <button className="btn-primary" onClick={handleLogout}>
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <ul className="nav-top-bar-links">
                  <li>
                    <Link to="/dashboard">Dashboard</Link>
                  </li>

                  {/* <li className="nav-dropdown" ref={accountsRef}>
                    <button className="nav-drop-trigger" aria-haspopup="true" aria-expanded={openAccounts ? "true" : "false"} onClick={() => setOpenAccounts((s) => !s)}>
                      Accounts{" "}
                      <span className={`caret ${openAccounts ? "open" : ""}`} aria-hidden>
                        ▾
                      </span>
                    </button>

                    {openAccounts && (
                      <ul className="nav-drop-menu" role="menu">
                        <li role="none">
                          <Link role="menuitem" to="/accounts/checking" onClick={() => setOpenAccounts(false)}>
                            Checking
                          </Link>
                        </li>
                        <li role="none">
                          <Link role="menuitem" to="/accounts/savings" onClick={() => setOpenAccounts(false)}>
                            Savings
                          </Link>
                        </li>
                        <li role="none">
                          <Link role="menuitem" to="/accounts/debit" onClick={() => setOpenAccounts(false)}>
                            Cards
                          </Link>
                        </li>
                      </ul>
                    )}
                  </li> */}

                  <li>
                    <Link to="/transfer">Transfer</Link>
                  </li>
                  <li>
                    <Link to="/deposit-check">Deposit Check</Link>
                  </li>
                  {/* <li>
                    <Link to="/bill-pay">Bill Pay</Link>
                  </li> */}
                  <li>
                    <Link to="/atm-locator">ATM Locator</Link>
                  </li>
                  {/* <li>
                    <Link to="/account-settings">Account Settings</Link>
                  </li> */}
                  <li>
                    <Link to="/scheduled-payments">Scheduled Payments</Link>
                  </li>
                </ul>

                <div className="nav-buttons">
                  <button className="btn-primary" onClick={handleLogout}>
                    Logout
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </nav>
    </header>
  );
}

export default Navbar;
