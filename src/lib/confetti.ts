"use client";

import { playSoundCue, type SoundCue } from "@/lib/sound";

type ConfettiOptions = {
  particleCount?: number;
  durationMs?: number;
  soundCue?: SoundCue | false;
};

export function fireConfetti({
  particleCount = 100,
  durationMs = 3000,
  soundCue = "complete",
}: ConfettiOptions = {}) {
  if (typeof window === "undefined") return;

  if (soundCue) {
    void playSoundCue(soundCue);
  }

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  const canvas = document.createElement("canvas");
  canvas.style.position = "fixed";
  canvas.style.top = "0";
  canvas.style.left = "0";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "9999";
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  const handleResize = () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  };
  window.addEventListener("resize", handleResize);

  const colors = ["#147d64", "#0f5f4f", "#d35f4c", "#b7791f", "#5b5fc7", "#22c55e", "#3b82f6", "#eab308"];
  const particles: Array<{
    x: number;
    y: number;
    size: number;
    color: string;
    speedX: number;
    speedY: number;
    rotation: number;
    rotationSpeed: number;
  }> = [];

  // Create particles
  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * -100 - 20,
      size: Math.random() * 8 + 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      speedX: Math.random() * 4 - 2,
      speedY: Math.random() * 5 + 4,
      rotation: Math.random() * 360,
      rotationSpeed: Math.random() * 6 - 3,
    });
  }

  const startTime = Date.now();

  function animate() {
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);

    let active = false;
    for (const p of particles) {
      p.y += p.speedY;
      p.x += p.speedX;
      p.rotation += p.rotationSpeed;

      if (p.y < height) {
        active = true;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }
    }

    // Run for the configured short completion window.
    if (active && Date.now() - startTime < durationMs) {
      requestAnimationFrame(animate);
    } else {
      window.removeEventListener("resize", handleResize);
      canvas.remove();
    }
  }

  animate();
}
