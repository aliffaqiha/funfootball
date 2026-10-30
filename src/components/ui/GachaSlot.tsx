"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface GachaSlotProps {
  spinning: boolean;
  items: (string | number)[];
  result: string | number | null;
  renderItem: (item: string | number) => ReactNode;
  size?: number;
}

export default function GachaSlot({
  spinning,
  items,
  result,
  renderItem,
  size = 96,
}: GachaSlotProps) {
  const [displayItems, setDisplayItems] = useState<(string | number)[]>([]);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    if (spinning) setDisplayItems(shuffleForSpin(itemsRef.current));
  }, [spinning]);

  const reelItems = displayItems.length ? [...displayItems, ...displayItems] : [];

  return (
    <div
      role="status"
      aria-live={spinning ? "off" : "polite"}
      aria-atomic="true"
      aria-label={spinning ? "Sedang mengacak pemain" : result !== null ? `Hasil: ${result}` : "Belum ada hasil"}
      className="relative overflow-hidden rounded-xl border-2 border-slate-600 bg-slate-950 flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {spinning ? (
        <motion.div
          animate={{ y: [0, -size * displayItems.length] }}
          transition={{
            duration: 1.4,
            ease: "linear",
            repeat: Infinity,
            repeatType: "loop",
          }}
          className="flex flex-col items-center"
        >
          {reelItems.map((item, i) => (
            <div
              key={i}
              className="flex items-center justify-center"
              style={{ height: size }}
            >
              {renderItem(item)}
            </div>
          ))}
        </motion.div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={String(result)}
            initial={{ rotateY: 0, opacity: 1 }}
            animate={{ rotateY: 0, opacity: 1 }}
            exit={{ rotateY: 360, opacity: 0 }}
            className="flex items-center justify-center"
          >
            {result !== null ? (
              renderItem(result)
            ) : (
              <span className="text-slate-600" style={{ fontSize: size * 0.3 }}>
                ?
              </span>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

function shuffleForSpin(items: (string | number)[]): (string | number)[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
