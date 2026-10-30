"use client";

import { motion } from "framer-motion";
import {
  HelpCircle,
  Shirt,
  GitBranch,
  Dices,
  Trophy,
  Calendar,
  Users,
  Speaker,
} from "lucide-react";
import type { GameMode } from "@/lib/types";

interface HomeLandingProps {
  onSelect: (mode: GameMode) => void;
}

const GAMES: { id: GameMode; num: string; label: string; desc: string; icon: React.ReactNode }[] = [
  { id: "trivia", num: "01", label: "Trivia", desc: "Adu pengetahuan sepak bola", icon: <HelpCircle /> },
  { id: "starting11", num: "02", label: "Starting 11", desc: "Gacha formasi tim impian", icon: <Shirt /> },
  { id: "transfer", num: "03", label: "Transfer Quiz", desc: "Tebak pemain dari riwayat pindah", icon: <GitBranch /> },
  { id: "guess", num: "04", label: "Guess Player", desc: "Tebak nama dari dua huruf", icon: <Dices /> },
];

export default function HomeLanding({ onSelect }: HomeLandingProps) {
  return (
    <div className="relative min-h-[calc(100svh-100px)] bg-[#242424] text-white overflow-hidden">
      {/* CSS backdrop keeps the dashboard usable without an external image request. */}
      <div
        className="absolute inset-0"
        style={{ backgroundImage: "radial-gradient(ellipse at 50% 100%, rgba(34,197,94,.14), transparent 55%), linear-gradient(160deg, #303030, #242424 65%)" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#242424]/70 via-[#242424]/85 to-[#242424]" />

      <div className="relative z-10 flex flex-col min-h-[calc(100svh-100px)] max-w-[1400px] mx-auto px-6 md:px-16 py-6 md:py-0">
        {/* Split hero */}
        <div className="flex flex-col lg:flex-row flex-1 gap-10 lg:gap-0 items-center lg:items-stretch">
          {/* Left: visual + intro */}
          <div className="lg:w-3/5 flex flex-col justify-center">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="font-sans text-xs md:text-sm uppercase tracking-[0.5em] text-green-400 mb-6"
            >
              Urban Football Game Show
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="font-serif font-bold leading-[0.95] text-[clamp(2.8rem,8vw,7rem)] text-white"
            >
              Exceptional
              <br />
              Game <span className="italic text-green-400">Night</span>
              <br />
              Experiences.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.25 }}
              className="font-sans text-slate-300 text-base md:text-lg max-w-md mt-8 leading-relaxed"
            >
              Football Party Host adalah pusat kendali 4 game show sepak bola untuk TV,
              proyektor, dan pesta — dirancang untuk host membacakan soal lewat layar besar.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.35 }}
              className="mt-10 flex flex-wrap gap-6"
            >
              <Stat icon={<Calendar size={16} />} value="4" label="Game Modes" />
              <Stat icon={<Users size={16} />} value="2–∞" label="Pemain / Tim" />
              <Stat icon={<Speaker size={16} />} value="Live" label="Efek Suara" />
            </motion.div>
          </div>

          {/* Right: game cards vertical list (martinbuilding menu vibe) */}
          <div className="lg:w-2/5 flex flex-col justify-center gap-1">
            {GAMES.map((g, i) => (
              <motion.button
                key={g.id}
                onClick={() => onSelect(g.id)}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
                className="group text-left border-b border-[#3a3a3a] py-5 cursor-pointer hover:border-green-400 transition-colors"
              >
                <div className="flex items-center gap-5">
                  <span className="hidden sm:flex items-center justify-center w-12 h-12 rounded-full border border-[#3a3a3a] text-green-400 group-hover:border-green-400 group-hover:bg-green-400 group-hover:text-[#242424] transition-all">
                    {g.icon}
                  </span>
                  <div>
                    <div className="flex items-baseline gap-3">
                      <span className="font-sans text-xs tracking-widest text-slate-400">
                        {g.num}
                      </span>
                      <span className="font-serif font-bold text-2xl md:text-4xl text-white group-hover:text-green-400 transition-colors">
                        {g.label}
                      </span>
                    </div>
                    <p className="font-sans text-xs md:text-sm text-slate-400 mt-1 tracking-wide uppercase">
                      {g.desc}
                    </p>
                  </div>
                  <span className="ml-auto text-green-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    →
                  </span>
                </div>
              </motion.button>
            ))}

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="hidden md:block text-right font-sans text-xs uppercase tracking-[0.4em] text-slate-400 mt-8"
            >
              — Press a mode to start the show
            </motion.p>
          </div>
        </div>

        {/* Footnote */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="py-8 border-t border-[#3a3a3a] mt-auto flex flex-wrap justify-between items-center gap-4 text-xs uppercase tracking-[0.3em] text-slate-400 font-sans"
        >
          <span className="flex items-center gap-2">
            <Trophy size={14} className="text-green-400" /> Football Party Host
          </span>
          <span className="hidden md:inline">Host Panel • Scoreboard • Terintegrasi</span>
          <span className="text-slate-400">© 2026</span>
        </motion.div>
      </div>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-9 h-9 rounded-lg bg-[#2e2e2e] flex items-center justify-center text-green-400">
        {icon}
      </span>
      <div>
        <div className="font-serif font-bold text-2xl leading-none text-white">{value}</div>
        <div className="font-sans text-[10px] uppercase tracking-widest text-slate-400 mt-1">
          {label}
        </div>
      </div>
    </div>
  );
}
