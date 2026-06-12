// Phoenix Bank Travel page - luxury travel services and destinations
import React, { useState, useEffect } from "react";
import "../styles/travel.css";
import Footer from "../components/Footer";

// Import images
const HotelImg = "/images/Hotel.png";
const FlightImg = "/images/Flights.png";
const SuggestedNY = "/images/NewYork.png";
const SuggestedLondon = "/images/London.png";
const RelaxImg = "/images/Relax.png";
const YachtImg = "/images/Yacht.png";
const SantoriniImg = "/images/Santorini.jpg";
const MaldivesImg = "/images/Maldivi.jpg";
const TokyoImg = "/images/Tokyo.jpg";
const SwissAlpsImg = "/images/SwissAlpes.jpg";

// Scroll animation hook
const useScrollAnimation = () => {
  useEffect(() => {
    const handleScroll = () => {
      const windowHeight = window.innerHeight;

      // Hero section animation
      const heroSection = document.querySelector(".travel-hero");
      if (heroSection) {
        const rect = heroSection.getBoundingClientRect();
        if (rect.top < windowHeight * 0.85 && rect.bottom > 0) {
          heroSection.classList.add("visible");
        }
      }

      // Destination cards animation
      const cards = document.querySelectorAll(".destination-card");
      cards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        if (rect.top < windowHeight * 0.85 && rect.bottom > 0) {
          card.classList.add("visible");
        } else {
          card.classList.remove("visible");
        }
      });

      // Service cards animation
      const services = document.querySelectorAll(".service-card");
      services.forEach((card) => {
        const rect = card.getBoundingClientRect();
        if (rect.top < windowHeight * 0.85 && rect.bottom > 0) {
          card.classList.add("visible");
        } else {
          card.classList.remove("visible");
        }
      });

      // Benefits section animation
      const benefitsSection = document.querySelector(".travel-benefits-section");
      if (benefitsSection) {
        const rect = benefitsSection.getBoundingClientRect();
        if (rect.top < windowHeight * 0.75 && rect.bottom > 0) {
          benefitsSection.classList.add("animate-visible");
        } else {
          benefitsSection.classList.remove("animate-visible");
        }
      }

      // Testimonial section animation
      const testimonial = document.querySelector(".testimonial-content");
      if (testimonial) {
        const rect = testimonial.getBoundingClientRect();
        if (rect.top < windowHeight * 0.85 && rect.bottom > 0) {
          testimonial.classList.add("visible");
        } else {
          testimonial.classList.remove("visible");
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    setTimeout(handleScroll, 100);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
};

export default function TravelPage() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  useScrollAnimation();

  const handleLoginClick = () => {
    window.location.href = "/login";
  };

  const handleBookClick = () => {
    window.location.href = "/login";
  };

  const destinations = [
    {
      id: 1,
      name: "New York City",
      location: "United States",
      image: SuggestedNY,
      category: "city",
      description: "Experience the energy of the Big Apple with exclusive access to premium hotels, restaurants, and cultural experiences.",
      price: "From $2,500",
    },
    {
      id: 2,
      name: "London",
      location: "United Kingdom",
      image: SuggestedLondon,
      category: "city",
      description: "Discover the charm of historic London with curated experiences at luxury hotels and private tours.",
      price: "From $2,200",
    },
    {
      id: 3,
      name: "Swiss Alps",
      location: "Switzerland",
      image: SwissAlpsImg,
      category: "adventure",
      description: "Escape to the pristine mountains for world-class skiing, luxury resorts, and breathtaking alpine views.",
      price: "From $3,500",
    },
    {
      id: 4,
      name: "Maldives",
      location: "Indian Ocean",
      image: MaldivesImg,
      category: "beach",
      description: "Indulge in paradise with overwater villas, crystal-clear waters, and unparalleled luxury resort experiences.",
      price: "From $4,000",
    },
    {
      id: 5,
      name: "Tokyo",
      location: "Japan",
      image: TokyoImg,
      category: "city",
      description: "Immerse yourself in Japanese culture with exclusive access to Michelin-starred restaurants and traditional experiences.",
      price: "From $2,800",
    },
    {
      id: 6,
      name: "Santorini",
      location: "Greece",
      image: SantoriniImg,
      category: "beach",
      description: "Experience the iconic sunsets and luxury accommodations in one of the world's most beautiful destinations.",
      price: "From $2,600",
    },
  ];

  const services = [
    {
      icon: "FLIGHTS",
      title: "Premium Flights",
      description: "Access to first-class and business-class seats with preferred pricing and exclusive airline partnerships.",
    },
    {
      icon: "HOTELS",
      title: "Luxury Hotels",
      description: "Curated selection of the world's finest hotels and resorts with complimentary upgrades and VIP amenities.",
    },
    {
      icon: "TRANSFERS",
      title: "Private Transfers",
      description: "Seamless airport transfers and private transportation services in luxury vehicles worldwide.",
    },
    {
      icon: "EXPERIENCES",
      title: "Exclusive Experiences",
      description: "Private tours, VIP access to events, and bespoke experiences tailored to your preferences.",
    },
    {
      icon: "DINING",
      title: "Fine Dining",
      description: "Reservations at Michelin-starred restaurants and exclusive dining experiences around the globe.",
    },
    {
      icon: "CONCIERGE",
      title: "Travel Concierge",
      description: "24/7 personal travel concierge to handle every detail of your journey, from planning to execution.",
    },
  ];

  const categories = ["all", "city", "beach", "adventure"];
  const filteredDestinations = selectedCategory === "all" ? destinations : destinations.filter((dest) => dest.category === selectedCategory);

  return (
    <div className="travel-page">
      {/* HERO SECTION */}
      <section className="travel-hero">
        <div className="travel-hero-video">
          <video autoPlay loop muted playsInline className="travel-video-bg" preload="auto" webkit-playsinline="true" x5-playsinline="true">
            <source src="/images/Fly.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          <div className="travel-video-overlay"></div>
        </div>
        <div className="travel-hero-content">
          <h1 className="travel-hero-title animate-text">Travel Beyond Boundaries</h1>
          <p className="travel-hero-subtitle animate-text">
            Experience the world through Phoenix Bank's exclusive travel services. From luxury accommodations to curated experiences, we transform your journeys into unforgettable adventures. Your
            passport to extraordinary destinations awaits.
          </p>
          <div className="travel-hero-buttons animate-text">
            <button className="travel-cta-button primary" onClick={handleBookClick}>
              Book Your Journey
            </button>
            <button className="travel-cta-button secondary" onClick={handleLoginClick}>
              Login
            </button>
          </div>
        </div>
      </section>

      {/* SERVICES SECTION */}
      <section className="travel-services-section">
        <h2 className="section-title">Premium Travel Services</h2>
        <p className="section-kicker">Everything you need for the perfect journey</p>

        <div className="services-grid">
          {services.map((service, index) => (
            <div key={index} className="service-card">
              <div className="service-icon">{service.icon}</div>
              <h3 className="service-title">{service.title}</h3>
              <p className="service-description">{service.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* DESTINATIONS SECTION */}
      <section className="destinations-section">
        <h2 className="section-title">Curated Destinations</h2>
        <p className="section-kicker">Discover extraordinary places around the world</p>

        <div className="category-tabs">
          {categories.map((category) => (
            <button key={category} className={`category-tab ${selectedCategory === category ? "active" : ""}`} onClick={() => setSelectedCategory(category)}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>

        <div className="destinations-grid">
          {filteredDestinations.map((destination) => (
            <div key={destination.id} className="destination-card">
              <div className="destination-image">
                <img src={destination.image} alt={destination.name} />
                <div className="destination-overlay">
                  <span className="destination-price">{destination.price}</span>
                </div>
              </div>
              <div className="destination-content">
                <h3 className="destination-name">{destination.name}</h3>
                <p className="destination-location">{destination.location}</p>
                <p className="destination-description">{destination.description}</p>
                <button className="destination-button" onClick={handleBookClick}>
                  Explore {destination.name}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* BENEFITS SECTION */}
      <section className="travel-benefits-section">
        <h2 className="section-title animate-slide-up">Why Choose Phoenix Travel</h2>
        <p className="section-text animate-fade-in">
          As a Phoenix Bank member, you gain access to a world of exclusive travel benefits and services. Our dedicated travel concierge team ensures every detail of your journey is perfectly
          executed, from the moment you book until you return home.
        </p>

        <div className="benefits-list">
          <div className="benefit-item">
            <div className="benefit-icon">✓</div>
            <div className="benefit-content">
              <h3 className="benefit-title">VIP Airport Services</h3>
              <p className="benefit-description">Fast-track through security, access to private lounges, and personalized assistance at airports worldwide.</p>
            </div>
          </div>
          <div className="benefit-item">
            <div className="benefit-icon">✓</div>
            <div className="benefit-content">
              <h3 className="benefit-title">Complimentary Upgrades</h3>
              <p className="benefit-description">Enjoy room upgrades, priority seating, and enhanced amenities at partner hotels and airlines.</p>
            </div>
          </div>
          <div className="benefit-item">
            <div className="benefit-icon">✓</div>
            <div className="benefit-content">
              <h3 className="benefit-title">24/7 Travel Support</h3>
              <p className="benefit-description">Round-the-clock assistance for any travel need, from last-minute changes to emergency support.</p>
            </div>
          </div>
          <div className="benefit-item">
            <div className="benefit-icon">✓</div>
            <div className="benefit-content">
              <h3 className="benefit-title">Exclusive Access</h3>
              <p className="benefit-description">Access to sold-out events, private tours, and experiences unavailable to the general public.</p>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIAL SECTION */}
      <section className="travel-testimonial-section">
        <h2 className="section-title">What Our Members Say</h2>
        <div className="testimonial-content">
          <div className="testimonial-quote">
            <p className="quote-text">
              "Phoenix Bank's travel services transformed our family vacation into an extraordinary experience. Every detail was perfectly arranged, from the private transfers to the exclusive
              restaurant reservations. It's like having a personal travel agent available 24/7."
            </p>
            <div className="quote-author">
              <span className="author-name">Sarah Mitchell</span>
              <span className="author-title">Phoenix Bank Member</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="travel-cta-section">
        <h2 className="section-title">Ready to Explore the World?</h2>
        <p className="section-text">
          Join Phoenix Bank and unlock a world of exclusive travel benefits. Let us craft your next unforgettable journey with personalized service and access to the finest destinations.
        </p>
        <div className="cta-buttons">
          <button className="cta-button primary" onClick={handleBookClick}>
            Start Planning
          </button>
          <button className="cta-button secondary" onClick={handleLoginClick}>
            Login to Account
          </button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
