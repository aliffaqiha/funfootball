"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { Timer } from "lucide-react";
import Header from "@/components/Header";
import HomeLanding from "@/components/HomeLanding";
import Scoreboard from "@/components/ui/Scoreboard";
import { useScoreboard } from "@/lib/store";
import type { GameModeOrHome } from "@/lib/types";
import { playWrong } from "@/lib/sound";

const gameLoading = () => (
  <div role="status" className="py-16 text-center text-sm font-bold text-slate-400">
    Memuat permainan…
  </div>
);

const TriviaGame = dynamic(() => import("@/components/games/TriviaGame"), { loading: gameLoading });
const Starting11Game = dynamic(() => import("@/components/games/Starting11Game"), { loading: gameLoading });
const TransferQuizGame = dynamic(() => import("@/components/games/TransferQuizGame"), { loading: gameLoading });
const GuessPlayerGame = dynamic(() => import("@/components/games/GuessPlayerGame"), { loading: gameLoading });

export default function GameExperience() {
  const [mode, setMode] = useState<GameModeOrHome>("");
  const [hostView, setHostView] = useState(false);
  const [gameKey, setGameKey] = useState(1);
  const { updateScore, state } = useScoreboard();

  const handleCorrect = useCallback(() => {
    if (state.activeEntryId) updateScore(state.activeEntryId, 10);
  }, [state.activeEntryId, updateScore]);

  const handleWrong = useCallback(() => {
    playWrong();
  }, []);

  const inGame = mode !== "";
  const shortcutProps = { hostView, onCorrect: handleCorrect, onWrong: handleWrong };

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        mode={mode}
        onChangeMode={setMode}
        hostView={hostView}
        onToggleHostView={() => setHostView((value) => !value)}
        gameKey={gameKey}
        onResetGame={() => setGameKey((key) => key + 1)}
      />

      {!inGame ? (
        <HomeLanding onSelect={setMode} />
      ) : (
        <>
          <main className="flex-1 flex flex-col lg:flex-row gap-6 p-4 lg:p-6 w-full max-w-[1600px] mx-auto">
            <div className="flex-1 min-w-0">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${mode}-${gameKey}`}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                >
                  {mode === "trivia" && <TriviaGame {...shortcutProps} />}
                  {mode === "starting11" && <Starting11Game />}
                  {mode === "transfer" && <TransferQuizGame hostView={hostView} />}
                  {mode === "guess" && <GuessPlayerGame {...shortcutProps} />}
                </motion.div>
              </AnimatePresence>
            </div>

            <aside className="lg:w-96 shrink-0">
              <Scoreboard />
            </aside>
          </main>

          {mode === "trivia" && (
            <footer className="pb-4 text-center text-xs text-slate-600">
              <span className="inline-flex items-center gap-2"><Timer size={12} /> Space mulai timer • Enter reveal/benar • Backspace salah</span>
            </footer>
          )}
          {mode === "guess" && (
            <footer className="pb-4 text-center text-xs text-slate-600">
              <span className="inline-flex items-center gap-2"><Timer size={12} /> Space spin • Enter benar • Backspace salah</span>
            </footer>
          )}
          {mode === "starting11" && (
            <footer className="pb-4 text-center text-xs text-slate-600">Pilih Gacha Pemain untuk mengisi lineup, lalu susun posisi di lapangan.</footer>
          )}
          {mode === "transfer" && (
            <footer className="pb-4 text-center text-xs text-slate-600">Buka riwayat transfer satu per satu, lalu tebak pemainnya.</footer>
          )}
        </>
      )}
    </div>
  );
}
