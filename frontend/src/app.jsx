import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage.jsx";
import SignUpPage from "./pages/SignUpPage.jsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";
import CompleteProfilePage from "./pages/CompleteProfilePage.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ManagerDashboard from "./pages/ManagerDashboard.jsx";
import AccountPage from "./pages/AccountPage.jsx";
import Navbar from "./components/Navbar";
import Transfer from "./components/Transfer.jsx";
import DepositCheck from "./pages/DepositCheck.jsx";
import ATMLocator from "./pages/ATMLocator";
import Cards from "./pages/Cards.jsx";
import ScheduledPaymentsPage from "./pages/ScheduledPaymentsPage.jsx";
import TransactionsPage from "./pages/TransactionsPage.jsx";
import Checks from "./pages/manager/ChecksPage.jsx";
import PageTransition from "./components/PageTransition";
import TransitionOverlay from "./components/TransitionOverlay";
import ScrollToTop from "./components/ScrollToTop";
import "./styles/pageTransition.css";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import Rewards from "./pages/Rewards.jsx";
import ChaseATMpage from "./pages/ChaseATMpage.jsx";
import { useUser } from "./hooks/auth";
import { getAuthToken } from "./services/api/http";
import HTTP404 from "./pages/HTTP404.jsx";
import HomeLoans from "./pages/HomeLoans.jsx";
import Travel from "./pages/Travel.jsx";
import AboutPage from "./pages/About.jsx";
import Contact from "./pages/Contact.jsx";
import VerifyEmail from "./pages/VerifyEmail.jsx";
import VerifyEmailPending from "./pages/VerifyEmailPending.jsx";
import CardApplicationPage from "./pages/CardApplicationPage.jsx";
import CardReviewPage from "./pages/CardReviewPage.jsx";

export const queryClient = new QueryClient();

function ProfileCompletenessChecker({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: user, isLoading: userLoading } = useUser();

  // Only check if user is logged in and not on auth pages
  const publicPages = ["/", "/login", "/signup", "/forgot-password", "/reset-password", "/complete-profile"];
  const isPublicPage = publicPages.some((page) => location.pathname === page || location.pathname.replace(/\/$/, "") === page);

  const token = getAuthToken();
  const isLoggedIn = !!token;

  // If loading user data and on a protected page, show loading
  if (userLoading && isLoggedIn && !isPublicPage) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          fontSize: "1.2rem",
        }}
      >
        Loading...
      </div>
    );
  }

  // Check profile completeness for customers BEFORE rendering routes
  // Skip this check entirely if we're already on the complete-profile page to prevent redirect loops
  if (!isPublicPage && isLoggedIn && !userLoading && user && location.pathname !== "/complete-profile") {
    const userType = localStorage.getItem("user_type");
    if (userType === "customer") {
      const isIncomplete =
        !user.phone || !user.phone.trim() || !user.street || !user.street.trim() || !user.city || !user.city.trim() || !user.state || !user.state.trim() || !user.zip || !user.zip.trim();

      if (isIncomplete) {
        navigate("/complete-profile", { replace: true });
        return (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100vh",
              fontSize: "1.2rem",
            }}
          >
            Redirecting...
          </div>
        );
      }
    }
  }

  // If check passes or is public page, render children (routes)
  return children;
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            <PageTransition>
              <LandingPage />
            </PageTransition>
          }
        />
        <Route
          path="/login"
          element={
            <PageTransition>
              <LoginPage />
            </PageTransition>
          }
        />
        <Route
          path="/signup"
          element={
            <PageTransition>
              <SignUpPage />
            </PageTransition>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PageTransition>
              <ForgotPasswordPage />
            </PageTransition>
          }
        />
        <Route
          path="/reset-password"
          element={
            <PageTransition>
              <ResetPasswordPage />
            </PageTransition>
          }
        />
        <Route
          path="/complete-profile"
          element={
            <PageTransition>
              <CompleteProfilePage />
            </PageTransition>
          }
        />
        <Route
          path="/dashboard"
          element={
            <PageTransition>
              <Dashboard />
            </PageTransition>
          }
        />
        <Route
          path="/manager-dashboard"
          element={
            <PageTransition>
              <ManagerDashboard />
            </PageTransition>
          }
        />
        <Route
          path="/deposit-check"
          element={
            <PageTransition>
              <DepositCheck />
            </PageTransition>
          }
        />
        <Route
          path="/transfer"
          element={
            <PageTransition>
              <Transfer />
            </PageTransition>
          }
        />
        <Route
          path="/atm-locator"
          element={
            <PageTransition>
              <ATMLocator />
            </PageTransition>
          }
        />
        <Route
          path="/accounts/:id"
          element={
            <PageTransition>
              <AccountPage />
            </PageTransition>
          }
        />
        <Route
          path="/scheduled-payments"
          element={
            <PageTransition>
              <ScheduledPaymentsPage />
            </PageTransition>
          }
        />
        <Route
          path="/cards"
          element={
            <PageTransition>
              <Cards />
            </PageTransition>
          }
        />
        <Route
          path="/rewards"
          element={
            <PageTransition>
              <Rewards />
            </PageTransition>
          }
        />

        <Route
          path="/transactions"
          element={
            <PageTransition>
              <TransactionsPage />
            </PageTransition>
          }
        />
        <Route
          path="/chase-atm"
          element={
            <PageTransition>
              <ChaseATMpage />
            </PageTransition>
          }
        />
        <Route
          path="/checks"
          element={
            <PageTransition>
              <Checks />
            </PageTransition>
          }
        />
        <Route
          path="/loans"
          element={
            <PageTransition>
              <HomeLoans />
            </PageTransition>
          }
        />
        <Route
          path="/home-loans"
          element={
            <PageTransition>
              <HomeLoans />
            </PageTransition>
          }
        />
        <Route
          path="/travel"
          element={
            <PageTransition>
              <Travel />
            </PageTransition>
          }
        />
        <Route
          path="/about"
          element={
            <PageTransition>
              <AboutPage />
            </PageTransition>
          }
        />
        <Route
          path="/contact"
          element={
            <PageTransition>
              <Contact />
            </PageTransition>
          }
        />
          
        <Route
          path="/verify-email"
          element={
            <PageTransition>
              <VerifyEmail />
            </PageTransition>
          }
        />
        <Route
          path="/verify-email-pending"
          element={
            <PageTransition>
              <VerifyEmailPending />
            </PageTransition>
          }
        />

        <Route
          path="/apply-card"
          element={
            <PageTransition>
              <CardApplicationPage />
            </PageTransition>
          }
        />
        <Route
          path="/manager/card-review"
          element={
            <PageTransition>
              <CardReviewPage />
            </PageTransition>
          }
        />

        <Route
          path="*"
          element={
            <PageTransition>
              <HTTP404 />
            </PageTransition>
          }
        />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ScrollToTop />
        <TransitionOverlay isLoggedIn={false} />
        <Navbar />
        <ProfileCompletenessChecker>
          <AnimatedRoutes />
        </ProfileCompletenessChecker>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
