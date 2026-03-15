import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  size: number;
  opacity: number;
  vx: number;
  vy: number;
  hue: number;
}

export function CursorTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const particles: Particle[] = [];
    let mouseX = -200;
    let mouseY = -200;
    let lastX = -200;
    let lastY = -200;
    let rafId: number;
    let frameCount = 0;

    const onResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    const spawnParticle = (x: number, y: number) => {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 0.6;
      particles.push({
        x,
        y,
        size: Math.random() * 5 + 3,
        opacity: 0.85 + Math.random() * 0.15,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.4,
        hue: 185 + Math.random() * 20 - 10, // teal band
      });
      if (particles.length > 80) particles.shift();
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      frameCount++;

      // Spawn particles throttled to every 2 frames and only when mouse moves
      const dx = mouseX - lastX;
      const dy = mouseY - lastY;
      const dist = Math.hypot(dx, dy);

      if (dist > 2 && frameCount % 2 === 0) {
        // Spawn 1-2 particles per tick depending on speed
        const count = dist > 15 ? 2 : 1;
        for (let i = 0; i < count; i++) {
          spawnParticle(mouseX + (Math.random() - 0.5) * 4, mouseY + (Math.random() - 0.5) * 4);
        }
        lastX = mouseX;
        lastY = mouseY;
      }

      // Update and draw
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.opacity -= 0.028;
        p.size *= 0.97;
        p.x += p.vx;
        p.y += p.vy;
        p.vy -= 0.012; // slight upward drift

        if (p.opacity <= 0 || p.size < 0.4) {
          particles.splice(i, 1);
          continue;
        }

        // Outer glow
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2.5);
        grd.addColorStop(0, `hsla(${p.hue}, 90%, 60%, ${p.opacity})`);
        grd.addColorStop(0.4, `hsla(${p.hue}, 90%, 55%, ${p.opacity * 0.4})`);
        grd.addColorStop(1, `hsla(${p.hue}, 90%, 50%, 0)`);

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();

        // Bright core dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 95%, 80%, ${p.opacity})`;
        ctx.fill();
      }

      rafId = requestAnimationFrame(draw);
    };

    draw();
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-50"
      style={{ mixBlendMode: "screen" }}
    />
  );
}
