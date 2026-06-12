/* Mouse parallax/tilt + animated shine sweep */
(() => {
  const root = document.getElementById('cardsParallax');
  if (!root) return;

  const wraps = root.querySelectorAll('.cards__card-wrap');
  const contents = root.querySelectorAll('.cards__card-content');
  const shines = root.querySelectorAll('.card__shine');

  let mx = 0, my = 0; // normalised pointer position (-1..1 per axis)
  let rx = 0, ry = 0; // current interpolated rotation angles
  let raf;

  function onMove(e) {
    const rect = root.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    mx = (px - 0.5) * 2;
    my = (py - 0.5) * 2;
  }

  function animate() {
    rx += ((my * 10) - rx) * 0.08; // lerp toward target — 0.08 controls lag
    ry += ((-mx * 12) - ry) * 0.08;

    contents.forEach((el, i) => {
      const depth = (i + 1) * 18; // stagger Z depth per layer
      el.style.transform =
        `rotateX(${rx}deg) rotateY(${ry}deg) translateZ(${depth}px)`;
    });

    shines.forEach((s) => {
      const offset = (mx + 1) * 60; // 0..120% sweep range
      s.style.transform = `translateX(${offset}%) rotate(12deg)`;
    });

    raf = requestAnimationFrame(animate);
  }

  function kickShine() {
    shines.forEach((s, idx) => {
      s.animate(
        [{ transform: 'translateX(-120%) rotate(12deg)' },
         { transform: 'translateX(120%) rotate(12deg)' }],
        { duration: 1800 + idx*300, iterations: 1, easing: 'cubic-bezier(.22,.61,.36,1)' }
      );
    });
  }

  root.addEventListener('mousemove', onMove);
  root.addEventListener('mouseenter', kickShine);

  window.addEventListener('deviceorientation', (e) => {
    // gamma/beta range ±90°; divide by 45 to map to roughly ±2, matching pointer scale
    const gamma = (e.gamma || 0) / 45;
    const beta  = (e.beta  || 0) / 45;
    mx = Math.max(-1, Math.min(1, gamma));
    my = Math.max(-1, Math.min(1, beta));
  }, { passive: true });

  animate();
  animate();
})();
