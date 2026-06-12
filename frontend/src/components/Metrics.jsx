// Metrics section with staggered reveal animation
import { useEffect, useRef } from "react";
import "../styles/metrics.css";

export default function Metrics() {
  const ref = useRef(null);

  // Animate metrics sections as user scrolls
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ltv = el.querySelector('.metrics-ltv');
    const slash = el.querySelector('.metrics-slash');
    const cac = el.querySelector('.metrics-cac');

    const handleScroll = () => {
      const rect = el.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      
      // How much section has entered viewport
      const enterProgress = Math.max(0, Math.min(1, 
        (windowHeight - rect.top) / windowHeight
      ));

      // How much section has exited viewport
      const exitProgress = Math.max(0, Math.min(1,
        (windowHeight - rect.bottom) / windowHeight
      ));

      const opacity = enterProgress * (1 - exitProgress);

      // First section: Trust (scales up)
      const ltvProgress = Math.max(0, enterProgress);
      const ltvScale = 0.5 + (ltvProgress * 0.5);
      ltv.style.transform = `scale(${ltvScale})`;
      ltv.style.opacity = opacity;

      // Divider slash (scales vertically with delay)
      const slashProgress = Math.max(0, Math.min(1, (enterProgress - 0.15) / 0.85));
      slash.style.transform = `scaleY(${slashProgress})`;
      slash.style.opacity = opacity;

      // Second section: Growth (scales up with delay)
      const cacProgress = Math.max(0, Math.min(1, (enterProgress - 0.25) / 0.75));
      const cacScale = 0.5 + (cacProgress * 0.5);
      cac.style.transform = `scale(${cacScale})`;
      cac.style.opacity = opacity;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section id="metrics" ref={ref} className="metrics-section">
      <div className="metrics-container">
        
        <div className="metrics-ltv">
          <h2 className="metrics-giant">Trust</h2>
          <div className="metrics-content">
            <p className="metrics-desc">
              Your money is protected with <span className="highlight">FDIC insurance</span> up 
              to $250,000. Bank-grade security keeps your accounts safe, and our commitment 
              to transparency means you always know where your money is.
            </p>
            <ul className="metrics-features">
              <li>FDIC insured deposits up to $250,000</li>
              <li>Bank-grade encryption and security</li>
              <li>24/7 fraud protection monitoring</li>
              <li>Transparent fees with no surprises</li>
            </ul>
          </div>
        </div>

        <div className="metrics-slash-container">
          <div className="metrics-slash"></div>
        </div>

        <div className="metrics-cac">
          <h2 className="metrics-giant">Growth</h2>
          <div className="metrics-content">
            <p className="metrics-desc">
              Build your financial future with <span className="highlight">high-yield savings</span>, 
              cashback rewards on every purchase, and investment tools that help your money work 
              harder for you.
            </p>
            <ul className="metrics-features">
              <li>Up to 3% cashback on all purchases</li>
              <li>Competitive savings account rates</li>
              <li>Automatic savings and investment tools</li>
              <li>Financial planning and budgeting features</li>
            </ul>
          </div>
        </div>

      </div>
    </section>
  );
}