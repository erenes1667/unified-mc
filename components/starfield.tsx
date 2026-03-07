'use client';

import { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  z: number;
  px: number;
  py: number;
  colorType: 'cyan' | 'gold' | 'white'; // pre-computed, no Math.random() per frame
}

export default function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const stars: Star[] = [];
    const NUM_STARS = 120; // reduced from 200 — imperceptible visually, big perf gain
    const SPEED = 0.3;

    function pickColor(): Star['colorType'] {
      const r = Math.random();
      if (r > 0.95) return 'cyan';
      if (r > 0.9) return 'gold';
      return 'white';
    }

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function initStars() {
      stars.length = 0;
      const w = canvas?.width ?? window.innerWidth;
      const h = canvas?.height ?? window.innerHeight;
      for (let i = 0; i < NUM_STARS; i++) {
        stars.push({
          x: Math.random() * w - w / 2,
          y: Math.random() * h - h / 2,
          z: Math.random() * w,
          px: 0,
          py: 0,
          colorType: pickColor(),
        });
      }
    }

    function draw() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      for (const star of stars) {
        star.z -= SPEED;
        if (star.z <= 0) {
          star.x = Math.random() * canvas.width - cx;
          star.y = Math.random() * canvas.height - cy;
          star.z = canvas.width;
          star.px = 0;
          star.py = 0;
          star.colorType = pickColor(); // only on reset, not every frame
        }

        const sx = (star.x / star.z) * canvas.width + cx;
        const sy = (star.y / star.z) * canvas.height + cy;
        const size = Math.max(0.5, (1 - star.z / canvas.width) * 2.5);
        const opacity = (1 - star.z / canvas.width) * 0.8;

        if (star.px !== 0) {
          ctx.beginPath();
          ctx.moveTo(star.px, star.py);
          ctx.lineTo(sx, sy);
          // Use pre-computed color — no Math.random() in hot path
          const strokeColor =
            star.colorType === 'cyan'
              ? `rgba(0,255,209,${opacity})`
              : star.colorType === 'gold'
              ? `rgba(201,168,76,${opacity})`
              : `rgba(200,210,255,${opacity})`;
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = size;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(sx, sy, size / 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220, 225, 255, ${opacity})`;
        ctx.fill();

        star.px = sx;
        star.py = sy;
      }

      animId = requestAnimationFrame(draw);
    }

    resize();
    initStars();
    draw();

    const handleResize = () => { resize(); initStars(); };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      id="starfield"
      style={{ willChange: 'transform', transform: 'translateZ(0)' }}
    />
  );
}
