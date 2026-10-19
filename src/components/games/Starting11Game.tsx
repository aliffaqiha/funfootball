"use client";

import { useState, useEffect, useMemo, useCallback, useRef, useId } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, X, Sparkles, ChevronDown, ChevronRight, Loader2, ShieldAlert, Dices } from "lucide-react";
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
  from: "exact" | "club";
}

interface PickResponse {
  club: { id: string; name: string; flag: string | null; key: string };
  year: number | null;
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
      { id: "lam",  label: "LAM", role: "MID", row: 2, col: 2 },
      { id: "cam",  label: "CAM", role: "MID", row: 2, col: 0 },
      { id: "ram",  label: "RAM", role: "MID", row: 2, col: 6 },
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
      { id: "cam", label: "CAM", role: "MID", row: 2, col: 0 },
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

const ROLE_TEXT: Record<string, string> = {
  GK: "Goalkeeper",
  DEF: "Defender",
  MID: "Midfielder",
  FWD: "Forward",
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
  const [mounted, setMounted] = useState(false);
  const [formationId, setFormationId] = useState("4-3-3");
  const [formationOpen, setFormationOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  const formation = useMemo(
    () => FORMATIONS.find((f) => f.id === formationId) ?? FORMATIONS[0],
    [formationId]
  );

  const [data, setData] = useState<Record<string, { clubId: string | null; name: string; year: number | null }>>({});
  const [spinning, setSpinning] = useState<Record<string, boolean>>({});
  const [pickSlot, setPickSlot] = useState<string | null>(null);
  const [nomineesBySlot, setNomineesBySlot] = useState<Record<string, PickNominee[]>>({});
  const [picking, setPicking] = useState(false);
  const [pickErr, setPickErr] = useState(false);
  const [randTick, setRandTick] = useState(0);
  const [lineup, setLineup] = useState<string[]>(() => FORMATIONS[0].positions.map((p) => p.id));
  const pitchRef = useRef<HTMLDivElement | null>(null);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const pickerTitleId = useId();
  const gachaTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const gachaLockedRef = useRef(false);

  const clearGachaTimers = useCallback(() => {
    gachaTimersRef.current.forEach(clearTimeout);
    gachaTimersRef.current = [];
    gachaLockedRef.current = false;
  }, []);

  useEffect(() => clearGachaTimers, [clearGachaTimers]);

  useEffect(() => {
    if (!pickSlot) return;
    const panel = pickerRef.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusableSelector =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const getFocusable = () =>
      Array.from(panel?.querySelectorAll<HTMLElement>(focusableSelector) ?? []).filter(
        (element) => element.getAttribute("aria-hidden") !== "true"
      );
    (getFocusable()[0] ?? panel)?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setPickSlot(null);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = getFocusable();
      if (focusable.length === 0) {
        event.preventDefault();
        panel?.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !panel?.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !panel?.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prev;
      previousFocus?.focus();
    };
  }, [pickSlot]);

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

  const get = useCallback(
    (id: string) => data[id] ?? { clubId: null, name: "", year: null },
    [data]
  );

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

    const distanceToTarget = Math.sqrt(bestD);
    const movedEnough = draggedRef.current;
    // Require the release point to be near another marker; otherwise return to
    // the original slot instead of snapping to whichever slot happens to be nearest.
    if (movedEnough && best !== drag.idx && distanceToTarget <= 6) {
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
    year: number | null;
  } | null>(null);

  const [pool, setPool] = useState<GachaPool>(STATIC_POOL);
  const clubs = pool.clubs;

  useEffect(() => {
    let active = true;
    fetch("/api/starting11")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("failed"))))
      .then((d: GachaPool) => {
        if (active && d && d.clubs && d.clubs.length > 0 && d.years && d.years.length > 0) {
          setPool(d);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

const fetchNominees = useCallback(
    async (slotId: string, clubIdOverride?: string, yearOverride?: number | null) => {
      const clubId = clubIdOverride ?? get(slotId).clubId;
      const year = yearOverride !== undefined ? yearOverride : (get(slotId).year ?? null);
      if (!clubId) return;
      setPicking(true);
      setPickErr(false);
      try {
        const params = new URLSearchParams({ club: clubId });
        if (year) params.set("year", String(year));
        const res = await fetch(`/api/starting11/pick?${params.toString()}`);
        if (!res.ok) throw new Error("failed");
        const d: PickResponse = await res.json();
        if (Array.isArray(d.nominees)) {
          setNomineesBySlot((p) => ({ ...p, [slotId]: d.nominees }));
          setRandTick((t) => t + 1);
        }
      } catch {
        setPickErr(true);
      } finally {
        setPicking(false);
      }
    },
    [get]
  );

  const openPicker = useCallback(
    (slotId: string, clubIdOverride?: string, yearOverride?: number | null) => {
      setPickSlot(slotId);
      if (!nomineesBySlot[slotId]) {
        void fetchNominees(slotId, clubIdOverride, yearOverride);
      }
    },
    [fetchNominees, nomineesBySlot]
  );

  // gacha: pilih klub dulu, lalu tahun valid untuk klub itu (fallback pool.years)
  const startGacha = useCallback((slotId: string) => {
    if (gachaLockedRef.current || !clubs.length) return;
    gachaLockedRef.current = true;
    playSpin();
    setGacha({ slotId, phase: "spin", result: null, year: null });
    setSpinning((p) => ({ ...p, [slotId]: true }));
    const spinTimer = setTimeout(() => {
      const club = clubs[Math.floor(Math.random() * clubs.length)];
      const clubYears = pool.yearsByClub?.[club.id] ?? [];
      const year =
        clubYears.length > 0
          ? clubYears[Math.floor(Math.random() * clubYears.length)]
          : pool.years.length > 0
            ? pool.years[Math.floor(Math.random() * pool.years.length)]
            : null;
      setData((p) => ({
        ...p,
        [slotId]: { clubId: club.id, name: "", year },
      }));
      setSpinning((p) => ({ ...p, [slotId]: false }));
      setGacha({ slotId, phase: "done", result: club, year });
      playCorrect();
      void fetchNominees(slotId, club.id, year);
      const modalTimer = setTimeout(() => {
        setGacha(null);
        openPicker(slotId, club.id, year);
        gachaLockedRef.current = false;
      }, 4000);
      gachaTimersRef.current.push(modalTimer);
    }, 2600);
    gachaTimersRef.current.push(spinTimer);
  }, [clubs, pool.years, pool.yearsByClub, openPicker, fetchNominees]);

  // 1 tombol gacha independen — isi 1 slot kosong secara acak
  const gachaNext = () => {
    const empty = lineup.filter((id) => !get(id).clubId);
    if (empty.length === 0) return;
    const slotId = empty[Math.floor(Math.random() * empty.length)];
    startGacha(slotId);
  };

  // role yang tidak punya slot kosong (belum ada nama) → kandidatnya diblok
  const fullRoles = useMemo(() => {
    const totals: Record<PickNominee["role"], number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
    const filled: Record<PickNominee["role"], number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
    lineup.forEach((id, index) => {
      const role = slots[index]?.role;
      if (!role) return;
      totals[role]++;
      if (get(id).name) filled[role]++;
    });
    return Object.fromEntries(
      (Object.keys(totals) as PickNominee["role"][]).map((r) => [r, filled[r] >= totals[r]])
    ) as Record<PickNominee["role"], boolean>;
  }, [slots, lineup, get]);

  // nama pemain yang sudah di-pick → tidak boleh terpilih ulang
  const pickedNames = useMemo(() => {
    const s = new Set<string>();
    Object.values(data).forEach((d) => {
      if (d.name) s.add(d.name);
    });
    return s;
  }, [data]);

  const pickNominee = (slotId: string, nominee: PickNominee) => {
    const isReplacingInSameRole = slots[lineup.indexOf(slotId)]?.role === nominee.role;
    const isCurrentPlayer = get(slotId).name === nominee.name;
    if (!nominee.name || (fullRoles[nominee.role] && !isReplacingInSameRole) || (pickedNames.has(nominee.name) && !(isCurrentPlayer && isReplacingInSameRole))) return;
    const clubId = get(slotId).clubId;
    const year = get(slotId).year;
    // tempatkan otomatis ke slot pertama dari role sang pemain yang belum punya nama
    const sourceIndex = lineup.indexOf(slotId);
    const sourceRole = sourceIndex >= 0 ? slots[sourceIndex]?.role : undefined;
    const targetId = sourceRole === nominee.role
      ? slotId
      : lineup.find((id, index) => slots[index]?.role === nominee.role && !get(id).name);
    if (!targetId) return;
    setData((p) => {
      const next = {
        ...p,
        [targetId]: {
          clubId: p[targetId]?.clubId ?? clubId,
          name: nominee.name,
          year: p[targetId]?.year ?? year,
        },
      };
      // satu gacha = satu pemain: bila slot undian tadi tidak terpakai dan belum ada nama, bersihkan lagi
      if (targetId !== slotId && !p[slotId]?.name) {
        next[slotId] = { clubId: null, name: "", year: null };
      }
      return next;
    });
    setPickSlot(null);
    playCorrect();
  };

  const resetAll = () => {
    clearGachaTimers();
    setData({});
    setSpinning({});
    setGacha(null);
    setPickSlot(null);
    setNomineesBySlot({});
    setLineup(formation.positions.map((p) => p.id));
  };

  const cancelGacha = () => {
    const slotId = gacha?.slotId;
    clearGachaTimers();
    if (slotId) setSpinning((previous) => ({ ...previous, [slotId]: false }));
    setGacha(null);
  };

  const changeFormation = (id: string) => {
    if (id === formationId) {
      setFormationOpen(false);
      return;
    }
    const hasProgress =
      Object.values(data).some((entry) => entry.clubId || entry.name) ||
      !!gacha ||
      lineup.some((slotId, index) => slotId !== formation.positions[index]?.id);
    if (hasProgress && !window.confirm("Ganti formasi? Semua pilihan pemain dan hasil gacha saat ini akan dihapus.")) return;
    clearGachaTimers();
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
                            <motion.span
                              key={playerState.name || "kosong"}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.35, ease: "easeInOut" }}
                              className="block text-[9px] font-bold text-slate-100 text-center leading-[1.2] break-words line-clamp-2 sm:text-[10px]"
                            >
                              {playerState.name || "Pilih pemain"}
                            </motion.span>
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
            {ROLE_TEXT[role]}
          </span>
        ))}
      </div>

      {/* slot-machine gacha modal */}
      <GachaModal
        open={!!gacha}
        phase={gacha?.phase ?? "spin"}
        result={gacha?.result ?? null}
        year={gacha?.year ?? null}
        title={gacha ? (gacha.year ? `Tahun ${gacha.year}` : gacha?.result?.name) : undefined}
        pool={pool}
        onClose={cancelGacha}
      />

      {/* nominee picker modal: 4 candidates (GK/DEF/MID/FWD) matching club+year */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {pickSlot && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 overflow-y-auto"
                onClick={() => setPickSlot(null)}
              >
            <motion.div
              ref={pickerRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={pickerTitleId}
              tabIndex={-1}
              initial={{ scale: 0.96, y: 24 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 24 }}
              transition={{ type: "spring", stiffness: 260, damping: 26 }}
              className="bg-slate-900 border border-slate-700 rounded-t-3xl sm:rounded-2xl shadow-2xl p-5 sm:p-6 w-full sm:max-w-lg max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-700/60 shrink-0">
                <div className="min-w-0">
                  <h3 id={pickerTitleId} className="text-lg sm:text-xl font-black text-slate-100">
                    Pilih Pemain
                  </h3>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="max-w-[14rem] truncate px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-[11px] font-bold text-slate-200">
                      {clubs.find((c) => c.id === get(pickSlot).clubId)?.name ?? "Tanpa klub"}
                    </span>
                    {get(pickSlot).year && (
                      <span className="px-2 py-0.5 rounded-md bg-green-500/15 border border-green-500/30 text-[11px] font-bold text-green-300">
                        {get(pickSlot).year}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-md bg-slate-800/60 border border-slate-700/60 text-[11px] font-bold text-slate-400">
                      {slots.find((s) => s.id === pickSlot)?.label ?? "Slot"}
                    </span>
                    {get(pickSlot).name && (
                      <span className="truncate text-[11px] font-bold text-slate-500">
                        ganti: {get(pickSlot).name}
                      </span>
                    )}
                  </div>
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
                <div className="min-h-0 flex-1 overflow-y-auto py-4 space-y-2.5">
                  {(() => {
                    const currentName = get(pickSlot).name;
                    const candidates = (nomineesBySlot[pickSlot] ?? []).filter(
                      (n) => n.name && (!pickedNames.has(n.name) || (n.name === currentName && slots[lineup.indexOf(pickSlot)]?.role === n.role))
                    );
                    const rawNominees = nomineesBySlot[pickSlot] ?? [];
                    if (candidates.length === 0) {
                      const allEmpty = rawNominees.length > 0 && rawNominees.every((n) => !n.name);
                      if (allEmpty) {
                        return (
                          <div className="flex flex-col items-center gap-3 py-8 text-slate-500">
                            <Sparkles size={24} className="text-slate-600" />
                            <span className="text-sm font-bold text-center">
                              Tidak ada pemain untuk klub &amp; tahun ini.
                            </span>
                            <Button
                              variant="secondary"
                              onClick={() => {
                                const id = pickSlot;
                                setPickSlot(null);
                                setData((p) => ({
                                  ...p,
                                  [id]: { clubId: null, name: "", year: null },
                                }));
                                setNomineesBySlot((p) => {
                                  const next = { ...p };
                                  delete next[id];
                                  return next;
                                });
                                startGacha(id);
                              }}
                            >
                              Gacha Ulang
                            </Button>
                          </div>
                        );
                      }
                      return (
                        <div className="flex flex-col items-center gap-2 py-8 text-slate-500">
                          <Sparkles size={24} className="text-slate-600" />
                          <span className="text-sm font-bold">
                            Semua kandidat sudah di-pick.
                          </span>
                          <span className="text-xs">Tutup lalu gacha lagi.</span>
                        </div>
                      );
                    }
                    return candidates.map((n, i) => {
                      const full = fullRoles[n.role];
                      const canReplaceHere = slots[lineup.indexOf(pickSlot)]?.role === n.role;
                      const blocked = !n.name || (full && !canReplaceHere);
                      return (
                        <motion.button
                          key={`${randTick}-${n.role}`}
                          initial={{ opacity: 0, y: 10, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ duration: 0.3, delay: i * 0.07, ease: "easeIn" }}
                          disabled={blocked}
                          onClick={() => pickNominee(pickSlot, n)}
                          title={full && !canReplaceHere ? "Posisi ini sudah penuh" : undefined}
                          className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all cursor-pointer ${
                            blocked
                              ? "bg-slate-900/40 border-slate-800 opacity-45 cursor-not-allowed"
                              : "bg-slate-800/60 border-slate-700 hover:border-green-400/70 hover:bg-slate-800 active:scale-[0.99]"
                          }`}
                        >
                          <span
                            className="w-11 h-11 shrink-0 grid place-items-center rounded-lg text-[11px] font-black"
                            style={{
                              backgroundColor: `${ROLE_COLORS[n.role]}1f`,
                              color: ROLE_COLORS[n.role],
                              boxShadow: `inset 0 0 0 1px ${ROLE_COLORS[n.role]}55`,
                            }}
                          >
                            {n.label}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm font-bold text-slate-100 leading-snug break-words line-clamp-2">
                              {n.name || "— kosong —"}
                            </span>
                            <span className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: ROLE_COLORS[n.role] }}
                              />
                              {ROLE_TEXT[n.role]}
                              <span className="text-slate-600">·</span>
                              {full && !canReplaceHere
                                ? "Posisi penuh"
                                : n.from === "exact"
                                ? "tepat tahun & klub"
                                : "pernah di klub"}
                            </span>
                          </span>
                          <ChevronRight
                            size={16}
                            className={`shrink-0 ${blocked ? "text-slate-700" : "text-slate-500"}`}
                          />
                        </motion.button>
                      );
                    });
                  })()}
                  <div className="pt-3 border-t border-slate-700/60">
                    <p className="text-[11px] text-slate-500 text-center">
                      Kandidat diambil dari klub &amp; tahun hasil gacha. Tekan{" "}
                      <span className="text-slate-400 font-bold">Esc</span> untuk menutup.
                    </p>
                  </div>
                </div>
              )}
</motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
          document.body
        )}

      <p className="text-center text-sm text-slate-500">
        Tekan <span className="text-green-400 font-bold">Gacha Pemain</span> untuk mengundi tahun + klub dan mengisi 1 slot, lalu pilih salah satu dari 4 kandidat pemain (kiper, bek, gelandang, penyerang) yang pernah bermain di klub pada tahun itu. Klik pemain untuk mengganti kandidat. Seret pemain ke posisi/slot lain untuk bertukar posisi otomatis (seperti FIFA).
      </p>
    </div>
  );
}
