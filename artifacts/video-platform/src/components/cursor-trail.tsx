import { useEffect, useState } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  createdAt: number;
}

export function CursorTrail() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    let particleId = 0;
    
    const handleMouseMove = (e: MouseEvent) => {
      const newParticle = {
        id: particleId++,
        x: e.clientX,
        y: e.clientY,
        createdAt: Date.now(),
      };
      
      setParticles((prev) => {
        const newParticles = [...prev, newParticle];
        // Keep only the last 12 particles
        if (newParticles.length > 12) {
          return newParticles.slice(newParticles.length - 12);
        }
        return newParticles;
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  useEffect(() => {
    // Cleanup old particles periodically
    const interval = setInterval(() => {
      const now = Date.now();
      setParticles((prev) => prev.filter((p) => now - p.createdAt < 600));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute animate-cursor-trail rounded-full bg-primary"
          style={{
            left: particle.x,
            top: particle.y,
            width: "6px",
            height: "6px",
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}
    </div>
  );
}
