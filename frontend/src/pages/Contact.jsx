import React from 'react';
import Footer from '../components/Footer';
import '../styles/contact.css';

export default function Contact() {
  return (
    <div className="contact-page">
      <div className="contact-background">
        <div className="contact-overlay"></div>
      </div>
      
      <div className="contact-content">
        <div className="contact-glass-card">
          <h1 className="contact-title">CONTACT US</h1>
          <p className="contact-text">
            Have questions or want to learn more about Phoenix Banking? We'd love to hear from you.
          </p>
          <a href="mailto:contact@phoenixbank.com" className="contact-email">
            contact@phoenixbank.com
          </a>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
