"use client";

import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Eye, Check, X, RefreshCw, ChevronRight } from "lucide-react";
import trivia from "@/data/trivia.json";
import { playCorrect, playWrong } from "@/lib/sound";
import { fireConfetti } from "@/lib/confetti";
import { useKeyboardShortcuts } from "@/lib/useKeyboard";
import Button from "@/components/ui/Button";
import CountdownTimer from "@/components/ui/CountdownTimer";

interface TriviaGameProps {
  hostView: boolean;
  onCorrect: () => void;
  onWrong: () => void;
}

export default function TriviaGame({ hostView, onCorrect, onWrong }: TriviaGameProps) {
  const [index, setIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [phase, setPhase] = useState<"ready" | "playing" | "done">("ready");
  const [revealed, setRevealed] = useState(false);
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const resolvedRef = useRef(false);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(trivia.map((q) => q.category)))],
    []
  );

  const list = useMemo(
    () => trivia.filter((q) => selectedCategory === "All" || q.category === selectedCategory),
    [selectedCategory]
  );

  const question = list[Math.min(index, list.length - 1)];

  const resetRound = () => {
    resolvedRef.current = false;
    setRevealed(false);
    setResult(null);
    setPhase("ready");
  };

  const nextIndex = () => {
    if (index >= list.length - 1) setIndex(0);
    else setIndex((i) => i + 1);
    resetRound();
  };

  const startTimer = () => {
    resolvedRef.current = false;
    setPhase("playing");
    setRevealed(false);
    setResult(null);
  };

  const handleCorrect = () => {
    if (resolvedRef.current || phase !== "playing") return;
    resolvedRef.current = true;
    setResult("correct");
    setPhase("done");
    setRevealed(true);
    playCorrect();
    fireConfetti();
    onCorrect();
  };

  const handleWrong = () => {
    if (resolvedRef.current || phase !== "playing") return;
    resolvedRef.current = true;
    setResult("wrong");
    setPhase("done");
    setRevealed(true);
    playWrong();
    onWrong();
  };

  useKeyboardShortcuts({
    " ": (e) => {
      e.preventDefault();
      if (phase === "ready") startTimer();
    },
    Enter: () => {
      if (phase === "playing" && !revealed) setRevealed(true);
      else if (phase === "playing") handleCorrect();
    },
    Backspace: () => {
      if (phase !== "ready") handleWrong();
    },
  });

  if (!question) {
    return <p className="text-slate-400 text-center">Tidak ada soal.</p>;
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div className="flex gap-2 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setSelectedCategory(cat);
                setIndex(0);
                resetRound();
              }}
              className={`px-4 py-2 rounded-lg border font-bold text-sm transition-colors cursor-pointer shrink-0 ${
                selectedCategory === cat
                  ? "bg-green-500 text-slate-950 border-green-400"
                  : "bg-slate-800 text-slate-300 border-slate-600 hover:border-green-400"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <span className="text-slate-400 font-bold">
          Soal {index + 1} / {list.length}
        </span>
      </div>

      <motion.div
        key={question.id}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900/90 border border-slate-700 rounded-3xl p-8 md:p-12 shadow-2xl flex flex-col items-center gap-8 min-h-[300px]"
      >
        <span className="px-4 py-1.5 bg-green-500/15 text-green-400 border border-green-500/30 rounded-full text-sm font-bold uppercase tracking-widest">
          {question.category}
        </span>
        <h2 className="text-3xl md:text-5xl font-black text-center text-slate-50 leading-tight">
          {question.question}
        </h2>

        {phase === "playing" && (
          <CountdownTimer
            seconds={15}
            running={phase === "playing"}
            onComplete={handleWrong}
            playTick={false}
          />
        )}

        {phase === "playing" && !revealed && !hostView && (
          <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
            {question.options.map((option) => (
              <div key={option} className="text-center px-4 py-3 rounded-xl font-bold text-lg border bg-slate-800 border-slate-600 text-slate-300">
                {option}
              </div>
            ))}
          </div>
        )}

        {phase === "playing" && !revealed && hostView && (
          <HostHint answer={question.answer} />
        )}

        {phase === "playing" && !revealed && (
          <p className="text-slate-400 text-xl">
            {hostView ? "(Menunggu Reveal...)" : "Tebak jawabannya!"}
          </p>
        )}

        {revealed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="w-full space-y-4"
          >
            <div className="text-center text-3xl md:text-4xl font-black bg-green-500/20 text-green-300 border-2 border-green-400 rounded-2xl py-6">
              {question.answer}
            </div>
            {!hostView && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {question.options.map((opt) => (
                  <div
                    key={opt}
                    className={`text-center px-4 py-3 rounded-xl font-bold text-lg border ${
                      opt === question.answer
                        ? "bg-green-500/30 border-green-400 text-green-200"
                        : "bg-slate-800 border-slate-600 text-slate-300"
                    }`}
                  >
                    {opt}
                  </div>
                ))}
              </div>
            )}
            {hostView && (
              <HostHint answer={question.answer} />
            )}
          </motion.div>
        )}

        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-2xl font-black ${result === "correct" ? "text-green-400" : "text-red-500"}`}
          >
            {result === "correct" ? "BENAR! +10" : "SALAH (0)"}
          </motion.div>
        )}
      </motion.div>

      <div className="flex flex-wrap justify-center gap-3">
        <Button variant="secondary" size="md" onClick={nextIndex}>
          <RefreshCw size={18} /> Ganti Soal
        </Button>
        {phase === "ready" ? (
          <Button size="md" onClick={startTimer}>
            <ChevronRight size={18} /> Mulai Timer (Spacebar)
          </Button>
        ) : (
          <Button size="md" variant="secondary" onClick={() => setRevealed(true)}>
            <Eye size={18} /> Reveal Answer
          </Button>
        )}
        <Button
          size="md"
          variant="success"
          onClick={handleCorrect}
          disabled={phase !== "playing"}
        >
          <Check size={18} /> Benar (+10) [Enter]
        </Button>
        <Button
          size="md"
          variant="danger"
          onClick={handleWrong}
          disabled={phase !== "playing"}
        >
          <X size={18} /> Salah (0) [Backspace]
        </Button>
      </div>
    </div>
  );
}

function HostHint({ answer }: { answer: string }) {
  return (
    <div className="text-center text-sm text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-xl py-2">
      Host View aktif — jawaban yang benar ditandai hijau: {answer}
    </div>
  );
}
