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
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    completedRef.current = false;
    setRemaining(seconds);
    if (!running) return;

    const duration = Math.max(0, seconds) * 1000;
    const deadline = Date.now() + duration;
    let previousRemaining = Math.ceil(duration / 1000);

    const tick = () => {
      const nextRemaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(nextRemaining);

      if (playTick && nextRemaining < previousRemaining && nextRemaining <= 4 && nextRemaining > 0) {
        playTimerTick();
      }
      previousRemaining = nextRemaining;

      if (nextRemaining === 0 && !completedRef.current) {
        completedRef.current = true;
        onCompleteRef.current?.();
      }
    };

    tick();
    const interval = window.setInterval(tick, 200);
    return () => window.clearInterval(interval);
  }, [running, seconds, playTick]);

  const pct = seconds > 0 ? Math.min(100, Math.max(0, (remaining / seconds) * 100)) : 0;
  const danger = remaining <= 3 && running && remaining > 0;

  return (
    <div className="flex flex-col items-center gap-1">
      <motion.div
        role="timer"
        aria-label={`${remaining} detik tersisa`}
        aria-live={danger ? "assertive" : "off"}
        key={remaining}
        initial={{ scale: 1.3 }}
        animate={{ scale: 1 }}
        className={`text-7xl font-black tabular-nums ${danger ? "text-red-500" : "text-green-400"}`}
      >
        {remaining}
      </motion.div>
      <div
        role="progressbar"
        aria-label="Waktu tersisa"
        aria-valuemin={0}
        aria-valuemax={Math.max(0, seconds)}
        aria-valuenow={Math.min(Math.max(0, remaining), Math.max(0, seconds))}
        aria-valuetext={`${remaining} detik tersisa`}
        className="w-full h-2 bg-slate-700 rounded-full overflow-hidden"
      >
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
