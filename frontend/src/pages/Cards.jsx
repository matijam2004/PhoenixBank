// Premium cards showcase page with carousel and benefits
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import "../styles/cardspage-new.css";
import Footer from "../components/Footer";

// Scroll animation hook - reversible on scroll up/down
const useScrollAnimation = () => {
  useEffect(() => {
    const handleScroll = () => {
      const elements = document.querySelectorAll('.animate-on-scroll');
      const windowHeight = window.innerHeight;

      elements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        
        // Calculate progress when entering viewport
        const enterProgress = Math.max(0, Math.min(1, 
          (windowHeight - rect.top) / windowHeight
        ));

        // Calculate progress when exiting viewport
        const exitProgress = Math.max(0, Math.min(1,
          1 - (rect.bottom / windowHeight)
        ));

        // Combined progress (increases entering, decreases exiting)
        const progress = enterProgress * (1 - exitProgress);

        // Add or remove class based on progress
        if (progress > 0.1) {
          el.classList.add('animate-in');
        } else {
          el.classList.remove('animate-in');
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
};

// Available premium cards
const ALL_CARDS = [
  { id:"c-by-phoenix", name:"Phoenix Card", category:"Lifestyle", image:"/images/phoenix-credit-card.png",
    details:"Reserved for C-level executives, the Phoenix Executive Card offers unparalleled service, lifetime privileges, and access to the Phoenix Private Network—your gateway to global influence and opportunity."},
 
    { id:"platinum-business", name:"Phoenix Blue Card", category:"Lifestyle", image:"/images/PhoenixBlue.png",
    details:"Elevate your everyday with world-class privileges. The Phoenix Blue Card redefines premium living through access to exclusive lounges, elite hotels, and a global concierge network. Designed for professionals who balance success with lifestyle, it blends sophistication with convenience across every journey." },
  { id:"blue", name:"Phoenix Travel Card", category:"Lifestyle", image:"/images/PhoenixTravel.png",
    details:"Experience effortless travel with premium benefits, priority support, and comprehensive protection worldwide. The Phoenix Travel Card connects you to a curated network of global wellness partners and luxury experiences, wherever you roam." },

  { id:"polo", name:"Phoenix Adventure Card", category:"Lifestyle", image:"/images/PhoenixAdventure.png",
    details:"From mountains to coastlines, the Phoenix Adventure Card fuels your passion for discovery. Enjoy elite adventure insurance, exclusive partner perks, and rewards built for explorers who live beyond boundaries." },

  { id:"glamour", name:"Phoenix Lifestyle Card", category:"Lifestyle", image:"/images/PhoenixLifestyle.png",
    details:"Step into the world of haute living with invitations to fashion premieres, curated dining, and private events. The Phoenix Lifestyle Card is crafted for those who define their own style—and live it boldly." },

  { id:"billionaire", name:"Phoenix Bussiness Classic Card", category:"Business", image:"/images/BusinessClassic.png",
    details:"A symbol of enduring excellence, the Phoenix Business Classic Card grants access to dedicated corporate services, high-value rewards, and personalized account management—designed to support growth and legacy alike." },

  { id:"titanium", name:"Phoenix Business Global Card", category:"Business", image:"/images/BusinessGlobal.png",
    details:"Built for global visionaries, the Phoenix Business Global Card enables seamless international operations with multi-currency access, advanced analytics, and priority business travel privileges around the world." },

  { id:"diamond", name:"Phoenix Business Elite Card", category:"Business", image:"/images/BusinessElite.png",
    details:"Experience the highest tier of distinction with the Phoenix Business Elite Card. Enjoy access to private aviation, luxury retreats, and bespoke concierge services tailored to the world’s most discerning leaders." },
];

const TABS = ["All", "Lifestyle", "Business"];

// Financial benefits list
const MORE_LEFT = [
  "24/7/365 Card and Client Servicing: Use the number on the back of your card to reach our service desk at any time",
  "Large Cash Withdrawals: Significant withdrawal limits",
  "Available Currencies: Choose USD, EUR, GBP, or CHF",
  "Deferred Payment Billing Cycle: Quarterly or monthly with up to 105/56 days without payment or fees",
  "Complimentary Cards: Two free supplementary cards",
  "Online Network: Private portal to check balance and adjust settings",
  "Emergency Replacement Card: Fast replacement worldwide",
  "Flexible Spending Limits: Adjusted quickly to your needs",
  "Streamlined Authorisations: High-value transactions without pre-approval or delay",
  "Worldwide Acceptance: Millions of merchants & ATMs in 200+ countries",
  "Premium Travel Insurance: Emergency medical up to €1m; liability up to €500k",
  "Purchase Protection Insurance: Extended warranty & safe online cover",
];

// Lifestyle benefits list
const MORE_RIGHT = [
  "Personal Assistant: A reliable companion who manages your requests",
  "Rewards: Points redeemable across premium brands and services",
  "Private Aviation: Preferential pricing & bespoke routes",
  "VIP Airport Assistance: Custom, passport control, boarding & transfers",
  "VAT Refund Programme: Processing and proactive notifications",
  "Lounge Access: 1,000+ lounges worldwide with complimentary visits",
  "Hotels Collection: Value-added perks at leading properties",
  "Connect: Preferential mobile rates, numbers & accessories",
  "Wine Club: Sourcing, private tastings & vineyard tours",
];

export default function CardsDarkPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("All");
  const [activeId, setActiveId] = useState("c-by-phoenix");
  const [showMore, setShowMore] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const sliderRef = useRef(null);
  const featuredImageRef = useRef(null);

  // Enable scroll animations
  useScrollAnimation();

  const handleEnquireClick = () => {
    navigate('/login');
  };

  const filtered = tab === "All" ? ALL_CARDS : ALL_CARDS.filter((c) => c.category === tab);
  
  // Triple cards for smooth infinite scrolling - ensures enough slides for slick
  const displayCards = [...filtered, ...filtered, ...filtered];
  
  const active = filtered.find((c) => c.id === activeId) || filtered[0];

  // Track mouse movement over featured image
  const handleMouseMove = (e) => {
    if (featuredImageRef.current) {
      const rect = featuredImageRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      setMousePosition({ x, y });
    }
  };

  const handleMouseLeave = () => {
    setMousePosition({ x: 0, y: 0 });
  };

  const handleCardClick = (cardId, index) => {
    setActiveId(cardId);
    if (sliderRef.current) {
      sliderRef.current.slickGoTo(index);
    }
  };

  // Slick settings - EXACTLY like Insignia
  const slickSettings = {
    dots: false,
    infinite: true,
    speed: 1000,
    slidesToShow: 5,
    slidesToScroll: 1,
    centerMode: false,
    focusOnSelect: true,
    cssEase: "cubic-bezier(0, 0.75, 0.25, 1)",
    arrows: false,
    swipe: true,
    draggable: true,
    touchMove: true,
    beforeChange: (current, next) => {
      const nextCard = filtered[next % filtered.length];
      if (nextCard) {
        setActiveId(nextCard.id);
      }
    },
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 3,
          focusOnSelect: true,
        }
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 2,
          focusOnSelect: true,
        }
      }
    ]
  };

  // Calculate rotation based on mouse position
  const rotateX = (mousePosition.y / 10).toFixed(2);
  const rotateY = (mousePosition.x / 10).toFixed(2);

  return (
    <div className="insignia-page">
      {/* HERO SECTION */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Premium Payment Cards</h1>
          <p className="hero-subtitle">
            Combining financial freedom with effortless living, Phoenix Bank is your trusted partner 
            in luxury payment cards and elite lifestyle management services.
          </p>
        </div>
        <div className="hero-image">
          {/* Stars Video in diagonal angled container */}
          <video 
            autoPlay 
            loop 
            muted 
            playsInline
            className="hero-stars-video"
          >
            <source src="/images/stars.mp4" type="video/mp4" />
          </video>
          {/* Scroll indicator on the dividing line */}
          <div className="scroll-indicator">
            <div className="scroll-circle">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M19 12l-7 7-7-7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* SAY YES TO IMPOSSIBLE */}
      <section className="say-yes-section animate-on-scroll">
        <h2 className="section-title">Say Yes to Impossible</h2>
        <p className="section-subtitle">
          Extraordinary clients, exceptional service. There is a difference between simply seeing 
          the world and experiencing it through Phoenix Bank. Seamless access to unique lifestyle 
          experiences, delivered with premium quality, that exceed expectations.
        </p>
        
        <div className="tabs-container">
          {TABS.map((t) => (
            <button 
              key={t} 
              className={`tab-button ${tab === t ? "active" : ""}`}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </section>

      {/* CARDS CAROUSEL */}
      <section className="cards-carousel animate-on-scroll">
        <button className="carousel-arrow carousel-arrow-left" onClick={() => sliderRef.current?.slickPrev()}>
          ←
        </button>
        <Slider ref={sliderRef} {...slickSettings} className="ticket-slick">
          {displayCards.map((card, index) => (
            <div key={`${card.id}-${index}`}>
              <div className={`card-item ${activeId === card.id ? "slick-current" : ""}`} data-card-id={card.id}>
                <img src={card.image} alt={card.name} draggable="false" />
                <span className="card-name">{card.name}</span>
              </div>
            </div>
          ))}
        </Slider>
        <button className="carousel-arrow carousel-arrow-right" onClick={() => sliderRef.current?.slickNext()}>
          →
        </button>
      </section>

      {/* FEATURED CARD */}
      <section className="featured-section animate-on-scroll">
        <div className="featured-container">
          <div 
            className="featured-image"
            data-card-id={active.id}
            ref={featuredImageRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <img 
              src={active.image} 
              alt={active.name}
              style={{
                transform: `perspective(1000px) rotateX(${-rotateX}deg) rotateY(${rotateY}deg)`,
                transition: 'transform 0.1s ease-out'
              }}
            />
          </div>
          <div className="featured-content">
            <h3 className="featured-title">{active.name}</h3>
            <p className="featured-text">{active.details}</p>
            <button className="cta-button" onClick={handleEnquireClick}>Enquire now</button>
          </div>
        </div>
      </section>

      {/* KEY BENEFITS */}
      <section className="benefits-section animate-on-scroll">
        <h2 className="section-title">KEY BENEFITS</h2>
        
        <div className="benefits-grid">
          <div className="benefit-card animate-on-scroll">
            <div className="benefit-icon">
              <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
                <circle cx="30" cy="30" r="28" stroke="currentColor" strokeWidth="1" className="icon-circle"/>
                <path d="M30 15 L30 30 L40 35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="icon-path"/>
              </svg>
            </div>
            <h3 className="benefit-title">24/7/365 Dedicated Personal Assistant</h3>
            <div className="benefit-line"></div>
            <p className="benefit-text">
              The dedicated service of a Phoenix Personal Assistant is the crowning achievement 
              of our array of benefits. Whatever support you require; your PA is just a call or a 
              message away. Reliable, resourceful and a creative problem solver, your PA will enrich 
              day-to-day experiences, while saving you valuable time.
            </p>
          </div>

          <div className="benefit-card animate-on-scroll">
            <div className="benefit-icon">
              <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
                <circle cx="30" cy="30" r="28" stroke="currentColor" strokeWidth="1" className="icon-circle"/>
                <circle cx="30" cy="26" r="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="icon-path"/>
                <path d="M20 40 C20 35 24 32 30 32 C36 32 40 35 40 40" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="icon-path"/>
              </svg>
            </div>
            <h3 className="benefit-title">Key Account Manager</h3>
            <div className="benefit-line"></div>
            <p className="benefit-text">
              With access to a Key Account Manager and C-Panel, a business expenses management portal, 
              your business can easily monitor and control corporate spending as well as using our 
              industry leading lifestyle management service to organise corporate travel management.
            </p>
          </div>

          <div className="benefit-card animate-on-scroll">
            <div className="benefit-icon">
              <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
                <circle cx="30" cy="30" r="28" stroke="currentColor" strokeWidth="1" className="icon-circle"/>
                <rect x="22" y="24" width="16" height="12" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" className="icon-path"/>
                <path d="M26 24 L26 22 C26 20.5 27 19 30 19 C33 19 34 20.5 34 22 L34 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="icon-path"/>
                <circle cx="30" cy="30" r="1.5" fill="currentColor" className="icon-path"/>
              </svg>
            </div>
            <h3 className="benefit-title">Business Expenses Management</h3>
            <div className="benefit-line"></div>
            <p className="benefit-text">
              Our online portal is an invaluable tool that gives your business purview over its expense's 
              management. You can adjust parameters such as daily, monthly and annual spending limits; 
              can suspend individual cards; restrict the volume of transactions, dispensation and cash 
              withdrawals; and much more.
            </p>
          </div>
        </div>

        {!showMore && (
          <button className="view-all-button" onClick={() => setShowMore(true)}>
            View all benefits
          </button>
        )}

        <div className={`expanded-benefits ${showMore ? 'show' : ''}`}>
          <div className="benefits-column">
            <h4 className="benefits-heading">FINANCIAL FREEDOM</h4>
            <ul className="benefits-list">
              {MORE_LEFT.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </div>
          <div className="benefits-column">
            <h4 className="benefits-heading">EFFORTLESS LIVING</h4>
            <ul className="benefits-list">
              {MORE_RIGHT.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </div>
        </div>

        {showMore && (
          <button className="view-all-button" onClick={() => setShowMore(false)}>
            Show less
          </button>
        )}
      </section>

      {/* EXCEPTIONAL LIVING */}
      <section className="exceptional-section animate-on-scroll">
        <h2 className="section-title">Exceptional Living</h2>
        <p className="section-text">
          With our combined offering of luxury lifestyle management and payment services, Phoenix Bank 
          has years of experience satisfying the lifestyle needs of the most influential & 
          wealthy individuals in the world.
        </p>
        <p className="section-text">
          Our membership is strictly for ultra-high and high-net-worth individuals and we consciously 
          cap membership to maintain exclusivity, allowing us to fulfil our ethos of delivering 
          'complete personal attention' to each individual so they can experience the very best life 
          has to offer.
        </p>
        <button className="cta-button" onClick={handleEnquireClick}>Discover the membership</button>
      </section>

      {/* PARTNERSHIPS */}
      <section className="partnerships-section animate-on-scroll">
        <h2 className="section-title">Phoenix Bank Partnerships</h2>
        <p className="section-text">
          Phoenix Bank is the ultimate luxury partner with unmatched global marketing power to 
          ultra-high-net-worth individuals
        </p>
        <button className="cta-button" onClick={handleEnquireClick}>Brands & Partners</button>
      </section>
      <Footer />
    </div>
  );
}
