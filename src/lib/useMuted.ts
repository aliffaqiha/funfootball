import { useEffect, useSyncExternalStore } from "react";
import { initSound, isMuted, subscribeMuted } from "@/lib/sound";

export function useMuted(): boolean {
  useEffect(() => {
    initSound();
  }, []);

  return useSyncExternalStore(subscribeMuted, isMuted, () => false);
}