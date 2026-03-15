import { useEffect, useRef } from "react";
import { useMousePosition } from "@/hooks/use-mouse-position";

export function MouseSpotlight() {
  const { x, y } = useMousePosition();
  const spotlightRef = useRef<HTMLDivElement>(null);
  
  // Current position for lerping
  const currentPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    let animationFrameId: number;
    
    const render = () => {
      // Lerp towards target position
      currentPos.current.x += (x - currentPos.current.x) * 0.15;
      currentPos.current.y += (y - currentPos.current.y) * 0.15;
      
      if (spotlightRef.current) {
        spotlightRef.current.style.transform = `translate(${currentPos.current.x}px, ${currentPos.current.y}px) translate(-50%, -50%)`;
      }
      
      animationFrameId = requestAnimationFrame(render);
    };
    
    render();
    
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [x, y]);

  return (
    <div
      ref={spotlightRef}
      className="pointer-events-none fixed left-0 top-0 z-0 h-[600px] w-[600px] rounded-full"
      style={{
        background: "radial-gradient(circle, rgba(6, 182, 212, 0.08) 0%, transparent 60%)",
        transform: "translate(-50%, -50%)",
        willChange: "transform",
      }}
    />
  );
}
