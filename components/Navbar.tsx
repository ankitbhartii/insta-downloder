'use client';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';

export default function Navbar() {
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    gsap.to(navRef.current, {
      y: 0,
      duration: 1,
      ease: 'power4.out',
      delay: 0.2,
    });
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav ref={navRef} className="navbar">
      <div className="navbar__logo">InstaDown</div>
      <div className="navbar__links">
        <button
          className="nav-link"
          onClick={() => scrollTo('downloader')}
        >
          <span>Download</span>
          <span>Download</span>
        </button>
        <button
          className="nav-link"
          onClick={() => scrollTo('features')}
        >
          <span>Features</span>
          <span>Features</span>
        </button>
        <a
          href="https://www.instagram.com"
          target="_blank"
          rel="noopener noreferrer"
          className="nav-link"
        >
          <span>Instagram</span>
          <span>Instagram</span>
        </a>
      </div>
    </nav>
  );
}
