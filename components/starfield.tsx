'use client';

import { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  z: number;
  px: number;
  py: number;
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
    const NUM_STARS = 200;
    const SPEED = 0.3;

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function initStars() {
      stars.length = 0;
      for (let i = 0; i < NUM_STARS; i++) {
        stars.push({
          x: Math.random() * (canvas?.width ?? window.innerWidth) - (canvas?.width ?? window.innerWidth) / 2,
          y: Math.random() * (canvas?.height ?? window.innerHeight) - (canvas?.height ?? window.innerHeight) / 2,
          z: Math.random() * (canvas?.width ?? window.innerWidth),
          px: 0,
          py: 0,
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
        }

        const sx = (star.x / star.z) * canvas.width + cx;
        const sy = (star.y / star.z) * canvas.height + cy;
        const size = Math.max(0.5, (1 - star.z / canvas.width) * 2.5);
        const opacity = (1 - star.z / canvas.width) * 0.8;

        if (star.px !== 0) {
          ctx.beginPath();
          ctx.moveTo(star.px, star.py);
          ctx.lineTo(sx, sy);
          // Gold tint on some stars, cyan on others
          const hue = Math.random() > 0.95 ? 'rgba(0,255,209,' : Math.random() > 0.9 ? 'rgba(201,168,76,' : 'rgba(200,210,255,';
          ctx.strokeStyle = `${hue}${opacity})`;
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

    window.addEventListener('resize', () => { resize(); initStars(); });

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', () => { resize(); initStars(); });
    };
  }, []);

  return <canvas ref={canvasRef} id="starfield" />;
}
