"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, Clock, ChevronRight, Loader2, RotateCcw, ShieldAlert, X } from "lucide-react";
import players from "@/data/players.json";
import clubs from "@/data/clubs-nations.json";
import { playCorrect, playSpin } from "@/lib/sound";
import { fireConfetti } from "@/lib/confetti";
import Button from "@/components/ui/Button";

interface QuizTransfer {
  year: number;
  club: string;
}

interface QuizPlayer {
  id?: string;
  name?: string;
  firstName: string;
  lastName: string;
  nationality: string | null;
  position: string | null;
  transfers: QuizTransfer[];
  totalClubs?: number;
}

const clubInitials: Record<string, string> = {
  Barcelona: "BAR",
  "Paris Saint-Germain": "PSG",
  PSG: "PSG",
  Monaco: "MON",
  Dortmund: "BVB",
  "Real Madrid": "RMA",
  "Man City": "MCI",
  Liverpool: "LIV",
  Chelsea: "CHE",
  Arsenal: "ARS",
  "Man United": "MUN",
  "Inter Miami": "INT",
  "Manchester United": "MUN",
  "Manchester City": "MCI",
  "Bayern Munich": "BAY",
  "Borussia Dortmund": "BVB",
  Juventus: "JUV",
  "Al-Nassr": "NAS",
  "AS Monaco": "MON",
  "AS Roma": "ROM",
  "Atlético Madrid": "ATM",
  Atletico: "ATM",
  Atlético: "ATM",
  "Tottenham Hotspur": "TOT",
  "Leicester City": "LEI",
  "Al-Ittihad": "ITT",
  Fiorentina: "FIO",
  "VfL Wolfsburg": "WOL",
  Wolfsburg: "WOL",
  Sevilla: "SEV",
  "Dinamo Zagreb": "ZAG",
  "Inter Milan": "INT",
  "AC Milan": "MIL",
  Milan: "MIL",
  Fluminense: "FLU",
  "Boca Juniors": "BOC",
  "Universidad Católica": "UCA",
  Beşiktaş: "BEŞ",
  "Red Bull Salzburg": "RSB",
  Salzburg: "RSB",
  Southampton: "SOT",
  "Los Angeles FC": "LAF",
  "FC Metz": "MET",
  "Persija Jakarta": "PSJ",
  Selangor: "SEL",
  Santos: "SAN",
  "Al-Hilal": "HIL",
  Bryne: "BRY",
  Molde: "MOL",
  Galatasaray: "GAL",
  Napoli: "NAP",
  Genk: "GNK",
  "Werder Bremen": "SVW",
  "Leyton Orient": "LEY",
  Millwall: "MIL",
  Norwich: "NOR",
  "Without Club": "FREE",
  Sport: "SPO",
};

const getClubShort = (c: string) => {
  const club = clubs.find((x) => x.name === c);
  if (club) return clubInitials[c] ?? club.id.toUpperCase();
  return (
    clubInitials[c] ??
    c
      .split(/[\s\-]/)
      .slice(0, 3)
      .map((p) => p[0] ?? "")
      .join("")
      .toUpperCase()
  );
};

const MAX_TRANSFERS = 9;

interface TransferQuizGameProps {
  hostView: boolean;
  onCorrect: () => void;
  onWrong: () => void;
}

export default function TransferQuizGame({ hostView, onCorrect, onWrong }: TransferQuizGameProps) {
  const [round, setRound] = useState(0);
  const [transfers, setTransfers] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [answerResult, setAnswerResult] = useState<"correct" | "wrong" | null>(null);
  const [quiz, setQuiz] = useState<QuizPlayer | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const seenIds = useRef<Set<string>>(new Set());
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const roundRef = useRef(0);
  const answerResolvedRef = useRef(false);

  const nextQuiz = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const requestId = ++requestIdRef.current;
    const nextRound = roundRef.current + 1;
    roundRef.current = nextRound;
    answerResolvedRef.current = false;
    setLoading(true);
    setErr(null);
    setTransfers(0);
    setRevealed(false);
    setAnswerResult(null);
    setRound(nextRound);
    try {
      const params = new URLSearchParams();
      if (seenIds.current.size > 0) params.set("exclude", [...seenIds.current].join(","));
      const query = params.size > 0 ? `?${params.toString()}` : "";
      const res = await fetch(`/api/transfer-quiz${query}`, { signal: controller.signal });
      if (!res.ok) throw new Error("failed");
      const data = (await res.json()) as QuizPlayer;
      if (requestId !== requestIdRef.current) return;
      seenIds.current.add(data.id ?? "");
      setQuiz(data);
    } catch {
      if (controller.signal.aborted || requestId !== requestIdRef.current) return;
      setErr("Gagal memuat data live. Memakai data offline.");
      setQuiz(players[nextRound % players.length] as unknown as QuizPlayer);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void nextQuiz(), 0);
    return () => {
      window.clearTimeout(timer);
      abortRef.current?.abort();
      requestIdRef.current += 1;
    };
  }, [nextQuiz]);

  const player = quiz ?? players[round % players.length];
  const totalClubs = "totalClubs" in player ? player.totalClubs : player.transfers.length;

  const nextTransfer = () => {
    if (transfers < player.transfers.length && transfers < MAX_TRANSFERS) {
      setTransfers((t) => t + 1);
      playSpin();
    }
  };

  const revealPlayer = () => {
    setRevealed(true);
  };

  const reset = () => {
    if (answerResolvedRef.current) return;
    setTransfers(0);
    setRevealed(false);
  };

  const recordAnswer = (result: "correct" | "wrong") => {
    if (!revealed || answerResolvedRef.current) return;
    answerResolvedRef.current = true;
    setAnswerResult(result);
    if (result === "correct") {
      playCorrect();
      fireConfetti();
      onCorrect();
    } else {
      onWrong();
    }
  };

  const visible = player.transfers.slice(0, transfers);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <h2 className="text-2xl font-black text-slate-100 flex items-center gap-2">
          <Clock className="text-green-400" /> Transfer Quiz
        </h2>
        <Button variant="secondary" size="sm" onClick={reset} disabled={loading || answerResult !== null}>
          <RotateCcw size={14} /> Reset Round
        </Button>
      </div>

      <div className="bg-slate-900/90 border border-slate-700 rounded-3xl p-8 shadow-2xl">
        <p className="text-slate-400 text-center mb-6 font-bold uppercase tracking-widest text-sm">
          Tebak pemain dari riwayat transfernya
        </p>

        {hostView && !loading && !revealed && (
          <div className="mb-6 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-center" role="status">
            <span className="block text-xs font-black uppercase tracking-widest text-amber-300">Jawaban untuk host</span>
            <span className="mt-1 block text-lg font-bold text-slate-100">{player.firstName} {player.lastName}</span>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
            <Loader2 size={28} className="animate-spin" />
            <span className="text-sm font-bold">Menyiapkan ronde…</span>
          </div>
        ) : (
          <div className="space-y-3">
            {totalClubs !== undefined && totalClubs > player.transfers.length && (
              <p className="text-center text-xs text-slate-400" role="note">
                Menampilkan {player.transfers.length} dari {totalClubs} klub dalam riwayat.
              </p>
            )}
            {player.transfers.slice(0, MAX_TRANSFERS).map((t, i) => {
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
        )}

        {err && <div className="flex items-center gap-2 mt-6 justify-center text-xs text-amber-400"><ShieldAlert size={14} /> {err}</div>}

        {!loading && revealed ? (
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
            {answerResult === null ? (
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button size="lg" variant="success" onClick={() => recordAnswer("correct")}>
                  <Check size={20} /> Benar (+10)
                </Button>
                <Button size="lg" variant="danger" onClick={() => recordAnswer("wrong")}>
                  <X size={20} /> Salah (0)
                </Button>
              </div>
            ) : (
              <p className={`mt-5 text-lg font-black ${answerResult === "correct" ? "text-green-300" : "text-red-300"}`} role="status">
                {answerResult === "correct" ? "BENAR — +10 poin dicatat" : "SALAH — ronde dicatat"}
              </p>
            )}
          </motion.div>
        ) : (
          !loading && (
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button size="lg" onClick={nextTransfer} disabled={transfers >= Math.min(player.transfers.length, MAX_TRANSFERS)}>
                <ChevronRight size={20} /> Open Next Transfer
              </Button>
              <Button size="lg" variant="success" onClick={revealPlayer} disabled={transfers === 0}>
                🎉 Reveal Player
              </Button>
            </div>
          )
        )}
      </div>

      {!loading && revealed && answerResult !== null && (
        <div className="flex justify-center">
          <Button size="lg" variant="secondary" onClick={nextQuiz}>
            <RotateCcw size={20} /> Pemain Berikutnya
          </Button>
        </div>
      )}
    </div>
  );
}
