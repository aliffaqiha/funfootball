"use client";

import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export default function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`bg-slate-900/80 border border-slate-700 rounded-2xl shadow-xl backdrop-blur ${className}`}
    >
      {children}
    </div>
  );
}