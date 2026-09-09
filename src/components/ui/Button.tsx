"use client";

import { ReactNode, ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "success" | "ghost";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-green-500 text-slate-950 hover:bg-green-400 border-green-400",
  secondary: "bg-slate-800 text-slate-100 hover:bg-slate-700 border-slate-600",
  danger: "bg-red-600 text-white hover:bg-red-500 border-red-400",
  success: "bg-emerald-500 text-slate-950 hover:bg-emerald-400 border-emerald-400",
  ghost: "bg-transparent text-slate-300 hover:bg-slate-800 border-slate-700",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg" | "xl";
  children: ReactNode;
}

export default function Button({
  variant = "primary",
  size = "md",
  children,
  className = "",
  ...props
}: ButtonProps) {
  const sizes =
    size === "xl"
      ? "px-8 py-5 text-2xl rounded-2xl"
      : size === "lg"
        ? "px-6 py-4 text-xl rounded-xl"
        : size === "sm"
          ? "px-3 py-2 text-sm rounded-lg"
          : "px-4 py-3 text-base rounded-xl";
  return (
    <button
      className={`border font-bold tracking-wide shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-95 hover:scale-[1.03] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 ${sizes} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}