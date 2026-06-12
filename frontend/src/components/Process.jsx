import { useEffect, useRef } from "react";
import "../styles/process.css";

export default function Process() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleScroll = () => {
      const rect = el.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      
      // Fade IN when entering
      const enterProgress = Math.max(0, Math.min(1, 
        (windowHeight - rect.top) / windowHeight
      ));

      // Fade OUT when leaving
      const exitProgress = Math.max(0, Math.min(1,
        (windowHeight - rect.bottom) / windowHeight
      ));

      // Combined visibility
      const visibility = enterProgress * (1 - exitProgress);

      // Title animation
      const title = el.querySelector('.process-title');
      const subtitle = el.querySelector('.process-subtitle');
      if (title) {
        title.style.transform = `translateY(${(1 - enterProgress) * 50}px)`;
        title.style.opacity = visibility;
      }
      if (subtitle) {
        subtitle.style.transform = `translateY(${(1 - enterProgress) * 30}px)`;
        subtitle.style.opacity = visibility;
      }

      // Items animation
      const items = el.querySelectorAll('.process-item');
      items.forEach((item, index) => {
        const itemProgress = Math.max(0, enterProgress - (index * 0.05));
        item.style.transform = `translateX(${(1 - itemProgress) * -50}px)`;
        item.style.opacity = visibility;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const processSteps = [
    {
      number: "1",
      title: "Account Opening",
      description: "Open your account in minutes with our streamlined digital onboarding. Verify your identity instantly with government-issued ID and start banking immediately.",
      icon: (
        <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="20" y="30" width="25" height="25" />
          <rect x="20" y="60" width="15" height="15" />
          <rect x="40" y="60" width="15" height="15" />
          <rect x="60" y="60" width="15" height="15" />
        </svg>
      )
    },
    {
      number: "2",
      title: "Security Setup",
      description: "Configure multi-factor authentication, biometric login, and personalized security preferences. Set up transaction alerts and spending limits for complete control.",
      icon: (
        <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="30" cy="35" r="8" />
          <line x1="30" y1="45" x2="30" y2="70" />
          <line x1="50" y1="35" x2="50" y2="70" />
          <line x1="70" y1="35" x2="70" y2="70" />
        </svg>
      )
    },
    {
      number: "3",
      title: "Link Accounts",
      description: "Connect external bank accounts, credit cards, and investment accounts. Aggregate all your financial data in one secure dashboard for complete visibility.",
      icon: (
        <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="30" cy="50" r="12" />
          <circle cx="50" cy="30" r="12" />
          <circle cx="70" cy="50" r="12" />
        </svg>
      )
    },
    {
      number: "4",
      title: "Personalize Experience",
      description: "Customize your dashboard, set budget categories, and configure spending insights. Choose your preferred notification settings and card designs.",
      icon: (
        <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="40" cy="35" r="10" />
          <path d="M 40 48 L 60 70" />
          <circle cx="60" cy="70" r="5" />
        </svg>
      )
    },
    {
      number: "5",
      title: "Mobile Access",
      description: "Download our iOS or Android app for banking on the go. Deposit checks instantly, transfer funds, and manage your finances from anywhere with biometric login.",
      icon: (
        <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="35" y="20" width="30" height="60" rx="4" />
          <line x1="45" y1="72" x2="55" y2="72" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )
    },
    {
      number: "6",
      title: "Instant Transfers",
      description: "Transfer money between accounts instantly with zero fees. Send funds to friends and family, pay bills automatically, and schedule recurring payments effortlessly.",
      icon: (
        <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M 25 50 L 45 50 L 45 35 L 75 50 L 45 65 L 45 50" />
          <path d="M 75 50 L 55 50 L 55 65 L 25 50 L 55 35 L 55 50" />
        </svg>
      )
    },
    {
      number: "7",
      title: "Rewards Program",
      description: "Earn cashback on every purchase with our tiered rewards system. Redeem points for travel, merchandise, or statement credits. Track your rewards in real-time.",
      icon: (
        <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="30" cy="40" r="8" />
          <circle cx="50" cy="40" r="8" />
          <circle cx="70" cy="40" r="8" />
          <line x1="30" y1="48" x2="30" y2="65" />
          <line x1="50" y1="48" x2="50" y2="65" />
          <line x1="70" y1="48" x2="70" y2="65" />
        </svg>
      )
    },
    {
      number: "8",
      title: "Smart Analytics",
      description: "View detailed spending insights organized by category. Track your financial health with visual charts, budgets, and predictive analytics powered by AI.",
      icon: (
        <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M 25 60 L 35 45 L 45 50 L 55 35 L 65 40 L 75 25" />
          <line x1="25" y1="70" x2="75" y2="70" />
        </svg>
      )
    },
    {
      number: "9",
      title: "Investment Options",
      description: "Access savings accounts with competitive APY, certificates of deposit, and investment portfolios. Automate your savings with round-up features and recurring deposits.",
      icon: (
        <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="30" y="50" width="12" height="20" />
          <rect x="45" y="40" width="12" height="30" />
          <rect x="60" y="30" width="12" height="40" />
        </svg>
      )
    },
    {
      number: "10",
      title: "24/7 Support",
      description: "Access dedicated customer support anytime via chat, phone, or email. Get instant answers to common questions through our AI assistant or speak with a human expert.",
      icon: (
        <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="40" cy="30" r="8" />
          <path d="M 32 40 Q 40 50 48 40" />
          <path d="M 40 50 L 50 60 L 70 40" />
        </svg>
      )
    }
  ];

  return (
    <section id="process" ref={ref} className="process-section">
      <div className="process-container">
        
        <div className="process-header">
          <h2 className="process-title">Process</h2>
          <p className="process-subtitle">LEARN MORE</p>
        </div>

        <div className="process-list">
          {processSteps.map((step) => (
            <div key={step.number} className="process-item">
              <div className="process-item-icon">
                {step.icon}
              </div>
              <div className="process-item-content">
                <h3 className="process-item-title">
                  <span className="process-number">{step.number}.</span> {step.title}
                </h3>
                <p className="process-item-description">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}