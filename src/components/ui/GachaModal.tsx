"use client";

import { AnimatePresence, motion } from "framer-motion";
import clubs from "@/data/clubs-nations.json";

interface Club {
  id: string;
  name: string;
  flag: string;
  color: string;
}

interface GachaModalProps {
  open: boolean;
  phase: "spin" | "done";
  result: Club | null;
  title?: string;
}

const FLAG_COUNTRY: Record<string, string> = {
  "🏴󠁧󠁢󠁥󠁮󠁧󠁿": "England",
  "🇪🇸": "Spain",
  "🇩🇪": "Germany",
  "🇮🇹": "Italy",
  "🇫🇷": "France",
  "🇦🇹": "Austria",
  "🇹🇷": "Turkey",
};

function countryOf(flag: string): string {
  return FLAG_COUNTRY[flag] ?? flag;
}

const COUNTRIES: string[] = Array.from(new Set(clubs.map((c) => countryOf(c.flag)))).sort();
const CLUBS: string[] = clubs.map((c) => c.name);

function OneRowReel({ texts }: { texts: string[] }) {
  const ROW = 84;
  const SPEED = 10;
  const duration = (texts.length * ROW) / (SPEED * ROW);

  return (
    <div className="relative overflow-hidden flex items-center justify-center" style={{ height: ROW }}>
      <motion.div
        className="flex flex-col items-center"
        animate={{ y: ["0%", "-50%"] }}
        transition={{ y: { duration, ease: "linear", repeat: Infinity } }}
      >
        {[...texts, ...texts].map((t, i) => (
          <span
            key={i}
            className="text-slate-100 font-black text-3xl sm:text-5xl whitespace-nowrap block"
            style={{ height: ROW, lineHeight: `${ROW}px` }}
          >
            {t}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

export default function GachaModal({ open, phase, result, title }: GachaModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="gacha-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-xl"
        >
          {phase === "spin" ? (
            /* ---------- fullscreen two-column text reels ---------- */
            <div className="h-full w-full flex flex-col">
              <div className="pt-6 pb-2 px-6 flex items-center justify-between">
                <span className="text-white/35 text-xs font-bold uppercase tracking-[0.2em]">
                  {title || ""}
                </span>
                <motion.span
                  className="text-green-400/80 text-xs font-black uppercase tracking-[0.4em]"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.1, repeat: Infinity }}
                >
                  Drawing...
                </motion.span>
              </div>

              {/* two reels side by side, centered, filling the screen */}
              <div className="flex-1 flex items-center justify-center px-10 sm:px-24">
                <div className="flex items-center gap-12 sm:gap-24">
                  {/* NEGARA */}
                  <div className="flex flex-col items-center">
                    <span className="text-[11px] sm:text-sm uppercase tracking-[0.6em] text-white/30 font-black">
                      Negara
                    </span>
                    <div className="mt-6 sm:mt-8">
                      <OneRowReel texts={COUNTRIES} />
                    </div>
                  </div>

                  {/* thin subtle separator */}
                  <div className="w-px h-24 sm:h-32 bg-white/15" />

                  {/* KLUB */}
                  <div className="flex flex-col items-center">
                    <span className="text-[11px] sm:text-sm uppercase tracking-[0.6em] text-white/30 font-black">
                      Klub
                    </span>
                    <div className="mt-6 sm:mt-8">
                      <OneRowReel texts={CLUBS} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ---------- result: only text, centered, no gap ---------- */
            <div className="h-full w-full flex flex-col items-center justify-center gap-3 px-6 text-center">
              {result && (
                <>
                  <span className="text-[10px] sm:text-xs uppercase tracking-[0.6em] text-white/30 font-black">
                    Negara
                  </span>
                  <motion.span
                    initial={{ opacity: 0, y: 24, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="text-4xl sm:text-6xl font-black text-white"
                  >
                    {countryOf(result.flag)}
                  </motion.span>

                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.3, duration: 0.4 }}
                    className="w-2/3 h-px bg-white/15 my-2"
                  />

                  <span className="text-[10px] sm:text-xs uppercase tracking-[0.6em] text-white/30 font-black">
                    Klub
                  </span>
                  <motion.span
                    initial={{ opacity: 0, y: 24, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.45, type: "spring", stiffness: 180, damping: 14 }}
                    className="text-5xl sm:text-7xl font-black leading-tight"
                    style={{ color: result.color }}
                  >
                    {result.name}
                  </motion.span>
                </>
              )}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}