"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, X, Sparkles, ChevronDown, Loader2, RefreshCw, ShieldAlert, Dices } from "lucide-react";
import staticPool from "@/data/starting11-pool.json";
import { playCorrect, playSpin } from "@/lib/sound";
import GachaSlot from "@/components/ui/GachaSlot";
import GachaModal from "@/components/ui/GachaModal";
import Button from "@/components/ui/Button";
import type { GachaPool, PoolClub } from "@/lib/types";

const STATIC_POOL: GachaPool = staticPool;

interface PickNominee {
  role: "GK" | "DEF" | "MID" | "FWD";
  label: string;
  name: string;
  from: "exact" | "club" | "country" | "any";
}

interface PickResponse {
  club: { id: string; name: string; flag: string | null; key: string };
  country: { code: string; name: string; flag: string | null } | null;
  nominees: PickNominee[];
}

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
  "Ajax": "AJA", "Benfica": "BEN", "Porto": "POR", "AS Roma": "ROM",
  "Marseille": "MAR", "AS Monaco": "MON", "Bayer Leverkusen": "LEV",
  "RB Leipzig": "RBL", "Newcastle United": "NEW", "Fenerbahçe": "FEN",
  "Flamengo": "FLA", "River Plate": "RIV",
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
  const [pickSlot, setPickSlot] = useState<string | null>(null);
  const [nomineesBySlot, setNomineesBySlot] = useState<Record<string, PickNominee[]>>({});
  const [picking, setPicking] = useState(false);
  const [pickErr, setPickErr] = useState(false);
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
    result: PoolClub | null;
  } | null>(null);

  const [pool, setPool] = useState<GachaPool>(STATIC_POOL);
  const clubs = pool.clubs;

  useEffect(() => {
    let active = true;
    fetch("/api/starting11")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("failed"))))
      .then((d: GachaPool) => {
        if (active && d && d.clubs && d.clubs.length > 0 && d.countries && d.countries.length > 0) {
          setPool(d);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const fetchNominees = useCallback(async (slotId: string) => {
    const clubId = get(slotId).clubId;
    if (!clubId) return;
    setPicking(true);
    setPickErr(false);
    try {
      const res = await fetch(`/api/starting11/pick?club=${encodeURIComponent(clubId)}`);
      if (!res.ok) throw new Error("failed");
      const d: PickResponse = await res.json();
      if (Array.isArray(d.nominees)) {
        setNomineesBySlot((p) => ({ ...p, [slotId]: d.nominees }));
      }
    } catch {
      setPickErr(true);
    } finally {
      setPicking(false);
    }
  }, [get]);

  const openPicker = useCallback((slotId: string) => {
    setPickSlot(slotId);
    void fetchNominees(slotId);
  }, [fetchNominees]);

  // gacha dengan modal slot-machine penuh (dipicu dari tombol independen)
  const startGacha = useCallback((slotId: string) => {
    playSpin();
    setGacha({ slotId, phase: "spin", result: null });
    setSpinning((p) => ({ ...p, [slotId]: true }));
    setTimeout(() => {
      const club = clubs[Math.floor(Math.random() * clubs.length)];
      setData((p) => ({
        ...p,
        [slotId]: { clubId: club.id, name: "" },
      }));
      setSpinning((p) => ({ ...p, [slotId]: false }));
      setGacha({ slotId, phase: "done", result: club });
      playCorrect();
      setTimeout(() => {
        setGacha(null);
        openPicker(slotId);
      }, 4200);
    }, 2600);
  }, [clubs, openPicker]);

  // 1 tombol gacha independen — isi 1 slot kosong secara acak
  const gachaNext = () => {
    const empty = lineup.filter((id) => !get(id).clubId);
    if (empty.length === 0) return;
    const slotId = empty[Math.floor(Math.random() * empty.length)];
    startGacha(slotId);
  };

  const pickNominee = (slotId: string, nominee: PickNominee) => {
    if (!nominee.name) return;
    setData((p) => ({
      ...p,
      [slotId]: { clubId: p[slotId]?.clubId ?? null, name: nominee.name },
    }));
    setPickSlot(null);
    playCorrect();
  };

  const resetAll = () => {
    setData({});
    setSpinning({});
    setGacha(null);
    setPickSlot(null);
    setNomineesBySlot({});
    setLineup(formation.positions.map((p) => p.id));
  };

  const changeFormation = (id: string) => {
    setFormationId(id);
    setFormationOpen(false);
    setData({});
    setSpinning({});
    setGacha(null);
    setPickSlot(null);
    setNomineesBySlot({});
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
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-slate-400 font-bold text-sm">
            {filledCount} / 11 pemain
          </span>
          <Button size="sm" onClick={gachaNext} disabled={filledCount >= 11}>
            <Dices size={16} /> Gacha Pemain
          </Button>
          <Button size="sm" variant="danger" onClick={resetAll}>
            <X size={16} /> Reset
          </Button>
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
                    }}
                    onPointerDown={(e) => onPointerDownSlot(e, i)}
                    onPointerMove={onPointerMoveSlot}
                    onPointerUp={onPointerUpSlot}
                    onPointerCancel={onPointerUpSlot}
                    className="group flex flex-col items-center cursor-grab active:cursor-grabbing touch-none select-none"
                  >
                    {/* role tag */}
                    <span
                      className="mb-1 px-1.5 py-[3px] rounded-full text-[8px] font-black leading-none z-10 shadow-lg"
                      style={{ backgroundColor: color, color: "#0f172a", boxShadow: `0 0 10px ${color}50` }}
                    >
                      {slotDef.label}
                    </span>

                    <div
                      className="relative flex flex-col items-center overflow-hidden rounded-xl border-[2.5px] transition-all duration-200 w-[60px] h-[66px] sm:w-[66px] sm:h-[72px] group-hover:scale-110 group-hover:z-20 group-hover:shadow-xl"
                      style={{
                        borderColor: color,
                        background: hasData ? `linear-gradient(180deg, ${color}2b 0%, rgba(2,6,23,0.92) 60%)` : "rgba(2,6,23,0.85)",
                        boxShadow: hasData ? `0 0 18px ${color}35, inset 0 0 0 rgba(0,0,0,0)` : `0 0 10px ${color}18`,
                      }}
                    >
                      {isSpinning ? (
                        <div className="flex items-center justify-center h-full">
                          <GachaSlot
                            spinning
                            items={clubs.map((c) => c.name)}
                            result={null}
                            renderItem={(item) => (
                              <span className="text-[10px] font-bold text-white">{clubLabel(String(item))}</span>
                            )}
                            size={38}
                          />
                        </div>
                      ) : hasData ? (
                        <>
                          <div className="relative z-10 flex items-center justify-center gap-1 px-1 mt-2 w-full">
                            <span
                              className="text-[8px] font-black leading-none tracking-wide rounded px-1 py-[2px]"
                              style={{ backgroundColor: color, color: "#0f172a" }}
                            >
                              {clubLabel(club?.name || "")}
                            </span>
                          </div>
                          <div className="relative z-10 w-full px-1 pb-1 mt-auto">
                            <span className="block text-[9px] font-bold text-slate-100 text-center leading-[1.2] break-words line-clamp-2 sm:text-[10px]">
                              {playerState.name || "Pilih pemain"}
                            </span>
                            {!playerState.name && (
                              <span className="block text-[7px] text-slate-400 text-center font-bold mt-0.5 animate-pulse">
                                klik untuk pilih
                              </span>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-1.5 h-full">
                          <Sparkles size={16} className="text-white/25 group-hover:text-white/50 transition-colors" />
                          <span className="text-[8px] text-white/25 font-bold uppercase tracking-wider group-hover:text-white/50 transition-colors">
                            Kosong
                          </span>
                        </div>
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

      {/* slot-machine gacha modal */}
      <GachaModal
        open={!!gacha}
        phase={gacha?.phase ?? "spin"}
        result={gacha?.result ?? null}
        title={gacha ? get(gacha.slotId).name || "Player" : undefined}
        pool={pool}
      />

      {/* nominee picker modal: 4 candidates (GK/DEF/MID/FWD) matching club+country */}
      <AnimatePresence>
        {pickSlot && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
            onClick={() => setPickSlot(null)}
          >
            <motion.div
              initial={{ scale: 0.92, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 20 }}
              className="bg-slate-900 border border-slate-600 rounded-2xl p-6 w-full max-w-md space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                    Pilih pemain
                  </h3>
                  <p className="text-sm text-slate-400 mt-1">
                    <span className="text-green-400">{get(pickSlot).name ? get(pickSlot).name : "Slot"}</span>
                    {" · "}
                    <span className="text-slate-200">
                      {clubs.find((c) => c.id === get(pickSlot).clubId)?.name ?? "—"}
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => setPickSlot(null)}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
                  aria-label="Tutup"
                >
                  <X size={20} />
                </button>
              </div>

              {picking ? (
                <div className="flex flex-col items-center justify-center gap-3 py-10 text-slate-400">
                  <Loader2 size={28} className="animate-spin" />
                  <span className="text-sm font-bold">Mencari kandidat pemain…</span>
                </div>
              ) : pickErr ? (
                <div className="flex flex-col items-center justify-center gap-3 py-8 text-amber-400">
                  <ShieldAlert size={28} />
                  <span className="text-sm font-bold">Gagal memuat kandidat.</span>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => fetchNominees(pickSlot)}>
                      Coba lagi
                    </Button>
                    <Button variant="secondary" onClick={() => setPickSlot(null)}>Batal</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {(nomineesBySlot[pickSlot] ?? []).map((n) => (
                    <button
                      key={n.role}
                      disabled={!n.name}
                      onClick={() => pickNominee(pickSlot, n)}
                      className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all cursor-pointer ${
                        n.name
                          ? "bg-slate-800/70 border-slate-600 hover:border-green-400 hover:bg-slate-800"
                          : "bg-slate-800/40 border-slate-700 opacity-50 cursor-not-allowed"
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: ROLE_COLORS[n.role] }}
                      />
                      <span className="w-24 shrink-0 text-xs font-black uppercase tracking-wide text-slate-400">
                        {n.label}
                      </span>
                      <span className="flex-1 min-w-0 font-bold text-slate-100 truncate">
                        {n.name || "— kosong —"}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 shrink-0">
                        {n.from === "exact"
                          ? "Klub & Negara"
                          : n.from === "club"
                          ? "Klub"
                          : n.from === "country"
                          ? "Negara"
                          : "Pilihan"}
                      </span>
                    </button>
                  ))}
                  <div className="flex items-center justify-between pt-1">
                    <p className="text-[11px] text-slate-500">
                      {/* hijau = pas dengan klub & negara; abu = cadangan */}
                      Kandidat acak sesuai klub & negara.
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => fetchNominees(pickSlot)}
                    >
                      <RefreshCw size={15} /> Acak lagi
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-center text-sm text-slate-500">
        Tekan <span className="text-green-400 font-bold">Gacha Pemain</span> untuk mengundi klub + negara dan mengisi 1 slot, lalu pilih salah satu dari 4 kandidat pemain (kiper, bek, gelandang, penyerang). Klik pemain untuk mengganti kandidat. Seret pemain ke posisi/slot lain untuk bertukar posisi otomatis (seperti FIFA).
      </p>
    </div>
  );
}