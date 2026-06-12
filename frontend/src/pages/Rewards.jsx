// Phoenix Bank Rewards page - loyalty program and redemption options
import React, { useState, useRef, useEffect } from "react";
import "../styles/rewards.css";
import Footer from "../components/Footer";
const BoatLeft = "/images/Relax.png";
const ShoppingImg = "/images/Chanel.png";
const HotelImg = "/images/Hotel.png";
const YachtImg = "/images/Yacht.png";
const FlightImg = "/images/Flights.png";
const SuggestedNY = "/images/NewYork.png";
const SuggestedLondon = "/images/London.png";

// Scroll handler - add .visible class to trigger animations
const useScrollAnimation = () => {
  useEffect(() => {
    const handleScroll = () => {
      const windowHeight = window.innerHeight;

      // Hero image animation - repeatable
      const heroImage = document.querySelector('.rewards-hero-image');
      if (heroImage) {
        const rect = heroImage.getBoundingClientRect();
        if (rect.top < windowHeight * 0.85 && rect.bottom > 0) {
          heroImage.classList.add('visible');
        } else {
          heroImage.classList.remove('visible');
        }
      }

      // Panel animations (Spend, Earn, Enjoy) - repeatable
      const panels = document.querySelectorAll('.slanted-panel');
      panels.forEach((panel) => {
        const rect = panel.getBoundingClientRect();
        if (rect.top < windowHeight * 0.85 && rect.bottom > 0) {
          panel.classList.add('visible');
          panel.classList.add('shown'); // For .reveal2 animation
        } else {
          panel.classList.remove('visible');
          panel.classList.remove('shown');
        }
      });

      // World section animations - repeatable
      const worldSection = document.querySelector('.world-section');
      if (worldSection) {
        const rect = worldSection.getBoundingClientRect();
        if (rect.top < windowHeight * 0.75 && rect.bottom > 0) {
          worldSection.classList.add('animate-visible');
        } else {
          worldSection.classList.remove('animate-visible');
        }
      }

      // Redeem section animations - repeatable
      const redeemSection = document.querySelector('.redeem-section');
      if (redeemSection) {
        const rect = redeemSection.getBoundingClientRect();
        if (rect.top < windowHeight * 0.75 && rect.bottom > 0) {
          redeemSection.classList.add('animate-visible');
        } else {
          redeemSection.classList.remove('animate-visible');
        }
      }

      // Suggested section - repeatable
      const suggestedSection = document.querySelector('.suggested-section');
      if (suggestedSection) {
        const rect = suggestedSection.getBoundingClientRect();
        if (rect.top < windowHeight * 0.75 && rect.bottom > 0) {
          suggestedSection.classList.add('animate-visible');
        } else {
          suggestedSection.classList.remove('animate-visible');
        }
      }

      // Suggested cards - repeatable
      const cards = document.querySelectorAll('.suggested-card');
      cards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        if (rect.top < windowHeight * 0.85 && rect.bottom > 0) {
          card.classList.add('visible');
        } else {
          card.classList.remove('visible');
        }
      });

      // Testimonial - repeatable
      const testimonial = document.querySelector('.testimonial-content');
      if (testimonial) {
        const rect = testimonial.getBoundingClientRect();
        if (rect.top < windowHeight * 0.85 && rect.bottom > 0) {
          testimonial.classList.add('visible');
        } else {
          testimonial.classList.remove('visible');
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    setTimeout(handleScroll, 100);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
};

// Split text into animated letter spans - EXACT INSIGNIA STRUCTURE
const AnimatedText = ({ text }) => {
  return (
    <span style={{ display: 'inline-block', position: 'relative' }}>
      {text.split('').map((char, index) => (
        <span
          key={index}
          style={{
            display: 'inline-block',
            position: 'relative',
            transitionDelay: `${0.4 + (index * 0.03)}s`
          }}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </span>
  );
};

export default function RewardsPage() {
  // Enable scroll animations
  useScrollAnimation();

  const handleLoginClick = () => {
    window.location.href = '/login';
  };

  return (
    <div className="rewards-page">
      {/* HERO SECTION */}
      <section className="rewards-hero">
        <div className="rewards-hero-content">
          <h1 className="rewards-hero-title animate-text">Get More From The Brands You Love</h1>
          <p className="rewards-hero-subtitle animate-text">
            Unlock your world and let your loyalty be rewarded with even greater products and experiences.
            As a Phoenix Bank cardmember, you will enjoy unrivalled service and best experiences
            across travel, shopping and entertainment.
          </p>
          <button className="rewards-login-btn animate-text" onClick={handleLoginClick}>Login</button>
        </div>
        <div className="rewards-hero-image">
          { }
          <img src="/images/Mountains.png" alt="Phoenix Rewards" style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'right center',
          }} />
        </div>
      </section>

      {/* YOU SPEND WE REWARD */}
      <section className="spend-reward-section">
        <h2 className="section-title">You spend, we reward</h2>
        <p className="section-kicker">On top of the world with Phoenix Rewards</p>

        { }
        <div className="slanted-stack" style={{ position: 'relative' }}>
          { }
          <div className="content-row full-width relative reveal2 slanted-panel">
            <div className="parallax">
              <img src="/images/Spend.png" alt="Spend" />
            </div>
            <div className="content-row-in relative some-overlay hoverblock">
              <div className="vmiddle center">
                <div className="style1 white">
                  Spend
                </div>
                <div className="mt20 fw300 style4 white">
                  On your card and with lifestyle management services
                </div>
              </div>
            </div>
          </div>

          {/* EARN - Full width panel */}
          <div className="content-row full-width relative reveal2 slanted-panel">
            <div className="parallax">
              <img src="/images/Transaction.png" alt="Earn" />
            </div>
            <div className="content-row-in relative some-overlay hoverblock">
              <div className="vmiddle center">
                <div className="style1 white">
                  Earn
                </div>
                <div className="mt20 fw300 style4 white">
                  Points on every transaction
                </div>
              </div>
            </div>
          </div>

          {/* ENJOY - Full width panel */}
          <div className="content-row full-width relative reveal2 slanted-panel">
            <div className="parallax">
              <img src="/images/Enjoy.png" alt="Enjoy" />
            </div>
            <div className="content-row-in relative some-overlay hoverblock">
              <div className="vmiddle center">
                <div className="style1 white">
                  Enjoy
                </div>
                <div className="mt20 fw300 style4 white">
                  Loyalty rewards with Phoenix
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* THE WORLD BELONGS TO YOU */}
      <section className="world-section animate-section">
        <h2 className="section-title animate-slide-up">The World Belongs To You</h2>
        <p className="section-text animate-fade-in">
          We've developed a pioneering loyalty programme that allows us to reward you wherever
          you use your Phoenix card. Once you've built up a balance, you'll be able to shop,
          book travel or simply check your points at the touch of a button.
        </p>
        <button className="cta-button animate-scale-in" onClick={handleLoginClick}>Login</button>
      </section>

      { }
      <section className="redeem-section">
        { }
        <div className="leftimage leftimage3">
          <div className="leftonehelper">
            <picture>
              <img src={BoatLeft} alt="Boat on Lake" className="object-fit" />
            </picture>
          </div>
        </div>

        {/* Right side content */}
        <div className="rightside light-bg relative reveal2 shown">
          <div className="center">
            <h2 className="section-title animate-slide-up">Redeem Your Points</h2>
            <p className="section-subtitle animate-fade-in">
              Welcome to Phoenix's new loyalty scheme. Spend on your card or with our lifestyle
              management services and be rewarded with gifts, flights, hotel stays and much more.
            </p>
          </div>

          {/* Grid of 4 cards */}
          <div className="redemption-grid grid2">
            <div className="grid-element flex vertical-flex card-animate" style={{ animationDelay: '0.2s' }}>
              <div>
                <div className="media-helper">
                  <div className="media-helper2">
                    <div className="media-helper3">
                      <picture>
                        <img src={ShoppingImg} alt="Shopping" className="object-fit" />
                      </picture>
                    </div>
                  </div>
                  <div className="image-text-overlay">
                    <h3 className="image-overlay-title">Go shopping</h3>
                  </div>
                </div>
              </div>
              <div className="white-bg card-content">
                <h3 className="card-title">Go shopping</h3>
                <div className="card-line"></div>
                <p className="card-text">Treat yourself with the things you love - pay with your Phoenix Rewards points</p>
              </div>
            </div>

            <div className="grid-element flex vertical-flex card-animate" style={{ animationDelay: '0.4s' }}>
              <div>
                <div className="media-helper">
                  <div className="media-helper2">
                    <div className="media-helper3">
                      <picture>
                        <img src={HotelImg} alt="Hotel" className="object-fit" />
                      </picture>
                    </div>
                  </div>
                  <div className="image-text-overlay">
                    <h3 className="image-overlay-title">Browse hotels</h3>
                  </div>
                </div>
              </div>
              <div className="white-bg card-content">
                <h3 className="card-title">Browse hotels</h3>
                <div className="card-line"></div>
                <p className="card-text">Expand your horizons even further with Phoenix Rewards points - choose from a hand-picked selection of the world's finest hotels and resorts</p>
              </div>
            </div>

            <div className="grid-element flex vertical-flex card-animate" style={{ animationDelay: '0.6s' }}>
              <div>
                <div className="media-helper">
                  <div className="media-helper2">
                    <div className="media-helper3">
                      <picture>
                        <img src={YachtImg} alt="Charter" className="object-fit" />
                      </picture>
                    </div>
                  </div>
                  <div className="image-text-overlay">
                    <h3 className="image-overlay-title">Reserve a charter</h3>
                  </div>
                </div>
              </div>
              <div className="white-bg card-content">
                <h3 className="card-title">Reserve a charter</h3>
                <div className="card-line"></div>
                <p className="card-text">Explore boats, yachts, cruises and charter destinations for the ultimate experience</p>
              </div>
            </div>

            <div className="grid-element flex vertical-flex card-animate" style={{ animationDelay: '0.8s' }}>
              <div>
                <div className="media-helper">
                  <div className="media-helper2">
                    <div className="media-helper3">
                      <picture>
                        <img src={FlightImg} alt="Flights" className="object-fit" />
                      </picture>
                    </div>
                  </div>
                  <div className="image-text-overlay">
                    <h3 className="image-overlay-title">Book flights</h3>
                  </div>
                </div>
              </div>
              <div className="white-bg card-content">
                <h3 className="card-title">Book flights</h3>
                <div className="card-line"></div>
                <p className="card-text">Book flights to your favourite destinations today using your points and air miles</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SUGGESTED FOR YOU */}
      <section className="suggested-section">
        <h2 className="section-title">Suggested For You</h2>

        <div className="suggested-cards">
          <div className="suggested-card">
            <div className="suggested-image">
              <img src={SuggestedNY} alt="New York City" />
            </div>
            <div className="suggested-content">
              <h3 className="suggested-title">About Rewards</h3>
              <p className="suggested-text">
                Both historic and modern, visit New York City and experience the Concrete Jungle like
                never before.
              </p>
            </div>
          </div>

          <div className="suggested-card">
            <div className="suggested-image">
              <img src={SuggestedLondon} alt="Luxury Travel" />
            </div>
            <div className="suggested-content">
              <h3 className="suggested-title">Premium Experiences</h3>
              <p className="suggested-text">
                Discover exclusive destinations and best experiences curated just for you.
                Use your Phoenix Rewards points to unlock unforgettable moments.
              </p>
            </div>
          </div>
        </div>
      </section>

      { }
      <section className="testimonial-section">
        <h2 className="section-title">Phoenix Bank in the Press</h2>
        <div className="testimonial-content">
          <div className="testimonial-quote">
            <p className="quote-text">
              "Highly personalised and exclusive services to those who want to experience
              the best life has to offer."
            </p>
            <div className="quote-source">
              { }
              <img src="/images/press-logo.png" alt="Press" />
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}