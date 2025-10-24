"use client";
import { createContext, useContext, useState, ReactNode } from "react";

type Mode = "guest" | "captain";
type Ctx = { mode: Mode; setMode: (m: Mode) => void };

const PortModeCtx = createContext<Ctx | null>(null);

export function PortModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>("guest");
  return <PortModeCtx.Provider value={{ mode, setMode }}>{children}</PortModeCtx.Provider>;
}

export function usePortMode() {
  const ctx = useContext(PortModeCtx);
  if (!ctx) throw new Error("usePortMode must be used inside <PortModeProvider>");
  return ctx;
}
