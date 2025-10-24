"use client";
import { createContext, useContext, useState, PropsWithChildren } from "react";
type Mode = "guest" | "captain";
const Ctx = createContext<{mode: Mode; setMode: (m: Mode)=>void} | null>(null);
export function PortModeProvider({ children }: PropsWithChildren) {
  const [mode, setMode] = useState<Mode>("guest");
  return <Ctx.Provider value={{ mode, setMode }}>{children}</Ctx.Provider>;
}
export function usePortMode() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePortMode must be used within PortModeProvider");
  return ctx;
}
