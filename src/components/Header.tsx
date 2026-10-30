"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Volume2,
  VolumeX,
  RotateCcw,
  Maximize,
  Eye,
  EyeOff,
  HelpCircle,
  GitBranch,
  Dices,
  Shirt,
  Gamepad2,
  X,
} from "lucide-react";
import { useKeyboardShortcuts } from "@/lib/useKeyboard";
import { setMuted } from "@/lib/sound";
import { useMuted } from "@/lib/useMuted";
import type { GameMode, GameModeOrHome } from "@/lib/types";

interface HeaderProps {
  mode: GameModeOrHome;
  onChangeMode: (mode: GameModeOrHome) => void;
  hostView: boolean;
  onToggleHostView: () => void;
  gameKey: number;
  onResetGame: () => void;
}

const NAV: { id: GameMode; num: string; label: string; icon: React.ReactNode }[] = [
  { id: "trivia", num: "01", label: "Trivia", icon: <HelpCircle /> },
  { id: "starting11", num: "02", label: "Starting 11", icon: <Shirt /> },
  { id: "transfer", num: "03", label: "Transfer Quiz", icon: <GitBranch /> },
  { id: "guess", num: "04", label: "Guess Player", icon: <Dices /> },
];

export default function Header({
  mode,
  onChangeMode,
  hostView,
  onToggleHostView,
  gameKey,
  onResetGame,
}: HeaderProps) {
  const muted = useMuted();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const line1 = useRef<HTMLSpanElement>(null);
  const line2 = useRef<HTMLSpanElement>(null);

  const toggleMute = () => {
    setMuted(!muted);
  };

  useEffect(() => {
    const syncFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", syncFullscreen);
    syncFullscreen();
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen?.();
      } else {
        await document.exitFullscreen?.();
      }
    } catch {
      // Fullscreen can be denied by the browser or host environment.
    }
  };

  useKeyboardShortcuts({
    m: () => toggleMute(),
    f: () => toggleFullscreen(),
    Escape: () => setMenuOpen(false),
  });

  const pickGame = (id: GameMode) => {
    setMenuOpen(false);
    onChangeMode(id);
  };

  return (
    <>
      {/* Top minimal bar */}
      <header className="flex items-center justify-between px-8 md:px-16 py-6 z-40 relative">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setMenuOpen(false);
              onChangeMode("");
            }}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-12 h-12 rounded-full bg-[#242424] border border-[#2e2e2e] flex items-center justify-center group-hover:border-green-400 transition-colors">
              <Gamepad2 size={22} className="text-slate-100 group-hover:text-green-400 transition-colors" />
            </div>
            <div className="text-left">
              <span className="block font-serif font-bold text-lg md:text-2xl text-slate-100 tracking-tight leading-none">
                Football <span className="text-green-400">Party</span>
              </span>
              <span className="block text-[10px] uppercase tracking-[0.4em] text-slate-400 mt-1">
                Game Show Host
              </span>
            </div>
          </button>
        </div>

        {/* Right side: controls + burger */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-1.5">
            <IconBtn onClick={toggleMute} title="Mute (M)" active={false}>
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </IconBtn>
            <IconBtn onClick={onToggleHostView} title="Host View" active={hostView}>
              {hostView ? <Eye size={18} /> : <EyeOff size={18} />}
            </IconBtn>
            <IconBtn onClick={onResetGame} title="Reset Game" active={false}>
              <RotateCcw size={18} />
            </IconBtn>
            <IconBtn
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit fullscreen (F)" : "Fullscreen (F)"}
              active={isFullscreen}
            >
              <Maximize size={18} />
            </IconBtn>
          </div>
          {!mode && (
            <div className="md:hidden flex items-center gap-1.5">
              <IconBtn onClick={toggleMute} title="Mute (M)" active={muted}>
                {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </IconBtn>
              <IconBtn onClick={toggleFullscreen} title={isFullscreen ? "Exit fullscreen" : "Fullscreen"} active={isFullscreen}>
                <Maximize size={18} />
              </IconBtn>
            </div>
          )}

          {/* Mode selection is already on the dashboard; show the menu in-game only. */}
          {mode && (
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className={`relative w-[52px] h-[52px] bg-green-400 flex items-center justify-center cursor-pointer ${menuOpen ? "active" : ""}`}
              aria-label="Menu"
              aria-expanded={menuOpen}
              aria-controls="game-navigation"
            >
              <span
                ref={line1}
                className={`absolute left-1/2 top-1/2 -translate-x-1/2 w-6 h-[2px] bg-[#242424] transition-all duration-300 ${
                  menuOpen ? "-rotate-45" : "-translate-y-[5px]"
                }`}
              />
              <span
                ref={line2}
                className={`absolute left-1/2 top-1/2 -translate-x-1/2 w-6 h-[2px] bg-[#242424] transition-all duration-300 ${
                  menuOpen ? "rotate-45" : "translate-y-[5px]"
                }`}
              />
            </button>
          )}
        </div>
      </header>

      {/* Fullscreen overlay menu */}
      <AnimatePresence>
        {menuOpen && mode && (
          <motion.div
            id="game-navigation"
            className="fixed inset-0 z-50 flex"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Left visual side */}
            <div className="w-2/5 hidden lg:flex flex-col justify-end bg-[#242424] relative">
              {/* stadium image block */}
              <div
                className="absolute inset-0"
                style={{ backgroundImage: "radial-gradient(ellipse at 50% 100%, rgba(34,197,94,.18), transparent 55%), linear-gradient(160deg, #303030, #242424 65%)" }}
              />
              <div className="absolute inset-0 bg-[#242424]/70" />
              <div className="relative p-16 pb-12">
                <p className="font-sans text-sm uppercase tracking-[0.4em] text-slate-200 mb-2">
                  The Party Show
                </p>
                <p className="font-serif text-3xl text-white leading-tight">
                  Four ways to play. One epic night of football.
                </p>
              </div>
            </div>

            {/* Right menu side */}
            <div
              className="flex-1 bg-[#242424] flex items-center px-8 md:pl-[10%] py-10 overflow-hidden"
              onClick={(e) => {
                if (e.target === e.currentTarget) setMenuOpen(false);
              }}
            >
              <div className="w-full">
                <div className="hidden md:block mb-10 text-[11px] uppercase tracking-[0.5em] text-slate-400">
                  — Choose a Game Mode
                </div>
                <ul className="flex flex-col gap-1">
                  {NAV.map((n) => (
                    <li key={n.id}>
                      <button
                        onClick={() => pickGame(n.id)}
                        className={`group flex items-center gap-6 cursor-pointer transition-colors duration-300 ${
                          mode === n.id ? "text-green-400" : "text-slate-100 hover:text-green-400"
                        }`}
                      >
                        <span className="hidden sm:inline text-sm tracking-widest text-slate-400 w-8 shrink-0 group-hover:text-green-400/60">
                          {n.num}
                        </span>
                        <span className="font-serif font-bold text-[2.6rem] md:text-[4rem] leading-tight">
                          {n.label}
                        </span>
                        <span className="opacity-0 group-hover:opacity-100 text-green-400 transition-opacity">
                          →
                        </span>
                      </button>
                    </li>
                  ))}
                  <li>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onChangeMode("");
                      }}
                      className="group flex items-center gap-6 cursor-pointer text-slate-100 transition-colors duration-300 hover:text-green-400"
                    >
                      <span className="hidden sm:inline text-sm tracking-widest text-slate-400 w-8 shrink-0 group-hover:text-green-400/60">
                        00
                      </span>
                      <span className="font-serif font-bold text-[2.6rem] md:text-[4rem] leading-tight">
                        Home
                      </span>
                    </button>
                  </li>
                </ul>
              </div>
            </div>

            {/* Persistent close control stays reachable above the menu overlay. */}
            <div className="absolute top-4 right-4 z-10 flex gap-2">
              {mode && (
                <div className="md:hidden flex gap-2">
                  <IconBtn onClick={toggleMute} title="Mute" active={muted}>
                    {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                  </IconBtn>
                  <IconBtn onClick={onToggleHostView} title="Host View" active={hostView}>
                    {hostView ? <Eye size={18} /> : <EyeOff size={18} />}
                  </IconBtn>
                  <IconBtn onClick={toggleFullscreen} title={isFullscreen ? "Exit fullscreen" : "Fullscreen"} active={isFullscreen}>
                    <Maximize size={18} />
                  </IconBtn>
                  <IconBtn onClick={onResetGame} title="Reset" active={false}><RotateCcw size={18} /></IconBtn>
                </div>
              )}
              <IconBtn onClick={() => setMenuOpen(false)} title="Tutup menu" active={false}>
                <X size={18} />
              </IconBtn>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Host view banner */}
      {hostView && mode && (
        <div className="px-8 pb-3 -mt-3 text-xs font-bold text-amber-400 flex items-center gap-2">
          <Eye size={14} /> HOST VIEW AKTIF — jawaban terlihat.
          <span className="text-slate-400">(Game ke-{gameKey})</span>
        </div>
      )}
    </>
  );
}

function IconBtn({
  children,
  onClick,
  title,
  active = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`p-2.5 rounded-lg border transition-colors cursor-pointer ${
        active
          ? "bg-green-400/20 text-green-400 border-green-400/50"
          : "border-[#2e2e2e] text-slate-300 hover:text-green-400 hover:border-green-400/50"
      }`}
    >
      {children}
    </button>
  );
}
