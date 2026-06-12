

// Animated parallax card stack with 3D tilt and float
import { useEffect, useRef } from "react";
import "../styles/card-stack.css";



// CardStack component
export default function CardStack({ className = "" }) {
  const containerRef = useRef(null);
  const rafRef = useRef(null);



  // Set up animation and event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;



    // Respect user motion preferences
    const prefersReduced =
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;



    // Get card elements
    const cards = Array.from(
      container.querySelectorAll(".cards__card-content")
    );
    if (cards.length === 0) return;



  // Animation config
  const MAX_TILT = 15;
  const SMOOTH = 0.1;
  const FLOAT_STRENGTH = 20;
  const SHINE_STRENGTH = 0.35; // (Unused)
  const INFLUENCE_MARGIN = 200;



  // Animation state
  let target = { rotX: 0, rotY: 0 };
  let current = { rotX: 0, rotY: 0 };
  let scrollY = 0;
  let running = false;
  let hovering = false;



    // True if mouse is near the card stack
    function isNearContainer(clientX, clientY) {
      const r = container.getBoundingClientRect();
      return (
        clientX >= r.left - INFLUENCE_MARGIN &&
        clientX <= r.right + INFLUENCE_MARGIN &&
        clientY >= r.top - INFLUENCE_MARGIN &&
        clientY <= r.bottom + INFLUENCE_MARGIN
      );
    }



    // Mouse movement: update tilt target
    function handleMouseMove(e) {
      const rect = container.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      const near = isNearContainer(e.clientX, e.clientY);
      if (near && !hovering) {
        hovering = true;
        cards.forEach((c) => c.classList.add("hovering"));
      } else if (!near && hovering) {
        hovering = false;
        cards.forEach((c) => c.classList.remove("hovering"));
      }

      let nx = (e.clientX - cx) / (rect.width / 2);
      let ny = (e.clientY - cy) / (rect.height / 2);
      nx = Math.max(-1.3, Math.min(1.3, nx));
      ny = Math.max(-1.3, Math.min(1.3, ny));

      target.rotX = -ny * MAX_TILT;
      target.rotY = nx * MAX_TILT;
    }



    // Scroll: update float position
    function handleScroll() {
      const rect = container.getBoundingClientRect();
      const vh = window.innerHeight;
      const progress = Math.max(0, Math.min(1, (vh - rect.top) / (vh + rect.height)));
      scrollY = (progress - 0.5) * 2;
    }



    // Animation loop: smoothly update transforms
    function animate() {
      current.rotX += (target.rotX - current.rotX) * SMOOTH;
      current.rotY += (target.rotY - current.rotY) * SMOOTH;

      const baseFloat = scrollY * FLOAT_STRENGTH;

      cards.forEach((card, i) => {
        const isSecond = i === 1;
        const rotX = current.rotX * (isSecond ? 0.8 : 1);
        const rotY = current.rotY * (isSecond ? -0.7 : 0.7);
        const floatY = baseFloat * (isSecond ? 1 : 1.2);

        card.style.transform =
          `translate3d(0, ${floatY.toFixed(2)}px, 0) ` +
          `rotateX(${rotX.toFixed(2)}deg) ` +
          `rotateY(${rotY.toFixed(2)}deg)`;
      });

      rafRef.current = requestAnimationFrame(animate);
    }



    // Start animation loop
    function start() {
      if (running || prefersReduced) return;
      running = true;
      handleScroll();
      rafRef.current = requestAnimationFrame(animate);
    }



    // Stop animation loop
    function stop() {
      running = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }



    // Listen for mouse, scroll, and resize
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });

    if (!prefersReduced) {
      handleScroll();
      start();
    }

    // Cleanup on unmount
    return () => {
      stop();
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);


  // Render two stacked cards with shine and shadow
  return (
    <div ref={containerRef} className={`cards__parallax ${className}`}>
      {/* Card 1 (Front) */}
      <div className="cards__card-wrap mod--1">
        <div className="cards__card-content mod--1">
          <div className="cards__card mod--1">
            <div className="card__shine-wrap">
              <div className="card__shine" />
            </div>
          </div>
          <img
            src="https://assets.website-files.com/62fa5980cd922182416f3647/62fb8877d1985714a70fc49e_credit-card-shadow2.svg"
            alt=""
            className="cards__shadow"
          />
        </div>
      </div>

      {/* Card 2 (Back) */}
      <div className="cards__card-wrap mod--2">
        <div className="cards__card-content mod--2">
          <div className="cards__card mod--2">
            <div className="card__shine-wrap">
              <div className="card__shine mod--2" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
