'use client';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface OrbMesh extends THREE.Mesh {
  vel: THREE.Vector3;
}

export default function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Scene setup
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
    camera.position.z = 5;

    // Instagram-palette gradient orbs using shader material
    const orbs: THREE.Mesh[] = [];
    const orbColors = [
      new THREE.Color('#f09433'),
      new THREE.Color('#e6683c'),
      new THREE.Color('#dc2743'),
      new THREE.Color('#cc2366'),
      new THREE.Color('#bc1888'),
      new THREE.Color('#833ab4'),
    ];

    for (let i = 0; i < 22; i++) {
      const geo = new THREE.SphereGeometry(
        Math.random() * 0.35 + 0.08,
        24, 24
      );
      const color = orbColors[Math.floor(Math.random() * orbColors.length)];
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: Math.random() * 0.25 + 0.05,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 4
      );
      // Store random velocities
      (mesh as unknown as OrbMesh).vel = new THREE.Vector3(
        (Math.random() - 0.5) * 0.002,
        (Math.random() - 0.5) * 0.002,
        (Math.random() - 0.5) * 0.001
      );
      scene.add(mesh);
      orbs.push(mesh);
    }

    // Mouse tracking
    const mouse = { x: 0, y: 0 };
    const onMouseMove = (e: MouseEvent) => {
      mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.y = -(e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', onMouseMove);

    // Resize
    const onResize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(canvas);

    // Animation loop
    let animId: number;
    const clock = new THREE.Clock();
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      orbs.forEach((orb, i) => {
        const v = (orb as unknown as OrbMesh).vel;
        orb.position.x += v.x + Math.sin(t * 0.3 + i) * 0.001;
        orb.position.y += v.y + Math.cos(t * 0.25 + i) * 0.001;
        orb.position.z += v.z;

        // Wrap around
        if (orb.position.x > 6)  orb.position.x = -6;
        if (orb.position.x < -6) orb.position.x = 6;
        if (orb.position.y > 4)  orb.position.y = -4;
        if (orb.position.y < -4) orb.position.y = 4;
      });

      // Mouse parallax
      camera.position.x += (mouse.x * 0.3 - camera.position.x) * 0.04;
      camera.position.y += (mouse.y * 0.2 - camera.position.y) * 0.04;

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', onMouseMove);
      ro.disconnect();
      renderer.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="hero__canvas"
      style={{ width: '100%', height: '100%' }}
    />
  );
}
