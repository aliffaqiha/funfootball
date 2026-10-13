"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Dices, Check, X, RefreshCw } from "lucide-react";
import { playCorrect, playSpin, playWrong } from "@/lib/sound";
import GachaSlot from "@/components/ui/GachaSlot";
import CountdownTimer from "@/components/ui/CountdownTimer";
import Button from "@/components/ui/Button";
import players from "@/data/players.json";
import { useKeyboardShortcuts } from "@/lib/useKeyboard";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const VALID_PAIRS = [...new Set(players.map((player) => player.firstName.slice(0, 2).toUpperCase()).filter((pair) => /^[A-Z]{2}$/.test(pair)))];

interface GuessPlayerGameProps {
  hostView: boolean;
  onCorrect: () => void;
  onWrong: () => void;
}

export default function GuessPlayerGame({ hostView, onCorrect, onWrong }: GuessPlayerGameProps) {
  const [spinning, setSpinning] = useState(false);
  const [letters, setLetters] = useState<[string, string]>(["A", "B"]);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [guessInput, setGuessInput] = useState("");
  const resolvedRef = useRef(false);
  const spinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);
  }, []);

  const spinLetters = () => {
    if (spinning) return;
    setSpinning(true);
    setRunning(false);
    setResult(null);
    resolvedRef.current = false;
    playSpin();
    spinTimeoutRef.current = setTimeout(() => {
      const pair = VALID_PAIRS[Math.floor(Math.random() * VALID_PAIRS.length)];
      setLetters([pair[0], pair[1]]);
      setSpinning(false);
      setRunning(true);
    }, 1600);
  };

  const handleAnswer = (answer: "correct" | "wrong") => {
    if (!running || resolvedRef.current) return;
    resolvedRef.current = true;
    setResult(answer);
    setRunning(false);
    if (answer === "correct") {
      playCorrect();
      onCorrect();
    } else {
      playWrong();
      onWrong();
    }
  };

  const handleCorrect = () => handleAnswer("correct");
  const handleWrong = () => handleAnswer("wrong");

  useKeyboardShortcuts({
    " ": (event) => {
      event.preventDefault();
      if (!spinning) spinLetters();
    },
    Enter: handleCorrect,
    Backspace: handleWrong,
  });

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 flex flex-col items-center">
      <h2 className="text-2xl md:text-3xl font-black text-slate-100 flex items-center gap-2">
        <Dices className="text-green-400" /> Guess the Player
      </h2>

      <div className="flex items-center gap-6">
        <GachaSlot
          spinning={spinning}
          items={LETTERS}
          result={letters[0]}
          renderItem={(item) => (
            <span className="font-black text-green-400 drop-shadow-lg" style={{ fontSize: 56 }}>
              {String(item)}
            </span>
          )}
          size={140}
        />
        <span className="text-4xl font-black text-slate-500">-</span>
        <GachaSlot
          spinning={spinning}
          items={LETTERS}
          result={letters[1]}
          renderItem={(item) => (
            <span className="font-black text-green-400 drop-shadow-lg" style={{ fontSize: 56 }}>
              {String(item)}
            </span>
          )}
          size={140}
        />
      </div>

      <p className="text-slate-300 text-xl text-center font-bold">
        Tebak nama pemain bola yang diawali huruf{" "}
        <span className="text-green-400 text-3xl">
          {letters[0]}
          {letters[1]}
        </span>
        ...
      </p>

      {hostView && (
        <input
          value={guessInput}
          onChange={(e) => setGuessInput(e.target.value)}
          placeholder="Host: tulis nama pemain (untuk koreksi visual)..."
          className="w-full max-w-xl bg-slate-800 border border-amber-500/50 rounded-xl px-4 py-3 text-lg text-slate-100 focus:outline-none focus:border-amber-400"
        />
      )}

      {running && (
        <CountdownTimer seconds={10} running={running} onComplete={handleWrong} />
      )}

      {result && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`text-3xl font-black px-8 py-4 rounded-2xl border-2 ${
            result === "correct"
              ? "text-green-300 bg-green-500/15 border-green-400"
              : "text-red-300 bg-red-500/15 border-red-400"
          }`}
        >
          {result === "correct" ? "+10 POIN!" : "LEWATI / SALAH"}
        </motion.div>
      )}

      <div className="flex flex-wrap justify-center gap-3">
        <Button size="lg" onClick={spinLetters} disabled={spinning}>
          <Dices size={20} /> Spin 2 Letters (Spacebar)
        </Button>
        <Button size="lg" variant="success" onClick={handleCorrect} disabled={!running}>
          <Check size={20} /> Valid / Correct (Enter)
        </Button>
        <Button size="lg" variant="danger" onClick={handleWrong} disabled={!running}>
          <X size={20} /> Invalid / Wrong (Backspace)
        </Button>
        <Button
          size="lg"
          variant="secondary"
          onClick={() => {
            setRunning(false);
            setResult(null);
          }}
        >
          <RefreshCw size={20} /> Reset
        </Button>
      </div>
    </div>
  );
}
