// Main landing page with hero and features
import React from 'react';
import Hero from '../components/Hero.jsx';
import FeatureGrid from '../components/FeatureGrid.jsx';
import Metrics from '../components/Metrics.jsx';
import Footer from '../components/Footer.jsx';
import Process from '../components/Process.jsx';

export default function LandingPage() {
  return (
    <>
      <Hero />
      <FeatureGrid />
      <Metrics />
      <Process />
      <Footer />
    </>
  );
}