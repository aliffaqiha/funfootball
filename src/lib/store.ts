import { useSyncExternalStore } from "react";

export interface PlayerEntry {
  id: string;
  name: string;
  score: number;
}

export interface ScoreState {
  entries: PlayerEntry[];
  activeEntryId: string | null;
}

const STORAGE_KEY = "fph-scoreboard";
const EMPTY: ScoreState = { entries: [], activeEntryId: null };

function normalizeState(value: unknown): ScoreState {
  if (!value || typeof value !== "object") return EMPTY;
  const entries = (value as { entries?: unknown }).entries;
  if (!Array.isArray(entries)) return EMPTY;

  const validEntries = entries.filter(
    (entry): entry is PlayerEntry =>
      !!entry &&
      typeof entry === "object" &&
      typeof entry.id === "string" &&
      typeof entry.name === "string" &&
      typeof entry.score === "number" &&
      Number.isFinite(entry.score)
  );
  const requestedActiveId = (value as { activeEntryId?: unknown }).activeEntryId;
  const activeEntryId =
    typeof requestedActiveId === "string" && validEntries.some((entry) => entry.id === requestedActiveId)
      ? requestedActiveId
      : validEntries[0]?.id ?? null;

  return { entries: validEntries, activeEntryId };
}

function loadScoreState(): ScoreState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeState(JSON.parse(raw)) : EMPTY;
  } catch {
    return EMPTY;
  }
}

let current: ScoreState = loadScoreState();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function persist(next: ScoreState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Keep the in-memory scoreboard usable when browser storage is unavailable.
  }
}

function commit(next: ScoreState) {
  current = next;
  if (typeof window !== "undefined") persist(next);
  emit();
}

function onStorage(event: StorageEvent) {
  if (event.key !== STORAGE_KEY && event.key !== null) return;
  try {
    current = event.newValue ? normalizeState(JSON.parse(event.newValue)) : EMPTY;
  } catch {
    current = EMPTY;
  }
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1 && typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

function getSnapshot() {
  return current;
}

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function addPlayer(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;
  const id = createId();
  commit({
    entries: [...current.entries, { id, name: trimmed, score: 0 }],
    activeEntryId: current.activeEntryId ?? id,
  });
}

export function removePlayer(id: string) {
  const entries = current.entries.filter((entry) => entry.id !== id);
  commit({
    entries,
    activeEntryId: current.activeEntryId === id ? entries[0]?.id ?? null : current.activeEntryId,
  });
}

export function setActivePlayer(id: string) {
  if (!current.entries.some((entry) => entry.id === id)) return;
  commit({ ...current, activeEntryId: id });
}

export function updateScore(id: string, delta: number) {
  commit({
    ...current,
    entries: current.entries.map((entry) =>
      entry.id === id ? { ...entry, score: Math.max(0, entry.score + delta) } : entry
    ),
  });
}

export function resetScoreboard() {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Reset the in-memory state even when storage is unavailable.
    }
  }
  commit(EMPTY);
}

export function useScoreboard() {
  const state = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
  return { state, addPlayer, removePlayer, setActivePlayer, updateScore, reset: resetScoreboard };
}
