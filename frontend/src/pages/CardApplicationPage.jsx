import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../hooks/auth";
import { cardApplicationsAPI } from "../services/api/card_applications";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../styles/card-application-page.css";

/* ── card catalogue with perks ── */
const CARDS = [
  {
    id: "c-by-phoenix", name: "Phoenix Card", category: "Executive",
    tagline: "Reserved for those who define excellence",
    description: "The Phoenix Executive Card offers unparalleled service, lifetime privileges, and access to the Phoenix Private Network — your gateway to global influence and opportunity.",
    image: "/images/phoenix-credit-card.png",
    perks: [
      { icon: "bi-airplane-fill",         title: "Private Aviation",     desc: "Priority booking & exclusive routes" },
      { icon: "bi-building",              title: "1,200+ Lounges",       desc: "Global airport lounge network" },
      { icon: "bi-person-badge-fill",     title: "C-Suite Concierge",    desc: "Dedicated 24/7 personal assistant" },
      { icon: "bi-shield-fill-check",     title: "Elite Protection",     desc: "Emergency assistance up to €1M" },
      { icon: "bi-infinity",              title: "Unlimited Rewards",    desc: "No cap on points earned" },
      { icon: "bi-currency-exchange",     title: "Zero Fees",            desc: "No foreign transaction fees" },
    ],
  },
  {
    id: "platinum-business", name: "Phoenix Blue Card", category: "Lifestyle",
    tagline: "World-class privileges for modern professionals",
    description: "Elevate your everyday with premium living — access exclusive lounges, elite hotels, and a global concierge network designed for professionals who balance success with lifestyle.",
    image: "/images/PhoenixBlue.png",
    perks: [
      { icon: "bi-credit-card-2-front-fill", title: "No Spending Limit", desc: "Flexible limits tailored to you" },
      { icon: "bi-building-fill",            title: "Hotel Upgrades",    desc: "Complimentary upgrades at 500+ properties" },
      { icon: "bi-headset",                  title: "Premium Support",   desc: "24/7 dedicated client line" },
      { icon: "bi-bag-fill",                 title: "Shopping Rewards",  desc: "5× points at luxury retailers" },
      { icon: "bi-wifi",                     title: "Priority Wi-Fi",    desc: "Complimentary global airport Wi-Fi" },
      { icon: "bi-fork-knife",               title: "Dining Benefits",   desc: "3× points on all dining spend" },
    ],
  },
  {
    id: "blue", name: "Phoenix Travel Card", category: "Travel",
    tagline: "Experience effortless travel, worldwide",
    description: "Experience effortless travel with premium benefits, priority support, and comprehensive protection worldwide. Connected to a curated network of global wellness partners.",
    image: "/images/PhoenixTravel.png",
    perks: [
      { icon: "bi-globe2",           title: "Global Coverage",  desc: "Accepted in 200+ countries" },
      { icon: "bi-luggage-fill",     title: "Travel Insurance", desc: "Emergency medical up to €500K" },
      { icon: "bi-car-front-fill",   title: "Rental Coverage",  desc: "Complimentary rental car insurance" },
      { icon: "bi-map-fill",         title: "Trip Concierge",   desc: "Custom itinerary planning service" },
      { icon: "bi-clock-fill",       title: "Fast Track",       desc: "Priority immigration & security" },
      { icon: "bi-telephone-fill",   title: "Global Helpline",  desc: "Emergency support in 60 languages" },
    ],
  },
  {
    id: "polo", name: "Phoenix Adventure Card", category: "Adventure",
    tagline: "Fuel your passion for discovery",
    description: "From mountains to coastlines, the Phoenix Adventure Card fuels your passion for discovery. Enjoy elite adventure insurance, exclusive partner perks, and explorer rewards.",
    image: "/images/PhoenixAdventure.png",
    perks: [
      { icon: "bi-shield-fill",        title: "Adventure Insurance", desc: "Extreme sports & expedition coverage" },
      { icon: "bi-compass-fill",       title: "Explorer Rewards",    desc: "2× points on outdoor activities" },
      { icon: "bi-bandaid-fill",       title: "Emergency Rescue",    desc: "24/7 worldwide rescue coordination" },
      { icon: "bi-camera-fill",        title: "Gear Protection",     desc: "Coverage for cameras & equipment" },
      { icon: "bi-tree-fill",          title: "Partner Network",     desc: "Exclusive rates at 300+ partners" },
      { icon: "bi-lightning-charge-fill", title: "Fast Rewards",     desc: "Earn miles on every purchase" },
    ],
  },
  {
    id: "glamour", name: "Phoenix Lifestyle Card", category: "Lifestyle",
    tagline: "Define your own style — and live it boldly",
    description: "Step into the world of haute living with invitations to fashion premieres, curated dining, and private events. Crafted for those who define their own style.",
    image: "/images/PhoenixLifestyle.png",
    perks: [
      { icon: "bi-stars",          title: "VIP Events",       desc: "Exclusive fashion & art premiere invites" },
      { icon: "bi-heart-fill",     title: "Wellness Credits", desc: "$500 annual spa & wellness credit" },
      { icon: "bi-scissors",       title: "Style Concierge",  desc: "Dedicated personal fashion advisor" },
      { icon: "bi-shop",           title: "Luxury Shopping",  desc: "Early access to exclusive collections" },
      { icon: "bi-balloon-fill",   title: "Birthday Perks",   desc: "Curated luxury gifts on your birthday" },
      { icon: "bi-gem",            title: "Premium Rewards",  desc: "5× points at luxury boutiques" },
    ],
  },
  {
    id: "billionaire", name: "Phoenix Business Classic", category: "Business",
    tagline: "A symbol of enduring business excellence",
    description: "Grants access to dedicated corporate services, high-value rewards, and personalized account management — designed to support growth and legacy alike.",
    image: "/images/BusinessClassic.png",
    perks: [
      { icon: "bi-briefcase-fill",        title: "Corporate Portal",  desc: "Real-time expense management" },
      { icon: "bi-people-fill",           title: "Team Cards",        desc: "Up to 10 employee sub-cards" },
      { icon: "bi-graph-up-arrow",        title: "Business Rewards",  desc: "3× points on business purchases" },
      { icon: "bi-file-earmark-text-fill", title: "Reporting",        desc: "Monthly itemized spend analytics" },
      { icon: "bi-bank2",                 title: "Account Manager",   desc: "Dedicated senior relationship manager" },
      { icon: "bi-lock-fill",             title: "Fraud Shield",      desc: "Real-time transaction monitoring" },
    ],
  },
  {
    id: "titanium", name: "Phoenix Business Global", category: "Business",
    tagline: "Built for global visionaries",
    description: "Enables seamless international operations with multi-currency access, advanced analytics, and priority business travel privileges around the world.",
    image: "/images/BusinessGlobal.png",
    perks: [
      { icon: "bi-currency-dollar",   title: "Multi-Currency",    desc: "Transact in 150+ currencies" },
      { icon: "bi-bar-chart-fill",    title: "AI Analytics",      desc: "Intelligent spend insights" },
      { icon: "bi-airplane-engines-fill", title: "Business Travel", desc: "Priority booking & fast-track" },
      { icon: "bi-building-fill",     title: "Office Benefits",   desc: "Credits at WeWork & business hubs" },
      { icon: "bi-people-fill",       title: "Unlimited Sub-cards", desc: "No limit on employee cards" },
      { icon: "bi-translate",         title: "Global Support",    desc: "30-language account support" },
    ],
  },
  {
    id: "diamond", name: "Phoenix Business Elite", category: "Business",
    tagline: "The highest tier of corporate distinction",
    description: "Experience the highest tier of distinction. Enjoy private aviation, luxury retreats, and bespoke concierge services tailored to the world's most discerning leaders.",
    image: "/images/BusinessElite.png",
    perks: [
      { icon: "bi-diamond-fill",         title: "Elite Status",        desc: "Tier 1 status at 200+ hotel chains" },
      { icon: "bi-airplane-fill",        title: "Private Jets",        desc: "Access to global aviation network" },
      { icon: "bi-safe2-fill",           title: "Wealth Advisory",     desc: "Complimentary financial advisory" },
      { icon: "bi-briefcase-fill",       title: "Deal Room",           desc: "Exclusive business networking events" },
      { icon: "bi-person-badge-fill",    title: "Executive Assistant", desc: "Full-time dedicated EA service" },
      { icon: "bi-lightning-fill",       title: "Instant Issuance",    desc: "Same-day card issuance globally" },
    ],
  },
];

const CATEGORIES = ["All", "Executive", "Lifestyle", "Travel", "Adventure", "Business"];
const STEPS = ["Personal Info", "Financial Info"];

/* ── floating particle generator ── */
const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  left:  `${Math.random() * 100}%`,
  size:  `${1.5 + Math.random() * 2.5}px`,
  delay: `${Math.random() * 12}s`,
  dur:   `${10 + Math.random() * 14}s`,
}));

export default function CardApplicationPage() {
  const navigate = useNavigate();
  const { data: user } = useUser();

  const [category,  setCategory]  = useState("All");
  const [selected,  setSelected]  = useState(null);   // selected card object
  const [showForm,  setShowForm]  = useState(false);
  const [step,      setStep]      = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [success,    setSuccess]   = useState(false);

  const [personal, setPersonal] = useState({
    first_name: "", last_name: "", dob: "", ssn_last4: "",
    address: "", city: "", state: "", zip: "",
  });
  const [financial, setFinancial] = useState({
    employment: "", employer: "", income: "", housing: "", monthly_rent: "",
  });

  /* pre-fill personal info from user profile */
  useEffect(() => {
    if (user) {
      setPersonal(p => ({
        ...p,
        first_name: p.first_name || user.first_name || "",
        last_name:  p.last_name  || user.last_name  || "",
        address:    p.address    || user.street     || "",
        city:       p.city       || user.city       || "",
        state:      p.state      || user.state      || "",
        zip:        p.zip        || user.zip        || "",
      }));
    }
  }, [user]);

  /* 3D tilt on the big card preview */
  const cardWrapRef = useRef(null);
  const tiltRef     = useRef({ x: 0, y: 0 });
  const rafRef      = useRef(null);

  const handleCardMouseMove = useCallback((e) => {
    const el = cardWrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx   = rect.left + rect.width  / 2;
    const cy   = rect.top  + rect.height / 2;
    const dx   = (e.clientX - cx) / (rect.width  / 2);
    const dy   = (e.clientY - cy) / (rect.height / 2);
    tiltRef.current = { x: dy * -14, y: dx * 14 };
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        if (cardWrapRef.current) {
          cardWrapRef.current.style.transform =
            `perspective(800px) rotateX(${tiltRef.current.x}deg) rotateY(${tiltRef.current.y}deg) scale(1.02)`;
        }
        rafRef.current = null;
      });
    }
  }, []);

  const handleCardMouseLeave = useCallback(() => {
    if (cardWrapRef.current) {
      cardWrapRef.current.style.transform = "perspective(800px) rotateX(0deg) rotateY(0deg) scale(1)";
      cardWrapRef.current.style.transition = "transform 0.6s cubic-bezier(0.32,0.72,0,1)";
    }
  }, []);

  /* refs for smooth scrolling */
  const detailRef  = useRef(null);
  const formRef    = useRef(null);
  const catalogRef = useRef(null);

  const selectCard = (card) => {
    setSelected(card);
    setShowForm(false);
    setSuccess(false);
    setStep(0);
    setTimeout(() => {
      detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  };

  const openForm = () => {
    setShowForm(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  };

  const scrollToCards = () => {
    catalogRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const setP = (key) => (e) => setPersonal(p => ({ ...p, [key]: e.target.value }));
  const setF = (key) => (e) => setFinancial(p => ({ ...p, [key]: e.target.value }));

  const canNext = () => {
    if (step === 0) return (
      personal.first_name && personal.last_name && personal.dob &&
      personal.ssn_last4.length === 4 && personal.address && personal.city &&
      personal.state && personal.zip
    );
    if (step === 1) return financial.employment && financial.income && financial.housing;
    return false;
  };

  const handleSubmit = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await cardApplicationsAPI.submit({
        card_id:   selected.id,
        card_name: selected.name,
        ...personal,
        income:       parseFloat(financial.income)       || 0,
        employment:   financial.employment,
        employer:     financial.employer,
        housing:      financial.housing,
        monthly_rent: parseFloat(financial.monthly_rent) || 0,
      });
      setSuccess(true);
      setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60);
    } catch (err) {
      alert(`Application failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = category === "All" ? CARDS : CARDS.filter(c => c.category === category);

  return (
    <div className="cap-page">

      {/* ── HERO ── */}
      <section className="cap-hero">
        <div className="cap-hero-bg" />
        <div className="cap-hero-grid" />
        {PARTICLES.map(p => (
          <span
            key={p.id}
            className="cap-particle"
            style={{ left: p.left, width: p.size, height: p.size, animationDelay: p.delay, animationDuration: p.dur }}
          />
        ))}
        <div className="cap-hero-content">
          <div className="cap-hero-eyebrow">Phoenix Bank</div>
          <h1 className="cap-hero-title">
            Premium Cards<br />for <span>Premium Lives</span>
          </h1>
          <p className="cap-hero-sub">
            Discover a card crafted for your ambitions. Exclusive benefits,
            limitless rewards, and a level of service that redefines what banking can be.
          </p>
          <div className="cap-scroll-hint" onClick={scrollToCards}>
            <div className="cap-scroll-arrow"><i className="bi bi-chevron-down" /></div>
            Explore Cards
          </div>
        </div>
      </section>

      {/* ── CATALOG ── */}
      <section className="cap-catalog" ref={catalogRef}>
        <div className="cap-catalog-header">
          <p className="cap-section-eyebrow">Our Collection</p>
          <h2 className="cap-section-title">Choose Your Card</h2>
          <p className="cap-section-desc">
            Eight premium cards. Each crafted for a distinct lifestyle.
            Select one to explore benefits and apply.
          </p>
        </div>

        {/* category filters */}
        <div className="cap-filters">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`cap-filter-pill ${category === cat ? "cap-filter-pill--active" : ""}`}
              onClick={() => { setCategory(cat); setSelected(null); setShowForm(false); }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* cards grid */}
        <div className="cap-cards-grid">
          {filtered.map(card => (
            <div
              key={card.id}
              className={`cap-card-item ${selected?.id === card.id ? "cap-card-item--selected" : ""}`}
              onClick={() => selectCard(card)}
            >
              <div className="cap-card-img-wrap">
                <img src={card.image} alt={card.name} draggable="false" />
                <div className="cap-card-check">✓</div>
              </div>
              <div className="cap-card-info">
                <span className="cap-card-name">{card.name}</span>
                <span className="cap-card-cat">{card.category}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CARD DETAIL ── */}
      {selected && (
        <section className="cap-detail" ref={detailRef}>
          <div className="cap-detail-inner">

            {/* left: large 3D card */}
            <div className="cap-detail-card-col">
              <div
                className="cap-detail-card-wrap"
                ref={cardWrapRef}
                onMouseMove={handleCardMouseMove}
                onMouseLeave={handleCardMouseLeave}
              >
                <img src={selected.image} alt={selected.name} draggable="false" />
                <div className="cap-detail-card-overlay">
                  <div className="cap-detail-card-top">
                    <span className="cap-detail-bank">Phoenix Bank</span>
                    <span className="cap-detail-active">Available</span>
                  </div>
                  <div className="cap-detail-card-bottom">
                    <div className="cap-detail-card-name">{selected.name}</div>
                    <div className="cap-detail-card-category">{selected.category} Collection</div>
                  </div>
                </div>
              </div>
              <p className="cap-detail-hint">Hover to interact</p>
            </div>

            {/* right: info + perks + CTA */}
            <div className="cap-detail-info-col">
              <div className="cap-detail-cat-badge">{selected.category}</div>
              <h2 className="cap-detail-name">{selected.name}</h2>
              <p className="cap-detail-tagline">"{selected.tagline}"</p>
              <div className="cap-detail-divider" />
              <p className="cap-detail-desc">{selected.description}</p>

              <p className="cap-perks-label">Key Benefits</p>
              <div className="cap-perks-grid">
                {selected.perks.map((perk, i) => (
                  <div key={i} className="cap-perk-item">
                    <div className="cap-perk-icon"><i className={`bi ${perk.icon}`} /></div>
                    <div className="cap-perk-text">
                      <div className="cap-perk-title">{perk.title}</div>
                      <div className="cap-perk-desc">{perk.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="cap-detail-cta">
                <button className="cap-apply-btn" onClick={openForm}>
                  Apply for This Card
                  <span className="cap-apply-btn-arrow">→</span>
                </button>
                <p className="cap-apply-note">
                  Decisions within 1–2 business days.<br />No impact on your credit score.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── APPLICATION FORM ── */}
      {showForm && selected && (
        <section className="cap-form-section" ref={formRef}>
          <div className="cap-form-wrap">

            {success ? (
              <div className="cap-success">
                <div className="cap-success-icon"><i className="bi bi-check-lg" /></div>
                <h2 className="cap-success-title">Application Submitted</h2>
                <p className="cap-success-sub">
                  Your application for the <strong>{selected.name}</strong> has been received.
                  Our team will review your information and respond within 1–2 business days.
                </p>
                <div className="cap-success-meta">
                  <div className="cap-success-meta-item">
                    <div className="cap-success-meta-val">{selected.name}</div>
                    <div className="cap-success-meta-key">Card Applied For</div>
                  </div>
                  <div className="cap-success-meta-item">
                    <div className="cap-success-meta-val">Under Review</div>
                    <div className="cap-success-meta-key">Status</div>
                  </div>
                  <div className="cap-success-meta-item">
                    <div className="cap-success-meta-val">1–2 Days</div>
                    <div className="cap-success-meta-key">Response Time</div>
                  </div>
                </div>
                <div className="cap-success-actions">
                  <button className="cap-success-btn-primary" onClick={() => navigate("/dashboard")}>
                    Back to Dashboard
                  </button>
                  <button className="cap-success-btn-secondary" onClick={() => { setSuccess(false); setShowForm(false); setSelected(null); setStep(0); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                    Apply for Another
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* form header */}
                <div className="cap-form-header">
                  <div className="cap-form-header-left">
                    <p className="cap-form-eyebrow">Application</p>
                    <h3 className="cap-form-title">Complete Your Details</h3>
                  </div>
                  <div className="cap-form-card-preview">
                    <div className="cap-form-card-thumb">
                      <img src={selected.image} alt={selected.name} />
                    </div>
                    <div>
                      <div className="cap-form-card-label">{selected.name}</div>
                      <div className="cap-form-card-sub">{selected.category} Collection</div>
                    </div>
                  </div>
                </div>

                {/* steps */}
                <div className="cap-steps">
                  {STEPS.map((s, i) => (
                    <div
                      key={s}
                      className={`cap-step ${i === step ? "cap-step--active" : i < step ? "cap-step--done" : ""}`}
                    >
                      <div className="cap-step-num">{i < step ? "✓" : i + 1}</div>
                      <div className="cap-step-label">{s}</div>
                    </div>
                  ))}
                </div>

                {/* ── Step 0: Personal Info ── */}
                {step === 0 && (
                  <div className="cap-form-body">
                    <div className="cap-field-row">
                      <div className="cap-field-group">
                        <label className="cap-field-label">First Name</label>
                        <input className="cap-field-input" value={personal.first_name} onChange={setP("first_name")} placeholder="First name" />
                      </div>
                      <div className="cap-field-group">
                        <label className="cap-field-label">Last Name</label>
                        <input className="cap-field-input" value={personal.last_name} onChange={setP("last_name")} placeholder="Last name" />
                      </div>
                    </div>
                    <div className="cap-field-row">
                      <div className="cap-field-group">
                        <label className="cap-field-label">Date of Birth</label>
                        <input className="cap-field-input" type="date" value={personal.dob} onChange={setP("dob")} />
                      </div>
                      <div className="cap-field-group">
                        <label className="cap-field-label">SSN Last 4 Digits</label>
                        <input
                          className="cap-field-input"
                          value={personal.ssn_last4}
                          onChange={e => setPersonal(p => ({ ...p, ssn_last4: e.target.value.replace(/\D/g,"").slice(0,4) }))}
                          placeholder="XXXX"
                          maxLength={4}
                        />
                      </div>
                    </div>
                    <div className="cap-field-row cap-field-row--1">
                      <div className="cap-field-group">
                        <label className="cap-field-label">Street Address</label>
                        <input className="cap-field-input" value={personal.address} onChange={setP("address")} placeholder="123 Main Street" />
                      </div>
                    </div>
                    <div className="cap-field-row cap-field-row--3">
                      <div className="cap-field-group">
                        <label className="cap-field-label">City</label>
                        <input className="cap-field-input" value={personal.city} onChange={setP("city")} placeholder="New York" />
                      </div>
                      <div className="cap-field-group">
                        <label className="cap-field-label">State</label>
                        <input className="cap-field-input" value={personal.state} onChange={setP("state")} placeholder="NY" maxLength={2} style={{ textTransform: "uppercase" }} />
                      </div>
                      <div className="cap-field-group">
                        <label className="cap-field-label">ZIP Code</label>
                        <input
                          className="cap-field-input"
                          value={personal.zip}
                          onChange={e => setPersonal(p => ({ ...p, zip: e.target.value.replace(/\D/g,"").slice(0,5) }))}
                          placeholder="10001"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Step 1: Financial Info ── */}
                {step === 1 && (
                  <div className="cap-form-body">
                    <div className="cap-field-row">
                      <div className="cap-field-group">
                        <label className="cap-field-label">Employment Status</label>
                        <select className="cap-field-select" value={financial.employment} onChange={setF("employment")}>
                          <option value="">Select status…</option>
                          <option value="employed">Employed</option>
                          <option value="self-employed">Self-Employed</option>
                          <option value="student">Student</option>
                          <option value="retired">Retired</option>
                          <option value="unemployed">Unemployed</option>
                        </select>
                      </div>
                      <div className="cap-field-group">
                        <label className="cap-field-label">Employer / Company</label>
                        <input className="cap-field-input" value={financial.employer} onChange={setF("employer")} placeholder="Company name (optional)" />
                      </div>
                    </div>
                    <div className="cap-field-row">
                      <div className="cap-field-group">
                        <label className="cap-field-label">Annual Income ($)</label>
                        <input className="cap-field-input" type="number" min="0" value={financial.income} onChange={setF("income")} placeholder="e.g. 75000" />
                      </div>
                      <div className="cap-field-group">
                        <label className="cap-field-label">Housing Status</label>
                        <select className="cap-field-select" value={financial.housing} onChange={setF("housing")}>
                          <option value="">Select housing…</option>
                          <option value="own">Own</option>
                          <option value="rent">Rent</option>
                          <option value="live-with-family">Live with family</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>
                    {financial.housing === "rent" && (
                      <div className="cap-field-row">
                        <div className="cap-field-group">
                          <label className="cap-field-label">Monthly Rent ($)</label>
                          <input className="cap-field-input" type="number" min="0" value={financial.monthly_rent} onChange={setF("monthly_rent")} placeholder="e.g. 2000" />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* form footer */}
                <div className="cap-form-footer">
                  {step > 0
                    ? <button className="cap-form-back" onClick={() => setStep(s => s - 1)}><i className="bi bi-arrow-left" />Back</button>
                    : <button className="cap-form-back" onClick={() => { setShowForm(false); detailRef.current?.scrollIntoView({ behavior: "smooth" }); }}><i className="bi bi-arrow-left" />Back to Card</button>
                  }
                  {step < STEPS.length - 1
                    ? <button className="cap-form-next" onClick={() => setStep(s => s + 1)} disabled={!canNext()}>Continue <i className="bi bi-arrow-right" /></button>
                    : <button className="cap-form-next" onClick={handleSubmit} disabled={!canNext() || submitting}>
                        {submitting ? "Submitting…" : <><span>Submit Application</span><i className="bi bi-arrow-right" /></>}
                      </button>
                  }
                </div>
              </>
            )}
          </div>
        </section>
      )}

    </div>
  );
}
