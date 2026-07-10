'use client';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const features = [
  {
    icon: '⚡',
    title: 'Instant HD Downloads',
    desc: 'Extracts the highest-quality source file directly from Instagram CDN — no compression, no watermarks.',
  },
  {
    icon: '🔐',
    title: 'Session-Authenticated',
    desc: 'Uses your encrypted session cookies to bypass Instagram\'s login walls and access public content securely.',
  },
  {
    icon: '🎬',
    title: 'Reels & Photos',
    desc: 'Supports all post formats — single photos, carousels, Reels, IGTV, and Stories in full resolution.',
  },
  {
    icon: '🌐',
    title: 'Smart CDN Proxy',
    desc: 'All downloads stream through our server, bypassing CORS and hotlinking restrictions seamlessly.',
  },
  {
    icon: '🔄',
    title: 'Multi-Strategy Scraping',
    desc: 'Four fallback scraping strategies ensure you always get the media, even when Instagram changes its API.',
  },
  {
    icon: '🛡️',
    title: 'Privacy First',
    desc: 'Your cookies never leave your machine. No analytics, no tracking, no data stored on any server.',
  },
];

export default function FeaturesSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Title reveal
      gsap.from('.features-section .section-title', {
        y: 40,
        opacity: 0,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 80%',
        },
      });

      // Cards stagger
      gsap.from(cardsRef.current, {
        y: 60,
        opacity: 0,
        scale: 0.92,
        duration: 0.8,
        stagger: 0.1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 70%',
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section id="features" ref={sectionRef} className="features-section">
      <p className="section-eyebrow">Why InstaDown</p>
      <h2 className="section-title">
        Built for speed,<br />
        <span className="gradient-text">built to last.</span>
      </h2>
      <div className="features-grid">
        {features.map((f, i) => (
          <div
            key={f.title}
            className="feature-card"
            ref={(el) => { if (el) cardsRef.current[i] = el; }}
          >
            <div className="feature-icon">{f.icon}</div>
            <h3 className="feature-title">{f.title}</h3>
            <p className="feature-desc">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
