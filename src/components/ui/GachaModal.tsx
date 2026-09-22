"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, animate, motion, useMotionValue } from "framer-motion";
import type { GachaPool, PoolClub } from "@/lib/types";

interface GachaModalProps {
  open: boolean;
  phase: "spin" | "done";
  result: PoolClub | null;
  title?: string;
  pool: GachaPool;
}

const ROW = 84;

function Reel({
  texts,
  phase,
  winnerIndex,
  winnerText,
  winnerColor,
  shouldSpin = true,
  dimmed = false,
  settleDuration = 1.5,
}: {
  texts: string[];
  phase: "spin" | "done";
  winnerIndex: number | null;
  winnerText?: string;
  winnerColor?: string;
  shouldSpin?: boolean;
  dimmed?: boolean;
  settleDuration?: number;
}) {
  const y = useMotionValue(0);
  const controls = useRef<ReturnType<typeof animate> | null>(null);
  const N = texts.length;

  useEffect(() => {
    controls.current?.stop();

    if (phase === "spin") {
      if (shouldSpin) {
        y.set(0);
        controls.current = animate(y, -(N * ROW), {
          duration: N / 6,
          ease: "linear",
          repeat: Infinity,
          repeatType: "loop",
        });
      } else {
        y.set(0);
      }
    } else if (winnerIndex != null) {
      const y0 = y.get();
      const want = -(winnerIndex * ROW);
      const gap = Math.min(4, Math.floor(N / 2)) * ROW;
      let y1 = want - gap;

      if (y1 > y0) {
        y1 = want - N * ROW;
      }

      controls.current = animate(y, [y0, y1, want], {
        duration: settleDuration,
        times: [0, 0.4, 1],
        ease: ["linear", "easeOut"],
      });
    }

    return () => controls.current?.stop();
  }, [phase, shouldSpin, winnerIndex, y, N, texts, settleDuration]);

  const isWinner = phase === "done" && winnerText !== undefined;

  return (
    <div
      className="relative overflow-hidden rounded-xl"
      style={{
        height: ROW,
        width: "min(72vw, 340px)",
        maxWidth: "min(72vw, 340px)",
        boxShadow: isWinner ? "0 0 40px rgba(34,197,94,0.18)" : undefined,
      }}
    >
      <motion.div
        className="flex flex-col"
        style={{
          y,
          willChange: "transform",
          opacity: dimmed ? 0.3 : 1,
          transition: "opacity 0.3s ease",
        }}
      >
        {[...texts, ...texts].map((t, i) => (
          <span
            key={i}
            className="text-slate-100 font-black text-2xl sm:text-4xl whitespace-nowrap block"
            style={{
              height: ROW,
              lineHeight: `${ROW}px`,
              color: isWinner && t === winnerText ? winnerColor : undefined,
            }}
          >
            {t}
          </span>
        ))}
      </motion.div>

      {/* soft top/bottom fade mask */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to bottom, rgba(5,5,5,0.95), transparent 28%, transparent 72%, rgba(5,5,5,0.95))",
        }}
      />
    </div>
  );
}

export default function GachaModal({ open, phase, result, title, pool }: GachaModalProps) {
  const countryByCode = useMemo(
    () => Object.fromEntries(pool.countries.map((c) => [c.code, c.name])),
    [pool.countries]
  );
  const countryNames = useMemo(() => pool.countries.map((c) => c.name), [pool.countries]);
  const clubNames = useMemo(() => pool.clubs.map((c) => c.name), [pool.clubs]);

  const country = result ? (countryByCode[result.country] ?? result.name) : null;
  const countryIndex = country ? countryNames.indexOf(country) : null;
  const clubIndex = result ? clubNames.indexOf(result.name) : null;

  // Sequential reveal: country stops first, then the club reel enters with its own gacha animation.
  const [clubStage, setClubStage] = useState<"wait" | "spin" | "settle">("wait");

  useEffect(() => {
    if (!open || phase === "spin") {
      const t = setTimeout(() => setClubStage("wait"), 0);
      return () => clearTimeout(t);
    }
    const t1 = setTimeout(() => setClubStage("spin"), 1500);
    const t2 = setTimeout(() => setClubStage("settle"), 2600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [open, phase]);

  const clubPhase: "spin" | "done" = clubStage === "settle" ? "done" : "spin";
  const clubWinning =
    clubStage === "settle" && result ? clubIndex : null;

  const showResult = phase === "done" && clubStage === "settle";

  const modal = (
    <motion.div
      key="gacha-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-xl"
    >
      <div className="h-full w-full flex flex-col">
        <div className="pt-6 pb-2 px-6 flex items-center justify-between">
          <span className="text-white/35 text-xs font-bold uppercase tracking-[0.2em]">
            {title || ""}
          </span>
          {showResult ? (
            <span className="text-green-400 text-xs font-black uppercase tracking-[0.4em]">
              Result
            </span>
          ) : (
            <motion.span
              className="text-green-400/80 text-xs font-black uppercase tracking-[0.4em]"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.1, repeat: Infinity }}
            >
              Drawing...
            </motion.span>
          )}
        </div>

        {/* two reels side by side — same place in every phase */}
        <div className="flex-1 flex items-center justify-center px-6 sm:px-24 min-h-0">
          <div className="flex items-center gap-8 sm:gap-20 min-w-0">
            {/* NEGARA */}
            <div className="flex flex-col items-center min-w-0">
              <span className="text-[11px] sm:text-sm uppercase tracking-[0.6em] text-white/30 font-black">
                Negara
              </span>
              <div className="mt-6 sm:mt-8 w-full flex justify-center min-w-0">
                <Reel
                  texts={countryNames}
                  phase={phase}
                  winnerIndex={phase === "done" ? countryIndex : null}
                  winnerText={country ?? undefined}
                  winnerColor={phase === "done" ? "#4ade80" : undefined}
                />
              </div>
            </div>

            {/* thin subtle separator */}
            <div className="w-px self-stretch min-h-[110px] bg-white/15" />

            {/* KLUB */}
            <div className="flex flex-col items-center min-w-0">
              <span className="text-[11px] sm:text-sm uppercase tracking-[0.6em] text-white/30 font-black">
                Klub
              </span>
              <div className="mt-6 sm:mt-8 w-full flex justify-center min-w-0">
                <Reel
                  texts={clubNames}
                  phase={clubPhase}
                  shouldSpin={clubStage === "spin"}
                  dimmed={clubStage === "wait"}
                  winnerIndex={clubWinning}
                  winnerText={result?.name}
                  winnerColor={result?.color}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>{open && modal}</AnimatePresence>,
    document.body
  );
}