// Footer with scale and fade animation on scroll
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import "../styles/footer.css";

export default function Footer() {
  const ref = useRef(null);

  // Scale up and fade in footer as it enters viewport
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleScroll = () => {
      const rect = el.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      
      // Calculate how much footer is in view
      const scrollProgress = Math.max(0, Math.min(1, 
        (windowHeight - rect.top) / (windowHeight * 0.8)
      ));

      const scale = 0.95 + (scrollProgress * 0.05);
      const opacity = scrollProgress;

      el.style.transform = `scale(${scale})`;
      el.style.opacity = opacity;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <footer ref={ref} className="footer-section">
      <div className="footer-wrapper">
        
        {/* Big Background Text */}
        <div className="footer-bg-text">Phoenix</div>

        {/* About Section */}
        <div className="footer-about">
          <h2 className="footer-heading">ABOUT US</h2>
          <p className="footer-subheading">Get financial visibility all in one place</p>
        </div>

        {/* Navigation Grid */}
        <div className="footer-grid">
          <div className="footer-col">
            <h4>COMPANY</h4>
            <ul>
              <li><Link to="/about">About</Link></li>
              <li><Link to="/about">Careers</Link></li>
              <li><Link to="/about">Press</Link></li>
              <li><Link to="/contact">Contact</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>PRODUCTS</h4>
            <ul>
              <li><Link to="/cards">Credit Cards</Link></li>
              <li><Link to="/cards">Lifestyle</Link></li>
              <li><Link to="/cards">Business</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>RESOURCES</h4>
            <ul>
              <li><Link to="/about">Security</Link></li>
              <li><Link to="/contact">FAQs</Link></li>
              <li><Link to="/contact">Support</Link></li>
              <li><Link to="/about">Blog</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>SERVICES</h4>
            <ul>
              <li><Link to="/loans">Home Loans</Link></li>
              <li><Link to="/travel">Travel</Link></li>
              <li><Link to="/rewards">Rewards & Benefits</Link></li>
              <li><Link to="/cards">Cards</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="footer-bottom">
          <p>© 2025 Phoenix Bank. All rights reserved.</p>
          <p>Member FDIC. Equal Housing Lender.</p>
        </div>

      </div>
    </footer>
  );
}