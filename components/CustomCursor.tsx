'use client';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';

export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const posRef = useRef({ x: 0, y: 0 });
  const targetRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor) return;

    // Show cursor on first move
    const onMove = (e: MouseEvent) => {
      targetRef.current = { x: e.clientX, y: e.clientY };
      gsap.set(cursor, { opacity: 1 });
    };

    // Smooth lag follow
    const tick = () => {
      posRef.current.x += (targetRef.current.x - posRef.current.x) * 0.12;
      posRef.current.y += (targetRef.current.y - posRef.current.y) * 0.12;
      gsap.set(cursor, { x: posRef.current.x, y: posRef.current.y });
    };
    gsap.ticker.add(tick);

    const addHover = () => cursor.classList.add('hover');
    const removeHover = () => cursor.classList.remove('hover');
    const addClick = () => cursor.classList.add('clicking');
    const removeClick = () => cursor.classList.remove('clicking');

    // Hover on all interactive elements
    const targets = document.querySelectorAll('a, button, input, [role="button"]');
    targets.forEach((el) => {
      el.addEventListener('mouseenter', addHover);
      el.addEventListener('mouseleave', removeHover);
    });

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mousedown', addClick);
    document.addEventListener('mouseup', removeClick);

    return () => {
      gsap.ticker.remove(tick);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mousedown', addClick);
      document.removeEventListener('mouseup', removeClick);
      targets.forEach((el) => {
        el.removeEventListener('mouseenter', addHover);
        el.removeEventListener('mouseleave', removeHover);
      });
    };
  }, []);

  return <div ref={cursorRef} className="cursor" style={{ opacity: 0 }} />;
}
