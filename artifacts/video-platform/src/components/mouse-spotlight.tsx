import { useEffect, useRef } from "react";

export function MouseSpotlight() {
  const ref = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const curr = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onMove = (e: MouseEvent) => {
      pos.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("mousemove", onMove);

    let rafId: number;
    const tick = () => {
      curr.current.x += (pos.current.x - curr.current.x) * 0.06;
      curr.current.y += (pos.current.y - curr.current.y) * 0.06;
      el.style.left = `${curr.current.x}px`;
      el.style.top = `${curr.current.y}px`;
      rafId = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      ref={ref}
      className="pointer-events-none fixed z-0"
      style={{
        width: "700px",
        height: "700px",
        borderRadius: "50%",
        top: 0,
        left: 0,
        transform: "translate(-50%, -50%)",
        background:
          "radial-gradient(circle, rgba(6,182,212,0.055) 0%, rgba(6,182,212,0.02) 35%, transparent 70%)",
        willChange: "left, top",
      }}
    />
  );
}
