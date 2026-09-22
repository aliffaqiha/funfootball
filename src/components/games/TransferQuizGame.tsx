"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Clock, ChevronRight, RotateCcw } from "lucide-react";
import players from "@/data/players.json";
import clubs from "@/data/clubs-nations.json";
import { playCorrect, playSpin } from "@/lib/sound";
import { fireConfetti } from "@/lib/confetti";
import { useKeyboardShortcuts } from "@/lib/useKeyboard";
import Button from "@/components/ui/Button";

const clubInitials: Record<string, string> = {
  Barcelona: "BAR",
  "Paris Saint-Germain": "PSG",
  "Inter Miami": "INT",
  "Manchester United": "MUN",
  "Real Madrid": "RMA",
  Juventus: "JUV",
  "Al-Nassr": "NAS",
  "AS Monaco": "MON",
  "Tottenham Hotspur": "TOT",
  "Bayern Munich": "BAY",
  "Borussia Dortmund": "BVB",
  Liverpool: "LIV",
  Chelsea: "CHE",
  "Manchester City": "MCI",
  "Leicester City": "LEI",
  "Al-Ittihad": "ITT",
  Fiorentina: "FIO",
  "AS Roma": "ROM",
  "VfL Wolfsburg": "WOL",
  Sevilla: "SEV",
  "Dinamo Zagreb": "ZAG",
  "Inter Milan": "INT",
  "AC Milan": "MIL",
  Fluminense: "FLU",
  "Boca Juniors": "BOC",
  "Universidad Católica": "UCA",
  Beşiktaş: "BEŞ",
  "Red Bull Salzburg": "RSB",
  "Southampton": "SOT",
  "Los Angeles FC": "LAF",
  "FC Metz": "MET",
  "Persija Jakarta": "PSJ",
  Selangor: "SEL",
  Santos: "SAN",
  "Al-Hilal": "HIL",
  Bryne: "BRY",
  Molde: "MOL",
  Galatasaray: "GAL",
};

const getClubShort = (c: string) => {
  const club = clubs.find((x) => x.name === c);
  if (club) return clubInitials[c] ?? club.id.toUpperCase();
  return clubInitials[c] ?? c.slice(0, 3).toUpperCase();
};

export default function TransferQuizGame() {
  const [round, setRound] = useState(0);
  const [transfers, setTransfers] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const player = useMemo(() => players[round % players.length], [round]);

  const nextTransfer = () => {
    if (transfers < player.transfers.length) {
      setTransfers((t) => t + 1);
      playSpin();
    }
  };

  const revealPlayer = () => {
    setRevealed(true);
    playCorrect();
    fireConfetti();
  };

  const reset = () => {
    setTransfers(0);
    setRevealed(false);
  };

  useKeyboardShortcuts({
    " ": (e) => e.preventDefault(),
  });

  const visible = player.transfers.slice(0, transfers);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <h2 className="text-2xl font-black text-slate-100 flex items-center gap-2">
          <Clock className="text-green-400" /> Transfer Quiz
        </h2>
        <Button variant="secondary" size="sm" onClick={reset}>
          <RotateCcw size={14} /> Reset Round
        </Button>
      </div>

      <div className="bg-slate-900/90 border border-slate-700 rounded-3xl p-8 shadow-2xl">
        <p className="text-slate-400 text-center mb-6 font-bold uppercase tracking-widest text-sm">
          Tebak pemain dari riwayat transfernya
        </p>

        <div className="space-y-3">
          {player.transfers.map((t, i) => {
            const isRevealed = i < visible.length;
            const isLastRevealed = i === visible.length - 1 && isRevealed;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className={`flex items-center gap-4 rounded-xl p-4 border transition-colors ${
                  isRevealed
                    ? "bg-slate-800 border-slate-500"
                    : "bg-slate-950 border-slate-700 opacity-70"
                }`}
              >
                <div
                  className={`w-16 text-center font-black text-lg rounded-lg py-2 border ${
                    isRevealed ? "bg-green-500/20 text-green-300 border-green-400" : "bg-slate-900 text-slate-600 border-slate-700"
                  }`}
                >
                  {t.year}
                </div>
                <div className="flex-1 text-xl md:text-2xl font-black">
                  {isRevealed ? (
                    <span className="text-slate-100">{t.club}</span>
                  ) : (
                    <span className="text-slate-600 tracking-widest">• • • • • •</span>
                  )}
                </div>
                {isRevealed && (
                  <span className="px-3 py-1 rounded-full bg-slate-700 text-sm font-bold text-slate-300">
                    {getClubShort(t.club)}
                  </span>
                )}
                {isLastRevealed && !revealed && (
                  <motion.span
                    className="w-3 h-3 rounded-full bg-green-400"
                    animate={{ scale: [1, 1.6, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                  />
                )}
              </motion.div>
            );
          })}
        </div>

        {revealed ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 16 }}
            className="mt-8 text-center bg-green-500/15 border-2 border-green-400 rounded-2xl py-10 px-6"
          >
            <div className="text-4xl md:text-6xl font-black text-slate-50">
              {player.firstName} {player.lastName}
            </div>
            <div className="mt-3 text-xl text-slate-300 font-bold">
              {player.nationality} • {player.position}
            </div>
          </motion.div>
        ) : (
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="lg" onClick={nextTransfer} disabled={transfers >= player.transfers.length}>
              <ChevronRight size={20} /> Open Next Transfer
            </Button>
            <Button size="lg" variant="success" onClick={revealPlayer} disabled={transfers === 0}>
              🎉 Reveal Player
            </Button>
          </div>
        )}
      </div>

      {revealed && (
        <div className="flex justify-center">
          <Button size="lg" variant="secondary" onClick={() => { setRound((r) => r + 1); reset(); }}>
            <RotateCcw size={20} /> Pemain Berikutnya
          </Button>
        </div>
      )}
    </div>
  );
}