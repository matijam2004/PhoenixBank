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
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const accountsRef = useRef(null);

  // Close mobile menu on route change
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

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

  const publicLinks = [
    { to: "/", label: "Home" },
    { to: "/cards", label: "Cards" },
    { to: "/rewards", label: "Rewards & Benefits" },
    { to: "/home-loans", label: "Home Loans" },
    { to: "/travel", label: "Travel" },
    { to: "/about", label: "About" },
    { to: "/contact", label: "Contact" },
  ];

  const customerLinks = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/transfer", label: "Transfer" },
    { to: "/deposit-check", label: "Deposit Check" },
    { to: "/atm-locator", label: "ATM Locator" },
    { to: "/scheduled-payments", label: "Scheduled Payments" },
  ];

  const managerLinks = [
    { to: "/manager-dashboard", label: "Manager Dashboard" },
    { to: "/checks", label: "Review Checks" },
    { to: "/manager/card-review", label: "Card Review" },
  ];

  const activeLinks = !isLoggedIn
    ? publicLinks
    : (userType === "manager" || userType === "managers" ? managerLinks : customerLinks);

  return (
    <header>
      <nav>
        <Link to={isLoggedIn ? (userType === "manager" || userType === "managers" ? "/manager-dashboard" : "/dashboard") : "/"} className="logo">
          <img src="/images/Logo.png" alt="Phoenix Elite Banking" className="logo-img" />
        </Link>

        <ul className="nav-top-bar-links">
          {activeLinks.map(({ to, label }) => (
            <li key={to}><Link to={to}>{label}</Link></li>
          ))}
        </ul>

        <div className="nav-buttons">
          {!isLoggedIn ? (
            <>
              <Link to="/signup"><button className="btn-secondary" style={{boxShadow: 'none'}}>Create Account</button></Link>
              <Link to="/login"><button className="btn-primary" style={{boxShadow: 'none'}}>Log In</button></Link>
            </>
          ) : (
            <button className="btn-primary" onClick={handleLogout}>Logout</button>
          )}
        </div>

        {/* Hamburger button — mobile only */}
        <button
          className={`nav-hamburger ${menuOpen ? "open" : ""}`}
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Toggle menu"
        >
          <span /><span /><span />
        </button>
      </nav>

      {/* Mobile menu */}
      <div className={`nav-mobile-menu ${menuOpen ? "open" : ""}`}>
        <ul>
          {activeLinks.map(({ to, label }) => (
            <li key={to}><Link to={to}>{label}</Link></li>
          ))}
        </ul>
        {!isLoggedIn ? (
          <div className="nav-mobile-buttons">
            <Link to="/signup" onClick={() => setMenuOpen(false)}><button className="btn-secondary">Create Account</button></Link>
            <Link to="/login" onClick={() => setMenuOpen(false)}><button className="btn-primary">Log In</button></Link>
          </div>
        ) : (
          <div className="nav-mobile-buttons">
            <button className="btn-primary" onClick={handleLogout}>Logout</button>
          </div>
        )}
      </div>
    </header>
  );
}

export default Navbar;
