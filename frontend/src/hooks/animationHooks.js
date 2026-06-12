import { useEffect } from 'react';

/** Adds .is-inview when element enters viewport */
export function useInView(ref, { rootMargin = '0px 0px -10% 0px', once = true } = {}) {
  useEffect(() => {
    const el = ref?.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        el.classList.add('is-inview');
        if (once) io.unobserve(el);
      } else if (!once) {
        el.classList.remove('is-inview');
      }
    }, { rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin, once]);
}

/** Sets CSS var --p based on scroll for a subtle Y parallax */
export function useParallax(ref, factor = -0.08) {
  useEffect(() => {
    const el = ref?.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        const y = rect.top + rect.height / 2 - window.innerHeight / 2; // signed offset from viewport centre
        el.style.setProperty('--p', (y * factor).toFixed(2));
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [ref, factor]);
}
