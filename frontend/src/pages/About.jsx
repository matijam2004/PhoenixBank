// About — Student project (hero, who we are, footer only)

import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import Footer from "../components/Footer";
const StoryVideo = "/images/Story.mp4";
import "../styles/about.css";

/* Animations */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", duration: 0.9, bounce: 0.35 } }
};
const slideLeft = {
  hidden: { opacity: 0, x: -40 },
  visible: { opacity: 1, x: 0, transition: { type: "spring", duration: 0.9, bounce: 0.35 } }
};
const slideRight = {
  hidden: { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0, transition: { type: "spring", duration: 0.9, bounce: 0.35 } }
};

export default function AboutPage() {
  const video1Ref = useRef(null);
  const video2Ref = useRef(null);

  useEffect(() => {
    const v1 = video1Ref.current;
    const v2 = video2Ref.current;
    if (!v1 || !v2) return;

    // Start with first video visible
    v1.style.opacity = '1';
    v2.style.opacity = '0';

    const handleTimeUpdate1 = () => {
      // Start fade 0.5s before end
      if (v1.duration - v1.currentTime < 0.5) {
        v2.currentTime = 0;
        v2.play();
        v2.style.opacity = '1';
        v1.style.opacity = '0';
      }
    };

    const handleTimeUpdate2 = () => {
      // Start fade 0.5s before end
      if (v2.duration - v2.currentTime < 0.5) {
        v1.currentTime = 0;
        v1.play();
        v1.style.opacity = '1';
        v2.style.opacity = '0';
      }
    };

    v1.addEventListener('timeupdate', handleTimeUpdate1);
    v2.addEventListener('timeupdate', handleTimeUpdate2);

    return () => {
      v1.removeEventListener('timeupdate', handleTimeUpdate1);
      v2.removeEventListener('timeupdate', handleTimeUpdate2);
    };
  }, []);

  const scrollToNext = (e) => {
    e.preventDefault();
    const el = document.getElementById("story");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="about-page pro-black">
      {/* Background Video for entire page - seamless loop with crossfade */}
      <div className="about-page-background">
        <video
          ref={video1Ref}
          className="about-bg-video"
          src={StoryVideo}
          autoPlay
          muted
          playsInline
        />
        <video
          ref={video2Ref}
          className="about-bg-video"
          src={StoryVideo}
          muted
          playsInline
        />
        <div className="about-bg-overlay" />
      </div>

      {/* HERO */}
      <section className="hero">
        <div className="hero-inner">
          <motion.h1
            className="display hero-title"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.7 }}
          >
            Our Story
          </motion.h1>

          <motion.div
            className="hero-bottom"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.7 }}
          >
            <div className="hero-bottom-inner">
              <p className="lede hero-lede">
                We're five students building a polished class project—combining product thinking,
                engineering and design to learn how teams ship real experiences.
              </p>
              <button className="scroll-cue" aria-label="Scroll to next section" onClick={scrollToNext} />
            </div>
          </motion.div>
        </div>
      </section>

      {/* WHO WE ARE (STORY) */}
      <section className="story-block" id="story">
        <motion.div
          className="story-content"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, amount: 0.4 }}
        >
          <h2 className="h2">Who We Are</h2>
          <p className="body">
            We're classmates learning by doing: planning, prototyping, testing, and iterating like a
            product team—on a real deadline.
          </p>
          <p className="body">
            Our goals are simple: write clear code, design clearly, communicate well, and ship
            something we're proud to present.
          </p>
        </motion.div>
      </section>

      {/* WHAT WE'RE BUILDING */}
      <section className="building-section">
        <motion.div
          className="section-header"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          <h2 className="section-title-large">What We're Building</h2>
        </motion.div>
        <div className="building-container">

          <motion.div
            className="features-grid"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
          >
            <div className="feature-item">
              <div className="feature-number">01</div>
              <h3>Account Management</h3>
              <p>Multi-account support with real-time balance tracking, transaction history, and instant notifications for every activity.</p>
            </div>

            <div className="feature-item">
              <div className="feature-number">02</div>
              <h3>Secure Transfers</h3>
              <p>End-to-end encrypted transfers with two-factor authentication, biometric verification, and advanced fraud detection systems.</p>
            </div>

            <div className="feature-item">
              <div className="feature-number">03</div>
              <h3>Check Deposits</h3>
              <p>Mobile check deposits powered by OCR and machine learning for instant processing, verification, and credit to your account.</p>
            </div>

            <div className="feature-item">
              <div className="feature-number">04</div>
              <h3>Scheduled Payments</h3>
              <p>Automate your finances with recurring payments, bill scheduling, and smart reminders—never miss a payment again.</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* TECH STACK */}
      <section className="tech-section">
        <motion.div
          className="section-header center"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
        >
          <h2 className="section-title-large">Built With Modern Standards</h2>
        </motion.div>
        <div className="tech-container">

          <motion.div
            className="tech-grid"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
          >
            <div className="tech-card">
              <div className="tech-category">Frontend</div>
              <div className="tech-stack-list">
                <span className="tech-item">React 18</span>
                <span className="tech-item">Vite</span>
                <span className="tech-item">Framer Motion</span>
                <span className="tech-item">Axios</span>
              </div>
            </div>

            <div className="tech-card">
              <div className="tech-category">Backend</div>
              <div className="tech-stack-list">
                <span className="tech-item">FastAPI</span>
                <span className="tech-item">Python 3.11</span>
                <span className="tech-item">JWT Auth</span>
                <span className="tech-item">Pydantic</span>
              </div>
            </div>

            <div className="tech-card">
              <div className="tech-category">Database</div>
              <div className="tech-stack-list">
                <span className="tech-item">MongoDB</span>
                <span className="tech-item">Redis Cache</span>
                <span className="tech-item">Motor Async</span>
                <span className="tech-item">Aggregation</span>
              </div>
            </div>

            <div className="tech-card">
              <div className="tech-category">DevOps</div>
              <div className="tech-stack-list">
                <span className="tech-item">Docker</span>
                <span className="tech-item">Git</span>
                <span className="tech-item">CI/CD</span>
                <span className="tech-item">VS Code</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* PROJECT STATS */}
      <section className="stats-section">
        <motion.div
          className="section-header"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
        >
          <h2 className="section-title-large">By The Numbers</h2>
        </motion.div>
        <div className="stats-container">
          <motion.div
            className="stats-grid"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
            <div className="stat-item">
              <div className="stat-number">5</div>
              <div className="stat-label">Dedicated Team Members</div>
              <div className="stat-detail">Working in sync across frontend, backend, and design</div>
            </div>

            <div className="stat-item">
              <div className="stat-number">12</div>
              <div className="stat-label">Weeks of Development</div>
              <div className="stat-detail">From initial concept to production-ready platform</div>
            </div>

            <div className="stat-item">
              <div className="stat-number">15+</div>
              <div className="stat-label">Core Features</div>
              <div className="stat-detail">Covering all essential banking operations</div>
            </div>

            <div className="stat-item">
              <div className="stat-number">100%</div>
              <div className="stat-label">Student Built</div>
              <div className="stat-detail">Turning classroom knowledge into real solutions</div>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
