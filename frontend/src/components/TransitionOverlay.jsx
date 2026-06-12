import { useEffect, useRef } from "react";
import { motion, useAnimation } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";

export default function TransitionOverlay({ isLoggedIn = false }) {
  const leftCtrl = useAnimation();
  const rightCtrl = useAnimation();
  const navigate = useNavigate();
  const location = useLocation();
  const isAnimating = useRef(false);
  const pendingNavigation = useRef(null);

  useEffect(() => {
    if (isLoggedIn) return;

    const handleClick = (e) => {
      const link = e.target.closest("a");
      if (!link || isAnimating.current) return;

      const href = link.getAttribute("href");
      if (
        !href ||
        link.target === "_blank" ||
        link.hasAttribute("data-no-transition") ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("http")
      ) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      if (href === location.pathname) return;

      isAnimating.current = true;
      pendingNavigation.current = href;

      (async () => {
        // Slide IN - SLOWER AND SMOOTHER
        Promise.all([
          leftCtrl.start({
            x: "0%",
            y: "0%",
            opacity: 1,
            transition: { 
              duration: 1, 
              ease: [0.83, 0, 0.17, 1] // Even smoother
            }
          }),
          rightCtrl.start({
            x: "0%",
            y: "0%",
            opacity: 1,
            transition: { 
              duration: 1, 
              ease: [0.83, 0, 0.17, 1]
            }
          })
        ]);

        await new Promise(resolve => setTimeout(resolve, 600));
        navigate(pendingNavigation.current);

        await new Promise(resolve => setTimeout(resolve, 350));

        // Slide OUT
        await Promise.all([
          leftCtrl.start({
            x: "-100%",
            y: "-100%",
            opacity: 0,
            transition: { 
              duration: 0.8, 
              ease: [0.83, 0, 0.17, 1]
            }
          }),
          rightCtrl.start({
            x: "100%",
            y: "100%",
            opacity: 0,
            transition: { 
              duration: 0.8, 
              ease: [0.83, 0, 0.17, 1]
            }
          })
        ]);

        isAnimating.current = false;
        pendingNavigation.current = null;
      })();
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [isLoggedIn, leftCtrl, rightCtrl, navigate, location.pathname]);

  return (
    <>
      <motion.div
        className="diagonal-panel diagonal-panel-1"
        animate={leftCtrl}
        initial={{ x: "-120%", y: "-80%", opacity: 0 }}
        style={{ pointerEvents: "none" }}
      />

      <motion.div
        className="diagonal-panel diagonal-panel-2"
        animate={rightCtrl}
        initial={{ x: "120%", y: "80%", opacity: 0 }}
        style={{ pointerEvents: "none" }}
      />
    </>
  );
}