import { useEffect } from "react";

export type KeyHandler = (event: KeyboardEvent) => void;

export function useKeyboardShortcuts(handlers: Record<string, KeyHandler>) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const handler = handlers[e.key];
      if (handler) {
        handler(e);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handlers]);
}
