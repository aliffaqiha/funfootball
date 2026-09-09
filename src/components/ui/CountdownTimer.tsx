"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { playTimerTick } from "@/lib/sound";

interface CountdownTimerProps {
  seconds: number;
  running: boolean;
  onComplete?: () => void;
  playTick?: boolean;
}

export default function CountdownTimer({
  seconds,
  running,
  onComplete,
  playTick = true,
}: CountdownTimerProps) {
  const [remaining, setRemaining] = useState(seconds);
  const completedRef = useRef(false);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!completedRef.current) {
            completedRef.current = true;
            onComplete?.();
          }
          return 0;
        }
        if (playTick && prev <= 4) {
          playTimerTick();
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [running, onComplete, playTick]);

  const pct = (remaining / seconds) * 100;
  const danger = remaining <= 3 && running && remaining > 0;

  return (
    <div className="flex flex-col items-center gap-1">
      <motion.div
        key={remaining}
        initial={{ scale: 1.3 }}
        animate={{ scale: 1 }}
        className={`text-7xl font-black tabular-nums ${danger ? "text-red-500" : "text-green-400"}`}
      >
        {remaining}
      </motion.div>
      <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${danger ? "bg-red-500" : "bg-green-400"}`}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: "linear" }}
        />
      </div>
    </div>
  );
}