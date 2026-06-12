import { useEffect, useRef } from "react";
import anime from "animejs/lib/anime.es.js";
import "../styles/hero.css";
import CardStack from "./CardStack";

export default function Hero() {
  const heroRef = useRef(null);

  // Each text line starts off-screen to the right (opacity 0, translateX 40vw)
  // and slides in with staggered 200ms delays so the lines feel like they're
  // arriving in sequence rather than all appearing at once. The 800ms initial
  // hold gives the page a moment to paint before anything moves.
  useEffect(() => {
    const lines = [
      { target: '#fade-up-0', delay: 0 },
      { target: '#fade-up-1', delay: 200 },
      { target: '#fade-up-2', delay: 400 },
      { target: '#fade-up-3', delay: 600 },
      { target: '#fade-up-5', delay: 800 }
    ];

    lines.forEach(({ target, delay }) => {
      anime({
        targets: target,
        translateX: ['40vw', 0],
        opacity: [0, 1],
        easing: 'easeOutExpo',
        duration: 1800,
        delay: 800 + delay
      });
    });

  }, []);

  return (
    <section id="home-hero" ref={heroRef} className="section-home-hero">
      <div className="background-video">
        <video className="background-video__el" autoPlay muted playsInline loop>
          <source src="https://cdn.prod.website-files.com/677d508a36a9c9d4b11dfaaa/677d508a36a9c9d4b11dfb9c_video%20-%20motion%20graphic%20bg-transcode.mp4" type="video/mp4" />
        </video>
        <div className="background-video__gradient" />
      </div>

      <div className="hero-container">
        <div
          id="fade-up-0"
          className="home-hero_line"
          style={{ opacity: 0, transform: 'translate3d(40vw, 0, 0)' }}
        >
          <div className="text-style-1 text-style-muted">
            Entrepreneurs, Students, Families
          </div>
        </div>

        <div
          id="fade-up-1"
          className="home-hero_line"
          style={{ opacity: 0, transform: 'translate3d(40vw, 0, 0)' }}
        >
          <h1 className="heading-style-h3">Your financial future</h1>
        </div>

        <div
          id="fade-up-2"
          className="home-hero_line"
          style={{ opacity: 0, transform: 'translate3d(40vw, 0, 0)' }}
        >
          <h1 className="heading-style-h3">now fits nicely</h1>
        </div>

        <div
          id="fade-up-3"
          className="home-hero_line"
          style={{ opacity: 0, transform: 'translate3d(40vw, 0, 0)' }}
        >
          <h1 className="heading-style-h3">in your hand.</h1>
        </div>

        <div
          id="fade-up-5"
          className="home-hero_line"
          style={{ opacity: 0, transform: 'translate3d(40vw, 0, 0)' }}
        >
          <div className="heading-style-h7 text-style-muted">
            Experience banking reimagined. Open your account in minutes, earn up to 3% cashback
            on all purchases, and access premium features with zero monthly fees.
          </div>
        </div>
      </div>

      <CardStack className="hero-cards" />
      <div className="home-hero_bottom-fade" />
    </section>
  );
}
