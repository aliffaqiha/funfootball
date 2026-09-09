import { useSyncExternalStore } from "react";

export interface PlayerEntry {
  id: string;
  name: string;
  score: number;
}

export interface ScoreState {
  entries: PlayerEntry[];
}

const STORAGE_KEY = "fph-scoreboard";
const EMPTY: ScoreState = { entries: [] };

function loadScoreState(): ScoreState {
  if (typeof window === "undefined") {
    return EMPTY;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as ScoreState;
    }
  } catch {
    // ignore corrupted storage
  }
  return EMPTY;
}

let current: ScoreState = loadScoreState();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function commit(next: ScoreState) {
  current = next;
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return current;
}

export function addPlayer(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;
  commit({
    entries: [...current.entries, { id: crypto.randomUUID(), name: trimmed, score: 0 }],
  });
}

export function removePlayer(id: string) {
  commit({ entries: current.entries.filter((e) => e.id !== id) });
}

export function updateScore(id: string, delta: number) {
  commit({
    entries: current.entries.map((e) =>
      e.id === id ? { ...e, score: Math.max(0, e.score + delta) } : e
    ),
  });
}

export function resetScoreboard() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
  commit(EMPTY);
}

export function useScoreboard() {
  const state = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
  return { state, addPlayer, removePlayer, updateScore, reset: resetScoreboard };
}