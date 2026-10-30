"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { UserPlus, Trash2, RotateCcw } from "lucide-react";
import { useScoreboard } from "@/lib/store";
import Button from "./Button";
import Card from "./Card";
import { playCorrect } from "@/lib/sound";

export default function Scoreboard() {
  const { state, addPlayer, removePlayer, setActivePlayer, updateScore, reset } = useScoreboard();
  const [name, setName] = useState("");

  return (
    <Card className="w-full max-h-[60vh] flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700 bg-slate-800/60">
        <h2 className="text-lg font-extrabold tracking-widest text-green-400 uppercase">
          Scoreboard
        </h2>
        <button
          type="button"
          onClick={() => {
            if (state.entries.length === 0 || window.confirm("Reset scoreboard dan hapus semua skor?")) reset();
          }}
          className="text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
          title="Reset scoreboard"
          aria-label="Reset scoreboard"
        >
          <RotateCcw size={18} />
        </button>
      </div>

      <div className="p-3 border-b border-slate-700 flex gap-2">
        <label htmlFor="scoreboard-player-name" className="sr-only">Nama pemain atau tim</label>
        <input
          id="scoreboard-player-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              addPlayer(name);
              setName("");
            }
          }}
          placeholder="Nama pemain / tim..."
          className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-base text-slate-100 placeholder-slate-500 focus:outline-none focus:border-green-400"
        />
        <Button
          size="sm"
          aria-label="Tambah pemain atau tim"
          onClick={() => {
            addPlayer(name);
            setName("");
          }}
          disabled={!name.trim()}
        >
          <UserPlus size={16} />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {state.entries.length === 0 && (
          <p className="text-slate-500 text-center py-6 text-sm">
            Belum ada pemain. Tambahkan tim/pemain untuk mulai.
          </p>
        )}
        {state.entries.map((entry) => (
          <motion.div
            key={entry.id}
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${state.activeEntryId === entry.id ? "bg-green-950/40 border-green-500/60" : "bg-slate-800/80 border-slate-700"}`}
          >
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-100 truncate">{entry.name}</p>
              <p className="text-3xl font-black text-green-400 tabular-nums">
                {entry.score}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActivePlayer(entry.id)}
                aria-pressed={state.activeEntryId === entry.id}
                className={`px-2 py-1 rounded-lg text-xs font-bold cursor-pointer ${state.activeEntryId === entry.id ? "bg-green-500 text-slate-950" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}
              >
                {state.activeEntryId === entry.id ? "Aktif" : "Pilih"}
              </button>
              <button
                type="button"
                onClick={() => {
                  updateScore(entry.id, 10);
                  playCorrect();
                }}
                className="px-2 py-1 bg-green-500/20 text-green-400 font-bold rounded-lg hover:bg-green-500/40 cursor-pointer text-sm"
                aria-label={`Tambah 10 poin untuk ${entry.name}`}
              >
                +10
              </button>
              <button
                type="button"
                onClick={() => updateScore(entry.id, 5)}
                className="px-2 py-1 bg-sky-500/20 text-sky-400 font-bold rounded-lg hover:bg-sky-500/40 cursor-pointer text-sm"
                aria-label={`Tambah 5 poin untuk ${entry.name}`}
              >
                +5
              </button>
              <button
                type="button"
                onClick={() => updateScore(entry.id, -5)}
                className="px-2 py-1 bg-orange-500/20 text-orange-400 font-bold rounded-lg hover:bg-orange-500/40 cursor-pointer text-sm"
                aria-label={`Kurangi 5 poin dari ${entry.name}`}
              >
                -5
              </button>
              <button
                type="button"
                onClick={() => removePlayer(entry.id)}
                className="px-2 py-1 text-slate-500 hover:text-red-400 cursor-pointer"
                title="Hapus pemain"
                aria-label={`Hapus ${entry.name}`}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </Card>
  );
}
