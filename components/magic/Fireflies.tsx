"use client";

import { useEffect, useRef } from "react";
import { useDaypart } from "@/components/atlas/DaypartProvider";

const EASTER_EGGS = process.env.NEXT_PUBLIC_EASTER_EGGS === "true";

export function Fireflies() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { daypart } = useDaypart();

  useEffect(() => {
    if (!EASTER_EGGS || (daypart !== "evening" && daypart !== "late")) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = 120;
    };
    resize();
    window.addEventListener("resize", resize);

    const flies = Array.from({ length: 12 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.2,
      phase: Math.random() * Math.PI * 2,
    }));

    let frame: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const f of flies) {
        f.x += f.vx;
        f.y += f.vy;
        f.phase += 0.05;
        if (f.x < 0 || f.x > canvas.width) f.vx *= -1;
        if (f.y < 0 || f.y > canvas.height) f.vy *= -1;
        const alpha = 0.3 + Math.sin(f.phase) * 0.3;
        ctx.beginPath();
        ctx.arc(f.x, f.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 232, 163, ${alpha})`;
        ctx.fill();
      }
      frame = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, [daypart]);

  if (!EASTER_EGGS || (daypart !== "evening" && daypart !== "late")) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed bottom-0 left-0 z-40 w-full"
      aria-hidden
    />
  );
}
