import { Howl } from "howler";

let muted = false;

const cache: Record<string, Howl | null> = {
  spin: null,
  correct: null,
  wrong: null,
  tick: null,
  celebrate: null,
};

function create(id: string, src: string, volume: number): Howl {
  return new Howl({
    src: [src],
    volume,
    pool: 4,
    html5: false,
  });
}

function getSound(id: keyof typeof cache, src: string, volume: number): Howl | null {
  let el = cache[id];
  if (el) {
    el.volume(volume);
    return el;
  }
  try {
    el = create(id, src, volume);
    cache[id] = el;
  } catch {
    el = null;
  }
  return el;
}

export function setMuted(value: boolean) {
  muted = value;
  Object.values(cache).forEach((s) => s && s.mute(muted));
  if (typeof window !== "undefined") {
    localStorage.setItem("fph-muted", value ? "1" : "0");
  }
}

export function isMuted(): boolean {
  return muted;
}

export function initSound() {
  if (typeof window !== "undefined") {
    muted = localStorage.getItem("fph-muted") === "1";
  }
  return muted;
}

export function playSpin() {
  if (muted) return;
  getSound("spin", "https://assets.mixkit.co/active_storage/sfx/2013/2013.wav", 0.6)?.play();
}

export function playCorrect() {
  if (muted) return;
  getSound("correct", "https://assets.mixkit.co/active_storage/sfx/2091/2091.wav", 0.7)?.play();
}

export function playWrong() {
  if (muted) return;
  getSound("wrong", "https://assets.mixkit.co/active_storage/sfx/1804/1804.wav", 0.7)?.play();
}

export function playTimerTick() {
  if (muted) return;
  getSound("tick", "https://assets.mixkit.co/active_storage/sfx/2229/2229.wav", 0.5)?.play();
}

export function playCelebration() {
  if (muted) return;
  getSound("celebrate", "https://assets.mixkit.co/active_storage/sfx/2019/2019.wav", 0.8)?.play();
}

export function stopAll() {
  Object.values(cache).forEach((s) => s && s.stop());
}
