// Features section with animated cards
import { useEffect, useRef } from "react";
import "../styles/features.css";

export default function Features() {
  const ref = useRef(null);

  // Animate features on scroll into view
  useEffect(() => {
    if (!window.anime) return;
    
    const el = ref.current;
    if (!el) return;

    const anime = window.anime;

    // Trigger animations when section comes into view
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Animate title
            anime({
              targets: '.features-title',
              translateY: [50, 0],
              opacity: [0, 1],
              duration: 1000,
              delay: 200,
              easing: 'easeOutExpo'
            });

            // Stagger feature cards
            anime({
              targets: '.feature-card',
              scale: [0.9, 1],
              opacity: [0, 1],
              duration: 800,
              delay: anime.stagger(100, {start: 400}),
              easing: 'easeOutExpo'
            });

            io.disconnect();
          }
        });
      },
      { threshold: 0.2 }
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section id="features" ref={ref} className="features-section">
      <div className="features-container">
        <h2 className="features-title">Everything you need to manage your finances</h2>
        
        <div className="features-grid">
          <div className="feature-card feature-large">
            <div className="feature-icon-wrapper">
              <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="2" y="7" width="20" height="14" rx="2" strokeWidth="2"/>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" strokeWidth="2"/>
              </svg>
            </div>
            <h3>Premium Cards</h3>
            <p>Metal cards with up to 3% cashback on all purchases. No annual fees, no foreign transaction fees.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="5" y="11" width="14" height="10" rx="2" strokeWidth="2"/>
                <path d="M12 11V7M9 7h6M12 14v3" strokeWidth="2"/>
              </svg>
            </div>
            <h3>Bank-Level Security</h3>
            <p>FDIC insured up to $250,000 with military-grade encryption.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeWidth="2"/>
              </svg>
            </div>
            <h3>Instant Transfers</h3>
            <p>Move money instantly between accounts with zero fees.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="3" y="3" width="7" height="7" strokeWidth="2"/>
                <rect x="14" y="3" width="7" height="7" strokeWidth="2"/>
                <rect x="14" y="14" width="7" height="7" strokeWidth="2"/>
                <rect x="3" y="14" width="7" height="7" strokeWidth="2"/>
              </svg>
            </div>
            <h3>Smart Analytics</h3>
            <p>Track spending, set budgets, and get insights on your finances.</p>
          </div>

          <div className="feature-card feature-wide">
            <div className="feature-icon-wrapper">
              <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" strokeWidth="2"/>
              </svg>
            </div>
            <h3>Global Access</h3>
            <p>Use your card anywhere in the world. Send international payments in minutes, not days.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon-wrapper">
              <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="5" y="2" width="14" height="20" rx="2" strokeWidth="2"/>
                <path d="M12 18h.01" strokeWidth="2"/>
              </svg>
            </div>
            <h3>Mobile First</h3>
            <p>Full-featured iOS and Android apps with biometric login.</p>
          </div>
        </div>
      </div>
    </section>
  );
}