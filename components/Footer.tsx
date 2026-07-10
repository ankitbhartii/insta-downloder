'use client';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="footer">
      <div className="footer__logo">InstaDown</div>
      <p className="footer__copy">© {year} InstaDown. For personal use only.</p>
      <a
        href="https://github.com/ankitbhartii/insta-downloder"
        target="_blank"
        rel="noopener noreferrer"
        className="footer__link"
      >
        GitHub ↗
      </a>
    </footer>
  );
}
