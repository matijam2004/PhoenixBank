// Animated text reveal that slides words in from sides on scroll
import { useEffect, useRef } from "react";
import "../styles/feature-grid.css";

export default function FeatureGrid() {
  const ref = useRef(null);

  // Animate words sliding in from left and right
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const word1 = el.querySelector('#word-1');
    const word2 = el.querySelector('#word-2');
    const word3 = el.querySelector('#word-3');

    const handleScroll = () => {
      const rect = el.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      
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

      // Word 1 - slides from left
      const translate1 = -100 + (progress * 100);
      word1.style.transform = `translateX(${translate1}vw)`;
      word1.style.opacity = progress;

      // Word 2 - slides from right
      const translate2 = 100 - (progress * 100);
      word2.style.transform = `translateX(${translate2}vw)`;
      word2.style.opacity = progress;

      // Word 3 - slides from left
      const translate3 = -100 + (progress * 100);
      word3.style.transform = `translateX(${translate3}vw)`;
      word3.style.opacity = progress;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section id="feature-grid" ref={ref} className="fg">
      <div className="fg-words">
        <h2 id="word-1" className="fg-word">Founders</h2>
        <h2 id="word-2" className="fg-word">Students</h2>
        <h2 id="word-3" className="fg-word">Families</h2>
      </div>
    </section>
  );
}