import confetti from "canvas-confetti";

export function fireConfetti() {
  const defaults = {
    spread: 360,
    ticks: 200,
    gravity: 0.6,
    decay: 0.94,
    startVelocity: 35,
    disableForReducedMotion: true,
    colors: ["#22c55e", "#ffffff", "#38bdf8", "#facc15", "#f87171"],
  };
  confetti({ ...defaults, particleCount: 60, scalar: 1.2 });
  confetti({ ...defaults, particleCount: 30, scalar: 2, origin: { x: 0.2, y: 0.4 } });
  confetti({ ...defaults, particleCount: 30, scalar: 2, origin: { x: 0.8, y: 0.4 } });
  setTimeout(() => {
    confetti({ ...defaults, particleCount: 50, startVelocity: 45, spread: 100, origin: { x: 0.5, y: 0.6 } });
    confetti({ ...defaults, particleCount: 50, startVelocity: 45, spread: 100, origin: { x: 0.3, y: 0.6 } });
    confetti({ ...defaults, particleCount: 50, startVelocity: 45, spread: 100, origin: { x: 0.7, y: 0.6 } });
  }, 250);
}
