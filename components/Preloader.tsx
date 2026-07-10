'use client';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';

export default function Preloader({ onComplete }: { onComplete: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        onComplete: () => {
          // Wipe upward and call onComplete
          gsap.to(rootRef.current, {
            yPercent: -100,
            duration: 0.9,
            ease: 'power4.inOut',
            onComplete,
          });
        },
      });

      // Logo appear
      tl.to(logoRef.current, { opacity: 1, duration: 0.5, ease: 'power2.out' });

      // Counter 0→100
      const obj = { val: 0 };
      tl.to(
        obj,
        {
          val: 100,
          duration: 1.6,
          ease: 'power2.inOut',
          onUpdate() {
            if (counterRef.current) {
              counterRef.current.textContent = Math.floor(obj.val).toString().padStart(2, '0') + '%';
            }
          },
        },
        0
      );

      // Progress bar
      tl.to(barRef.current, { width: '100%', duration: 1.6, ease: 'power2.inOut' }, 0);

      // Small hold
      tl.to({}, { duration: 0.3 });
    }, rootRef);

    return () => ctx.revert();
  }, [onComplete]);

  return (
    <div ref={rootRef} className="preloader">
      <div ref={logoRef} className="preloader__logo">InstaDown</div>
      <div className="preloader__counter">
        <span ref={counterRef}>00%</span>
      </div>
      <div ref={barRef} className="preloader__bar" />
    </div>
  );
}
