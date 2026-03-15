import { useEffect, useRef } from "react";

export function CursorTrail() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    let mouseX = -100;
    let mouseY = -100;
    let ringX = -100;
    let ringY = -100;
    let rafId: number;
    let isHovering = false;

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.opacity = "1";
      ring.style.opacity = "1";
    };

    const onMouseLeave = () => {
      dot.style.opacity = "0";
      ring.style.opacity = "0";
    };

    const onMouseEnterInteractive = () => {
      isHovering = true;
      ring.style.transform = `translate(-50%, -50%) scale(1.8)`;
      ring.style.borderColor = "rgba(6,182,212,0.6)";
      ring.style.backgroundColor = "rgba(6,182,212,0.06)";
    };

    const onMouseLeaveInteractive = () => {
      isHovering = false;
      ring.style.transform = `translate(-50%, -50%) scale(1)`;
      ring.style.borderColor = "rgba(6,182,212,0.35)";
      ring.style.backgroundColor = "transparent";
    };

    const tick = () => {
      // Dot snaps instantly
      dot.style.left = `${mouseX}px`;
      dot.style.top = `${mouseY}px`;

      // Ring lerps with lag
      ringX += (mouseX - ringX) * 0.12;
      ringY += (mouseY - ringY) * 0.12;
      ring.style.left = `${ringX}px`;
      ring.style.top = `${ringY}px`;

      // Dynamic ring scale when not in hover state
      if (!isHovering) {
        const dist = Math.hypot(mouseX - ringX, mouseY - ringY);
        const stretch = 1 + dist * 0.004;
        ring.style.transform = `translate(-50%, -50%) scale(${Math.min(stretch, 1.3)})`;
      }

      rafId = requestAnimationFrame(tick);
    };

    tick();
    window.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseleave", onMouseLeave);

    const interactiveEls = () =>
      document.querySelectorAll("a, button, [role='button'], input, label, select, textarea, [data-cursor-hover]");

    const attachHoverListeners = () => {
      interactiveEls().forEach((el) => {
        el.addEventListener("mouseenter", onMouseEnterInteractive);
        el.addEventListener("mouseleave", onMouseLeaveInteractive);
      });
    };

    attachHoverListeners();

    // Re-attach on DOM changes (for dynamic content)
    const observer = new MutationObserver(attachHoverListeners);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseleave", onMouseLeave);
      observer.disconnect();
    };
  }, []);

  return (
    <>
      {/* Inner dot — snaps to cursor */}
      <div
        ref={dotRef}
        className="pointer-events-none fixed z-[9999]"
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          backgroundColor: "rgb(6,182,212)",
          boxShadow: "0 0 8px 2px rgba(6,182,212,0.7)",
          top: 0,
          left: 0,
          transform: "translate(-50%, -50%)",
          opacity: 0,
          transition: "opacity 0.3s ease",
          willChange: "left, top",
        }}
      />

      {/* Outer ring — lags behind with lerp */}
      <div
        ref={ringRef}
        className="pointer-events-none fixed z-[9998]"
        style={{
          width: "36px",
          height: "36px",
          borderRadius: "50%",
          border: "1.5px solid rgba(6,182,212,0.35)",
          backgroundColor: "transparent",
          top: 0,
          left: 0,
          transform: "translate(-50%, -50%) scale(1)",
          opacity: 0,
          transition: "opacity 0.3s ease, border-color 0.3s ease, background-color 0.3s ease, transform 0.25s ease",
          willChange: "left, top, transform",
        }}
      />
    </>
  );
}
