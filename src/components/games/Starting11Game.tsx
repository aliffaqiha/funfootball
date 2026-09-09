"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, X, UserPlus, Sparkles, ChevronDown } from "lucide-react";
import clubs from "@/data/clubs-nations.json";
import { playCorrect, playSpin } from "@/lib/sound";
import GachaSlot from "@/components/ui/GachaSlot";
import GachaModal from "@/components/ui/GachaModal";
import Button from "@/components/ui/Button";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

interface Pos {
  id: string;
  label: string;
  role: "GK" | "DEF" | "MID" | "FWD";
  row: number; // 1=fwd (top), 2=att mid, 3=mid, 4=def, 5=gk (bottom)
  col: number; // 1-7 grid columns, 0=center
}

interface FormationDef {
  id: string;
  name: string;
  positions: Pos[];
}

/* -------------------------------------------------------------------------- */
/*  Formations — row/col grid (5 rows × 7 cols)                               */
/*  row 1=top (opponent goal) row 5=bottom (own goal)                         */
/*  col 1-7 = left to right, 0 = centered                                     */
/* -------------------------------------------------------------------------- */

const FORMATIONS: FormationDef[] = [
  {
    id: "4-3-3",
    name: "4-3-3",
    positions: [
      { id: "gk",  label: "GK",  role: "GK",  row: 5, col: 0 },
      { id: "lb",  label: "LB",  role: "DEF", row: 4, col: 1 },
      { id: "cb1", label: "CB",  role: "DEF", row: 4, col: 3 },
      { id: "cb2", label: "CB",  role: "DEF", row: 4, col: 5 },
      { id: "rb",  label: "RB",  role: "DEF", row: 4, col: 7 },
      { id: "lm",  label: "LCM", role: "MID", row: 3, col: 2 },
      { id: "cm",  label: "CM",  role: "MID", row: 3, col: 0 },
      { id: "rm",  label: "RCM", role: "MID", row: 3, col: 6 },
      { id: "lw",  label: "LW",  role: "FWD", row: 1, col: 2 },
      { id: "st",  label: "ST",  role: "FWD", row: 1, col: 0 },
      { id: "rw",  label: "RW",  role: "FWD", row: 1, col: 6 },
    ],
  },
  {
    id: "4-4-2",
    name: "4-4-2",
    positions: [
      { id: "gk",  label: "GK",  role: "GK",  row: 5, col: 0 },
      { id: "lb",  label: "LB",  role: "DEF", row: 4, col: 1 },
      { id: "cb1", label: "CB",  role: "DEF", row: 4, col: 3 },
      { id: "cb2", label: "CB",  role: "DEF", row: 4, col: 5 },
      { id: "rb",  label: "RB",  role: "DEF", row: 4, col: 7 },
      { id: "lm",  label: "LM",  role: "MID", row: 3, col: 1 },
      { id: "lcm", label: "LCM", role: "MID", row: 3, col: 3 },
      { id: "rcm", label: "RCM", role: "MID", row: 3, col: 5 },
      { id: "rm",  label: "RM",  role: "MID", row: 3, col: 7 },
      { id: "st1", label: "ST",  role: "FWD", row: 1, col: 3 },
      { id: "st2", label: "ST",  role: "FWD", row: 1, col: 5 },
    ],
  },
  {
    id: "3-5-2",
    name: "3-5-2",
    positions: [
      { id: "gk",  label: "GK",  role: "GK",  row: 5, col: 0 },
      { id: "cb1", label: "CB",  role: "DEF", row: 4, col: 2 },
      { id: "cb2", label: "CB",  role: "DEF", row: 4, col: 0 },
      { id: "cb3", label: "CB",  role: "DEF", row: 4, col: 6 },
      { id: "lwb", label: "LWB", role: "MID", row: 3, col: 1 },
      { id: "lm",  label: "LM",  role: "MID", row: 3, col: 3 },
      { id: "cm",  label: "CM",  role: "MID", row: 3, col: 0 },
      { id: "rm",  label: "RM",  role: "MID", row: 3, col: 5 },
      { id: "rwb", label: "RWB", role: "MID", row: 3, col: 7 },
      { id: "st1", label: "ST",  role: "FWD", row: 1, col: 3 },
      { id: "st2", label: "ST",  role: "FWD", row: 1, col: 5 },
    ],
  },
  {
    id: "4-2-3-1",
    name: "4-2-3-1",
    positions: [
      { id: "gk",   label: "GK",  role: "GK",  row: 5, col: 0 },
      { id: "lb",   label: "LB",  role: "DEF", row: 4, col: 1 },
      { id: "cb1",  label: "CB",  role: "DEF", row: 4, col: 3 },
      { id: "cb2",  label: "CB",  role: "DEF", row: 4, col: 5 },
      { id: "rb",   label: "RB",  role: "DEF", row: 4, col: 7 },
      { id: "cdm1", label: "CDM", role: "MID", row: 3, col: 3 },
      { id: "cdm2", label: "CDM", role: "MID", row: 3, col: 5 },
      { id: "lam",  label: "LAM", role: "FWD", row: 2, col: 2 },
      { id: "cam",  label: "CAM", role: "FWD", row: 2, col: 0 },
      { id: "ram",  label: "RAM", role: "FWD", row: 2, col: 6 },
      { id: "st",   label: "ST",  role: "FWD", row: 1, col: 0 },
    ],
  },
  {
    id: "4-1-2-1-2",
    name: "4-1-2-1-2 Diamond",
    positions: [
      { id: "gk",  label: "GK",  role: "GK",  row: 5, col: 0 },
      { id: "lb",  label: "LB",  role: "DEF", row: 4, col: 1 },
      { id: "cb1", label: "CB",  role: "DEF", row: 4, col: 3 },
      { id: "cb2", label: "CB",  role: "DEF", row: 4, col: 5 },
      { id: "rb",  label: "RB",  role: "DEF", row: 4, col: 7 },
      { id: "cdm", label: "CDM", role: "MID", row: 3, col: 0 },
      { id: "lm",  label: "LM",  role: "MID", row: 3, col: 2 },
      { id: "rm",  label: "RM",  role: "MID", row: 3, col: 6 },
      { id: "cam", label: "CAM", role: "FWD", row: 2, col: 0 },
      { id: "st1", label: "ST",  role: "FWD", row: 1, col: 3 },
      { id: "st2", label: "ST",  role: "FWD", row: 1, col: 5 },
    ],
  },
  {
    id: "5-3-2",
    name: "5-3-2",
    positions: [
      { id: "gk",  label: "GK",  role: "GK",  row: 5, col: 0 },
      { id: "lwb", label: "LWB", role: "DEF", row: 4, col: 1 },
      { id: "cb1", label: "CB",  role: "DEF", row: 4, col: 3 },
      { id: "cb2", label: "CB",  role: "DEF", row: 4, col: 0 },
      { id: "cb3", label: "CB",  role: "DEF", row: 4, col: 5 },
      { id: "rwb", label: "RWB", role: "DEF", row: 4, col: 7 },
      { id: "lm",  label: "LM",  role: "MID", row: 3, col: 2 },
      { id: "cm",  label: "CM",  role: "MID", row: 3, col: 0 },
      { id: "rm",  label: "RM",  role: "MID", row: 3, col: 6 },
      { id: "st1", label: "ST",  role: "FWD", row: 1, col: 3 },
      { id: "st2", label: "ST",  role: "FWD", row: 1, col: 5 },
    ],
  },
  {
    id: "4-3-2-1",
    name: "4-3-2-1 Christmas Tree",
    positions: [
      { id: "gk",  label: "GK",  role: "GK",  row: 5, col: 0 },
      { id: "lb",  label: "LB",  role: "DEF", row: 4, col: 1 },
      { id: "cb1", label: "CB",  role: "DEF", row: 4, col: 3 },
      { id: "cb2", label: "CB",  role: "DEF", row: 4, col: 5 },
      { id: "rb",  label: "RB",  role: "DEF", row: 4, col: 7 },
      { id: "lm",  label: "LCM", role: "MID", row: 3, col: 2 },
      { id: "cm",  label: "CM",  role: "MID", row: 3, col: 0 },
      { id: "rm",  label: "RCM", role: "MID", row: 3, col: 6 },
      { id: "lf",  label: "LF",  role: "FWD", row: 2, col: 3 },
      { id: "rf",  label: "RF",  role: "FWD", row: 2, col: 5 },
      { id: "st",  label: "ST",  role: "FWD", row: 1, col: 0 },
    ],
  },
  {
    id: "3-4-3",
    name: "3-4-3",
    positions: [
      { id: "gk",  label: "GK",  role: "GK",  row: 5, col: 0 },
      { id: "cb1", label: "CB",  role: "DEF", row: 4, col: 2 },
      { id: "cb2", label: "CB",  role: "DEF", row: 4, col: 0 },
      { id: "cb3", label: "CB",  role: "DEF", row: 4, col: 6 },
      { id: "lm",  label: "LM",  role: "MID", row: 3, col: 1 },
      { id: "lcm", label: "LCM", role: "MID", row: 3, col: 3 },
      { id: "rcm", label: "RCM", role: "MID", row: 3, col: 5 },
      { id: "rm",  label: "RM",  role: "MID", row: 3, col: 7 },
      { id: "lw",  label: "LW",  role: "FWD", row: 1, col: 2 },
      { id: "st",  label: "ST",  role: "FWD", row: 1, col: 0 },
      { id: "rw",  label: "RW",  role: "FWD", row: 1, col: 6 },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const ROLE_COLORS: Record<string, string> = {
  GK: "#fbbf24",
  DEF: "#38bdf8",
  MID: "#4ade80",
  FWD: "#f87171",
};

const CLUB_SHORT: Record<string, string> = {
  "Manchester United": "MUN", "Manchester City": "MCI", "Real Madrid": "RMA",
  "Barcelona": "BAR", "Bayern Munich": "BAY", "Paris Saint-Germain": "PSG",
  "Borussia Dortmund": "BVB", "Liverpool": "LIV", "Chelsea": "CHE",
  "Arsenal": "ARS", "Atletico Madrid": "ATM", "Juventus": "JUV",
  "Inter Milan": "INT", "AC Milan": "MIL", "Tottenham Hotspur": "TOT",
  "Sevilla": "SEV", "Napoli": "NAP", "Red Bull Salzburg": "RSB",
  "Galatasaray": "GAL", "Aston Villa": "AVL",
};

function clubLabel(name: string): string {
  return CLUB_SHORT[name] ?? name.slice(0, 3).toUpperCase();
}

/** Map a position's row (1=top/att, 5=bottom/gk) to a top% across the pitch */
function posTopNum(row: number): number {
  return 12 + ((row - 1) / 4) * 76;
}

function posLeftNum(col: number): number {
  if (col === 0) return 50;
  return 8 + ((col - 1) / 6) * 84;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function Starting11Game() {
  const [formationId, setFormationId] = useState("4-3-3");
  const [formationOpen, setFormationOpen] = useState(false);

  const formation = useMemo(
    () => FORMATIONS.find((f) => f.id === formationId) ?? FORMATIONS[0],
    [formationId]
  );

  const [data, setData] = useState<Record<string, { clubId: string | null; name: string }>>({});
  const [spinning, setSpinning] = useState<Record<string, boolean>>({});
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [pickerName, setPickerName] = useState("");
  const [lineup, setLineup] = useState<string[]>(() => FORMATIONS[0].positions.map((p) => p.id));
  const pitchRef = useRef<HTMLDivElement | null>(null);

  // slots = resolved positions with numeric coords, ordered
  const slots = useMemo(
    () =>
      formation.positions.map((p) => ({
        id: p.id,
        label: p.label,
        role: p.role,
        top: posTopNum(p.row),
        left: posLeftNum(p.col),
      })),
    [formation]
  );

  const get = useCallback((id: string) => data[id] ?? { clubId: null, name: "" }, [data]);

  // FIFA-style drag: fully pointer-controlled so drop lands exactly where released
  const [drag, setDrag] = useState<{
    idx: number;
    startX: number;
    startY: number;
    baseTop: number;
    baseLeft: number;
  } | null>(null);
  const [live, setLive] = useState<{ idx: number; top: number; left: number } | null>(null);
  const draggedRef = useRef(false);

  const onPointerDownSlot = (ev: React.PointerEvent, idx: number) => {
    ev.preventDefault();
    ev.currentTarget.setPointerCapture?.(ev.pointerId);
    draggedRef.current = false;
    setDrag({
      idx,
      startX: ev.clientX,
      startY: ev.clientY,
      baseTop: slots[idx].top,
      baseLeft: slots[idx].left,
    });
    setLive({ idx, top: slots[idx].top, left: slots[idx].left });
  };

  const onPointerMoveSlot = (ev: React.PointerEvent) => {
    if (!drag) return;
    const rect = pitchRef.current?.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) return;
    if (Math.abs(ev.clientX - drag.startX) + Math.abs(ev.clientY - drag.startY) > 6) {
      draggedRef.current = true;
    }
    const dxPct = ((ev.clientX - drag.startX) / rect.width) * 100;
    const dyPct = ((ev.clientY - drag.startY) / rect.height) * 100;
    setLive({ idx: drag.idx, top: drag.baseTop + dyPct, left: drag.baseLeft + dxPct });
  };

  const onPointerUpSlot = (ev: React.PointerEvent) => {
    if (!drag) return;
    const rect = pitchRef.current?.getBoundingClientRect();
    const pos = rect
      ? {
          top: drag.baseTop + ((ev.clientY - drag.startY) / rect.height) * 100,
          left: drag.baseLeft + ((ev.clientX - drag.startX) / rect.width) * 100,
        }
      : { top: live?.top ?? drag.baseTop, left: live?.left ?? drag.baseLeft };

    let best = drag.idx;
    let bestD = Infinity;
    slots.forEach((slot, j) => {
      const d = (slot.top - pos.top) ** 2 + (slot.left - pos.left) ** 2;
      if (d < bestD) {
        bestD = d;
        best = j;
      }
    });

    if (best !== drag.idx) {
      setLineup((prev) => {
        const next = [...prev];
        const t = next[drag.idx];
        next[drag.idx] = next[best];
        next[best] = t;
        return next;
      });
    }

    ev.currentTarget.releasePointerCapture?.(ev.pointerId);
    setDrag(null);
    setLive(null);
  };

  const [gacha, setGacha] = useState<{
    slotId: string;
    phase: "spin" | "done";
    result: (typeof clubs)[number] | null;
  } | null>(null);

  const spin = useCallback((slotId: string) => {
    setSpinning((p) => ({ ...p, [slotId]: true }));
    playSpin();
    setTimeout(() => {
      const club = clubs[Math.floor(Math.random() * clubs.length)];
      setData((p) => ({
        ...p,
        [slotId]: { clubId: club.id, name: (p[slotId]?.name || "").trim() || "Pemain ?" },
      }));
      setSpinning((p) => ({ ...p, [slotId]: false }));
    }, 1600);
  }, []);

  // gacha with full slot-machine modal (single slot click)
  const startGacha = useCallback((slotId: string) => {
    playSpin();
    setGacha({ slotId, phase: "spin", result: null });
    setSpinning((p) => ({ ...p, [slotId]: true }));
    setTimeout(() => {
      const club = clubs[Math.floor(Math.random() * clubs.length)];
      setData((p) => ({
        ...p,
        [slotId]: { clubId: club.id, name: (p[slotId]?.name || "").trim() || "Pemain ?" },
      }));
      setSpinning((p) => ({ ...p, [slotId]: false }));
      setGacha({ slotId, phase: "done", result: club });
      playCorrect();
      setTimeout(() => setGacha(null), 3000);
    }, 2600);
  }, []);

  const spinAll = () => {
    lineup.forEach((id) => {
      if (!get(id).clubId) spin(id);
    });
  };

  const openPicker = (slotId: string) => {
    setPickerFor(slotId);
    const g = get(slotId);
    setPickerName(g.name === "Pemain ?" ? "" : g.name);
  };

  const assignName = () => {
    if (!pickerFor) return;
    setData((p) => ({
      ...p,
      [pickerFor]: { ...get(pickerFor), name: pickerName.trim() || "Pemain ?" },
    }));
    setPickerFor(null);
    setPickerName("");
    playCorrect();
  };

  const resetAll = () => {
    setData({});
    setSpinning({});
    setGacha(null);
    setLineup(formation.positions.map((p) => p.id));
  };

  const changeFormation = (id: string) => {
    setFormationId(id);
    setFormationOpen(false);
    setData({});
    setSpinning({});
    setGacha(null);
    setLineup(FORMATIONS.find((f) => f.id === id)?.positions.map((p) => p.id) ?? []);
  };

  const filledCount = lineup.filter((id) => get(id).clubId).length;

  return (
    <div className="w-full max-w-[1400px] mx-auto space-y-6">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <h2 className="text-xl md:text-2xl font-black text-slate-100 flex items-center gap-2">
          <Trophy className="text-green-400" /> Starting 11
        </h2>
        <div className="flex items-center gap-4">
          <span className="text-slate-400 font-bold text-sm">
            {filledCount} / 11 pemain
          </span>
          <div className="relative">
            <button
              onClick={() => setFormationOpen((o) => !o)}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-slate-100 font-bold text-sm hover:border-green-400 transition-colors cursor-pointer"
            >
              Formasi: <span className="text-green-400">{formation.name}</span>
              <ChevronDown size={14} className={`transition-transform ${formationOpen ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              {formationOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="absolute right-0 top-full mt-2 bg-slate-900 border border-slate-600 rounded-xl shadow-2xl z-30 overflow-hidden min-w-[280px]"
                >
                  {FORMATIONS.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => changeFormation(f.id)}
                      className={`w-full text-left px-5 py-3 text-sm font-bold transition-colors cursor-pointer border-l-4 ${
                        f.id === formationId
                          ? "bg-green-500/20 text-green-400 border-green-400"
                          : "text-slate-300 hover:bg-slate-800 hover:text-white border-transparent"
                      }`}
                    >
                      <span className="font-mono text-slate-500 mr-3 text-xs">{f.id}</span>
                      {f.name}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* pitch — portrait real-formation layout */}
      <div className="mx-auto w-full max-w-[600px] rounded-3xl border border-green-900/50 overflow-hidden bg-[#1a472a] shadow-2xl">
        <div className="relative w-full" style={{ paddingBottom: "128%" }}>

          {/* pitch artwork */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-b from-[#1e5530] via-[#1a472a] to-[#163d23]" />
            <div className="absolute inset-0" style={{
              backgroundImage: "repeating-linear-gradient(to bottom, transparent, transparent 9.5%, rgba(255,255,255,0.015) 9.5%, rgba(255,255,255,0.015) 19%)",
            }} />

            {/* outer boundary */}
            <div className="absolute inset-[1.5%] border border-green-500/30" />
            {/* halfway line */}
            <div className="absolute left-[1.5%] right-[1.5%] top-1/2 h-[1px] bg-green-500/30" />
            {/* center circle */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[14%] aspect-square border border-green-500/30 rounded-full" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-green-500/40 rounded-full" />

            {/* penalty areas */}
            <div className="absolute left-1/2 -translate-x-1/2 bottom-[1.5%] w-[40%] h-[14%] border-t border-x border-green-500/30" />
            <div className="absolute left-1/2 -translate-x-1/2 bottom-[1.5%] w-[18%] h-[6%] border-t border-x border-green-500/30" />
            <div className="absolute left-1/2 -translate-x-1/2 bottom-[12%] w-1.5 h-1.5 bg-green-500/40 rounded-full" />

            <div className="absolute left-1/2 -translate-x-1/2 top-[1.5%] w-[40%] h-[14%] border-b border-x border-green-500/30" />
            <div className="absolute left-1/2 -translate-x-1/2 top-[1.5%] w-[18%] h-[6%] border-b border-x border-green-500/30" />
            <div className="absolute left-1/2 -translate-x-1/2 top-[12%] w-1.5 h-1.5 bg-green-500/40 rounded-full" />

            {/* corner arcs */}
            <div className="absolute top-[1.5%] left-[1.5%] w-[2%] aspect-square border-b border-r border-green-500/30 rounded-br-full" />
            <div className="absolute top-[1.5%] right-[1.5%] w-[2%] aspect-square border-b border-l border-green-500/30 rounded-bl-full" />
            <div className="absolute bottom-[1.5%] left-[1.5%] w-[2%] aspect-square border-t border-r border-green-500/30 rounded-tr-full" />
            <div className="absolute bottom-[1.5%] right-[1.5%] w-[2%] aspect-square border-t border-l border-green-500/30 rounded-tl-full" />

            {/* goals */}
            <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-[14%] h-[2%] border-t border-l border-r border-green-400/60 bg-green-900/30" />
            <div className="absolute left-1/2 -translate-x-1/2 top-0 w-[14%] h-[2%] border-b border-l border-r border-green-400/60 bg-green-900/30" />
          </div>

          {/* players — draggable, FIFA-style dynamic lineup */}
          <div ref={pitchRef} className="absolute inset-0">
            {lineup.map((playerId, i) => {
              const slotDef = slots[i];
              const playerState = get(playerId);
              const club = clubs.find((c) => c.id === playerState.clubId);
              const color = ROLE_COLORS[slotDef.role];
              const isSpinning = !!spinning[playerId];
              const hasData = !!playerState.clubId;
              const isActive = live?.idx === i;
              const top = isActive ? live!.top : slotDef.top;
              const left = isActive ? live!.left : slotDef.left;

              return (
                <motion.div
                  key={playerId}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: isActive ? 1.15 : 1 }}
                  transition={{ opacity: { delay: i * 0.03, duration: 0.3 }, scale: { type: "spring", stiffness: 200, damping: 20 } }}
                  className="absolute z-10"
                  style={{
                    top: `${top}%`,
                    left: `${left}%`,
                    x: "-50%",
                    y: "-50%",
                    transition: isActive
                      ? "none"
                      : "left 0.35s cubic-bezier(0.2, 0.8, 0.2, 1), top 0.35s cubic-bezier(0.2, 0.8, 0.2, 1)",
                    zIndex: isActive ? 40 : undefined,
                  }}
                >
                  <button
                    onClick={() => {
                      if (draggedRef.current) return;
                      if (hasData) openPicker(playerId);
                      else startGacha(playerId);
                    }}
                    onPointerDown={(e) => onPointerDownSlot(e, i)}
                    onPointerMove={onPointerMoveSlot}
                    onPointerUp={onPointerUpSlot}
                    onPointerCancel={onPointerUpSlot}
                    className="cursor-grab active:cursor-grabbing group relative flex items-center justify-center touch-none select-none"
                  >
                    <span
                      className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] font-black px-1 py-[1px] rounded leading-none z-10"
                      style={{ backgroundColor: color, color: "#000" }}
                    >
                      {slotDef.label}
                    </span>
                    <div
                      className="relative flex flex-col items-center justify-center rounded-xl border-[2.5px] bg-slate-950/85 transition-all duration-200 w-[52px] h-[52px] sm:w-[56px] sm:h-[56px] group-hover:scale-110 group-hover:z-20 group-hover:shadow-xl"
                      style={{ borderColor: color, boxShadow: `0 0 16px ${color}20` }}
                    >
                      {isSpinning ? (
                        <GachaSlot
                          spinning
                          items={clubs.map((c) => c.name)}
                          result={null}
                          renderItem={(item) => (
                            <span className="text-[10px] font-bold text-white">{clubLabel(String(item))}</span>
                          )}
                          size={34}
                        />
                      ) : hasData ? (
                        <>
                          <span className="text-base leading-none">{club?.flag}</span>
                          <span className="text-[8px] font-black mt-px leading-none sm:text-[9px]" style={{ color }}>
                            {clubLabel(club?.name || "")}
                          </span>
                          <span className="text-[9px] font-bold text-slate-200 truncate max-w-[52px] leading-tight sm:text-[10px]">
                            {playerState.name || "Pemain ?"}
                          </span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={15} className="text-white/30 group-hover:text-white/60 transition-colors" />
                          <span className="text-[8px] text-white/30 font-bold mt-px uppercase tracking-wider group-hover:text-white/60 transition-colors">
                            Gacha
                          </span>
                        </>
                      )}
                    </div>
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* legend */}
      <div className="flex flex-wrap justify-center gap-5 text-xs font-bold text-slate-400">
        {Object.entries(ROLE_COLORS).map(([role, color]) => (
          <span key={role} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
            {role === "GK" ? "Goalkeeper" : role === "DEF" ? "Defender" : role === "MID" ? "Midfielder" : "Forward"}
          </span>
        ))}
      </div>

      {/* actions */}
      <div className="flex flex-wrap justify-center gap-3">
        <Button size="md" onClick={spinAll}>
          <Sparkles size={18} /> Auto Spin Semua
        </Button>
        <Button
          size="md"
          variant="secondary"
          onClick={() => lineup.forEach((id) => { if (get(id).clubId) spin(id); })}
        >
          Respin Terisi
        </Button>
        <Button size="md" variant="danger" onClick={resetAll}>
          <X size={18} /> Reset Pitch
        </Button>
      </div>

      {/* slot-machine gacha modal */}
      <GachaModal
        open={!!gacha}
        phase={gacha?.phase ?? "spin"}
        result={gacha?.result ?? null}
        title={gacha ? get(gacha.slotId).name || "Player" : undefined}
      />

      {/* name picker modal */}
      <AnimatePresence>
        {pickerFor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
            onClick={() => setPickerFor(null)}
          >
            <motion.div
              initial={{ scale: 0.92, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 20 }}
              className="bg-slate-900 border border-slate-600 rounded-2xl p-6 w-full max-w-md space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-slate-100">
                Nama pemain untuk slot{" "}
                <span className="text-green-400">
                  {formation.positions.find((p) => p.id === pickerFor)?.label}
                </span>
              </h3>
              <input
                autoFocus
                value={pickerName}
                onChange={(e) => setPickerName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && assignName()}
                placeholder="Contoh: Messi"
                className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-xl text-slate-100 focus:outline-none focus:border-green-400"
              />
              <div className="flex gap-2 justify-end">
                <Button variant="secondary" onClick={() => setPickerFor(null)}>Batal</Button>
                <Button onClick={assignName}><UserPlus size={18} /> Pasang</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-center text-sm text-slate-500">
        Klik slot untuk gacha klub + bendera, klik lagi untuk isi nama pemain. Seret pemain ke posisi/slot lain untuk bertukar posisi otomatis (seperti FIFA).
      </p>
    </div>
  );
}