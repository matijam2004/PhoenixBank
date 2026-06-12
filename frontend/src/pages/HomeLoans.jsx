import React, { useState, useEffect } from "react";
import Footer from "../components/Footer";
import "../styles/homeloans.css";

// Scroll animation hook
const useScrollAnimation = () => {
  useEffect(() => {
    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      
      // Feature cards animation
      const cards = document.querySelectorAll('.loan-feature-card');
      cards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        if (rect.top < windowHeight * 0.85 && rect.bottom > 0) {
          card.classList.add('visible');
        } else {
          card.classList.remove('visible');
        }
      });
      
      // Benefits section animation
      const benefitsSection = document.querySelector('.loans-benefits-section');
      if (benefitsSection) {
        const rect = benefitsSection.getBoundingClientRect();
        if (rect.top < windowHeight * 0.75 && rect.bottom > 0) {
          benefitsSection.classList.add('animate-visible');
        } else {
          benefitsSection.classList.remove('animate-visible');
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    setTimeout(handleScroll, 100);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
};

export default function HomeLoans() {
  useScrollAnimation();

  const handleLoginClick = () => {
    window.location.href = '/login';
  };

  const handleApplyClick = () => {
    window.location.href = '/login';
  };

  const loanTypes = [
    {
      id: "fixed",
      name: "Fixed Rate Mortgage",
      rate: "6.25%",
      apr: "6.45%",
      description: "Lock in your interest rate for the life of your loan. Perfect for those who value stability and predictable monthly payments.",
      features: [
        "Rate locked for entire loan term",
        "Predictable monthly payments",
        "No rate fluctuations",
        "Available for 15, 20, and 30-year terms"
      ]
    },
    {
      id: "adjustable",
      name: "Adjustable Rate Mortgage",
      rate: "5.75%",
      apr: "5.95%",
      description: "Start with a lower initial rate that adjusts periodically. Ideal for those planning to move or refinance within a few years.",
      features: [
        "Lower initial interest rate",
        "Rate adjusts after initial period",
        "5/1, 7/1, and 10/1 ARM options",
        "Rate caps protect against large increases"
      ]
    },
    {
      id: "jumbo",
      name: "Jumbo Loan",
      rate: "6.50%",
      apr: "6.70%",
      description: "For high-value properties that exceed conventional loan limits. Tailored solutions for luxury real estate purchases.",
      features: [
        "Loans up to $3 million",
        "Competitive rates for large loans",
        "Flexible terms available",
        "Personalized service"
      ]
    },
    {
      id: "refinance",
      name: "Refinance",
      rate: "6.15%",
      apr: "6.35%",
      description: "Lower your monthly payment, reduce your interest rate, or tap into your home's equity. Multiple refinancing options available.",
      features: [
        "Rate and term refinancing",
        "Cash-out refinancing",
        "Streamlined application process",
        "Potential to save thousands"
      ]
    }
  ];

  const benefits = [
    {
      icon: "RATES",
      title: "Competitive Rates",
      description: "Access some of the most competitive mortgage rates in the market, backed by Phoenix Bank's financial strength."
    },
    {
      icon: "APPROVAL",
      title: "Fast Approval",
      description: "Streamlined application process with quick pre-approval, so you can make offers with confidence."
    },
    {
      icon: "ADVISOR",
      title: "Dedicated Advisor",
      description: "Work with a personal mortgage advisor who understands your needs and guides you through every step."
    },
    {
      icon: "SECURITY",
      title: "Secure & Trusted",
      description: "Your financial information is protected with bank-level security and industry-leading encryption."
    },
    {
      icon: "FLEXIBILITY",
      title: "Flexible Terms",
      description: "Choose from various loan terms and payment options that fit your financial situation and goals."
    },
    {
      icon: "EXPERTISE",
      title: "Expert Guidance",
      description: "Benefit from our team's expertise in real estate financing, from first-time buyers to investment properties."
    }
  ];

  const [selectedLoanType, setSelectedLoanType] = useState("fixed");
  const selectedLoan = loanTypes.find(loan => loan.id === selectedLoanType) || loanTypes[0];

  const [loanAmount, setLoanAmount] = useState(500000);
  const [interestRate, setInterestRate] = useState(6.25);
  const [loanTerm, setLoanTerm] = useState(30);

  const monthlyPayment = (() => {
    const principal = parseFloat(loanAmount) || 0;
    const annualRate = parseFloat(interestRate) || 0;
    const months = parseInt(loanTerm) * 12;
    if (principal <= 0 || annualRate <= 0 || months <= 0) return 0;
    const r = annualRate / 100 / 12;
    return principal * (r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
  })();

  return (
    <div className="home-loans-container">
      <div className="home-loans-header">
        <div className="home-loans-content">
          <h1 className="home-loans-title fade-in" style={{color: '#fff'}}>
            <span className="home-loans-line">Your Dream Home</span>
            <span className="home-loans-line">Awaits</span>
          </h1>
          <p className="home-loans-subtitle fade-in" style={{color: '#fff', animationDelay: '0.4s'}}>
            Experience competitive rates, personalized service, and a streamlined
            application process designed to make homeownership accessible and affordable.
          </p>
          <div className="home-loans-header-buttons fade-in" style={{animationDelay: '0.6s'}}>
            <button className="home-loans-cta-button primary" onClick={handleApplyClick}>Apply Now</button>
            <button className="home-loans-cta-button secondary" onClick={handleLoginClick}>Login</button>
          </div>
        </div>
        <div className="home-loans-bottom-text">
          <p>Trusted by thousands of families nationwide</p>
        </div>
      </div>

      {/* LOAN TYPES SECTION */}
      <section className="loan-types-section">
        <h2 className="section-title">Choose Your Mortgage Solution</h2>
        <p className="section-kicker">Find the perfect loan option for your needs</p>

        <div className="loan-types-tabs">
          {loanTypes.map((loan) => (
            <button
              key={loan.id}
              className={`loan-type-tab ${selectedLoanType === loan.id ? 'active' : ''}`}
              onClick={() => setSelectedLoanType(loan.id)}
            >
              <span className="loan-type-name">{loan.name}</span>
              <span className="loan-type-rate">{loan.rate} APR</span>
            </button>
          ))}
        </div>

        <div className="selected-loan-details">
          <div className="selected-loan-card">
            <div className="selected-loan-header">
              <h3 className="selected-loan-title">{selectedLoan.name}</h3>
              <div className="selected-loan-rate-box">
                <span className="rate-label">Starting at</span>
                <span className="rate-value">{selectedLoan.rate}</span>
                <span className="rate-apr">APR {selectedLoan.apr}</span>
              </div>
            </div>
            <p className="selected-loan-description">{selectedLoan.description}</p>
            <div className="selected-loan-features">
              <h4 className="features-title">Key Features:</h4>
              <ul className="features-list">
                {selectedLoan.features.map((feature, index) => (
                  <li key={index}>{feature}</li>
                ))}
              </ul>
            </div>
            <button className="apply-loan-button" onClick={handleApplyClick}>
              Apply for {selectedLoan.name}
            </button>
          </div>
        </div>
      </section>

      {/* BENEFITS SECTION */}
      <section className="loans-benefits-section">
        <h2 className="section-title animate-slide-up">Why Choose Phoenix Bank Home Loans</h2>
        <p className="section-text animate-fade-in">
          We understand that buying a home is one of life's most significant decisions. 
          That's why we're committed to providing you with exceptional service, competitive rates, 
          and the support you need every step of the way.
        </p>

        <div className="benefits-grid">
          {benefits.map((benefit, index) => (
            <div key={index} className="loan-feature-card">
              <div className="feature-icon">{benefit.icon}</div>
              <h3 className="feature-title">{benefit.title}</h3>
              <p className="feature-description">{benefit.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CALCULATOR SECTION */}
      <section className="calculator-section">
        <div className="calculator-container">
          <div className="calculator-content">
            <h2 className="section-title">Mortgage Calculator</h2>
            <p className="section-text">
              Estimate your monthly payment and see how different loan amounts and rates affect your budget.
            </p>
            <div className="calculator-box">
              <div className="calculator-inputs">
                <div className="calc-input-group">
                  <label>Loan Amount</label>
                  <input
                    type="number"
                    placeholder="500000"
                    value={loanAmount}
                    onChange={e => setLoanAmount(e.target.value)}
                    min="0"
                  />
                </div>
                <div className="calc-input-group">
                  <label>Interest Rate (%)</label>
                  <input
                    type="number"
                    placeholder="6.25"
                    value={interestRate}
                    onChange={e => setInterestRate(e.target.value)}
                    step="0.01"
                    min="0"
                  />
                </div>
                <div className="calc-input-group">
                  <label>Loan Term (years)</label>
                  <select value={loanTerm} onChange={e => setLoanTerm(e.target.value)}>
                    <option value="15">15 years</option>
                    <option value="20">20 years</option>
                    <option value="30">30 years</option>
                  </select>
                </div>
              </div>
              <div className="calculator-result">
                <div className="result-label">Estimated Monthly Payment</div>
                <div className="result-value">
                  {monthlyPayment > 0
                    ? `$${monthlyPayment.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : "—"}
                </div>
                <p className="result-note">* This is an estimate. Actual rates and payments may vary.</p>
              </div>
            </div>
            <button className="cta-button" onClick={handleApplyClick}>Get Pre-Approved</button>
          </div>
        </div>
      </section>

      <section className="home-loans-keys-section">
        <div className="home-loans-keys-content">
          <div className="home-loans-keys-text">
            <h2>Unlock Your Future</h2>
            <p className="keys-intro">
              At Phoenix Bank, we understand that homeownership is one of life's most significant milestones. Our comprehensive mortgage solutions are designed to make your journey seamless, transparent, and successful.
            </p>
            <div className="keys-features">
              <div className="keys-feature-item">
                <h3>Expert Guidance</h3>
                <p>Work with experienced mortgage advisors who understand your unique financial situation and provide personalized recommendations.</p>
              </div>
              <div className="keys-feature-item">
                <h3>Competitive Rates</h3>
                <p>Access market-leading interest rates and flexible terms tailored to your financial goals and timeline.</p>
              </div>
              <div className="keys-feature-item">
                <h3>Streamlined Process</h3>
                <p>Experience a simplified application process with clear communication at every step, from pre-approval to closing.</p>
              </div>
            </div>
          </div>
          <div className="home-loans-keys-image">
            <img src={"/images/keys.png"} alt="Keys" />
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="loans-cta-section">
        <h2 className="section-title">Ready to Get Started?</h2>
        <p className="section-text">
          Join thousands of satisfied homeowners who chose Phoenix Bank for their mortgage needs. 
          Apply today and take the first step toward your dream home.
        </p>
        <div className="cta-buttons">
          <button className="cta-button primary" onClick={handleApplyClick}>Apply Now</button>
          <button className="cta-button secondary" onClick={handleLoginClick}>Login to Account</button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
