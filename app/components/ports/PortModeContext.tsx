"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type Mode = "guest" | "captain";
type Ctx = { mode: Mode; setMode: (m: Mode) => void; toggle: () => void };

const Ctx = createContext<Ctx | null>(null);

export function PortModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>("guest");
  const toggle = () => setMode((m) => (m === "guest" ? "captain" : "guest"));
  return <Ctx.Provider value={{ mode, setMode, toggle }}>{children}</Ctx.Provider>;
}

export function usePortMode() {
  const c = useContext(Ctx);
  if (!c) throw new Error("usePortMode must be used inside PortModeProvider");
  return c;
}
