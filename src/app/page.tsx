"use client";

import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Timer } from "lucide-react";
import Header from "@/components/Header";
import HomeLanding from "@/components/HomeLanding";
import Scoreboard from "@/components/ui/Scoreboard";
import TriviaGame from "@/components/games/TriviaGame";
import Starting11Game from "@/components/games/Starting11Game";
import TransferQuizGame from "@/components/games/TransferQuizGame";
import GuessPlayerGame from "@/components/games/GuessPlayerGame";
import { useScoreboard } from "@/lib/store";
import type { GameModeOrHome } from "@/lib/types";
import { playWrong } from "@/lib/sound";

export default function Home() {
  const [mode, setMode] = useState<GameModeOrHome>("");
  const [hostView, setHostView] = useState(false);
  const [gameKey, setGameKey] = useState(1);
  const { updateScore, state } = useScoreboard();

  const inGame = mode !== "";

  const handleCorrect = useCallback(() => {
    if (state.entries.length > 0) updateScore(state.entries[0].id, 10);
  }, [state.entries, updateScore]);

  const handleWrong = useCallback(() => {
    playWrong();
  }, []);

  const resetGame = () => setGameKey((k) => k + 1);

  const shortcutProps = {
    hostView,
    onCorrect: handleCorrect,
    onWrong: handleWrong,
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        mode={mode}
        onChangeMode={setMode}
        hostView={hostView}
        onToggleHostView={() => setHostView((v) => !v)}
        gameKey={gameKey}
        onResetGame={resetGame}
      />

      {!inGame ? (
        <HomeLanding onSelect={(m) => setMode(m)} />
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
                  {mode === "transfer" && <TransferQuizGame />}
                  {mode === "guess" && <GuessPlayerGame {...shortcutProps} />}
                </motion.div>
              </AnimatePresence>
            </div>

            <aside className="lg:w-96 shrink-0">
              <Scoreboard />
            </aside>
          </main>

          <footer className="pb-4 text-center text-xs text-slate-600">
            <span className="inline-flex items-center gap-2">
              <Timer size={12} /> Space = spin/timer • Enter = benar • Backspace = salah • M = mute • F = fullscreen
            </span>
          </footer>
        </>
      )}
    </div>
  );
}