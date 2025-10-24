"use client";

import { usePortMode } from "./PortModeContext";

export default function ModeSwitch() {
  const { mode, setMode } = usePortMode();
  return (
    <div className="inline-flex overflow-hidden rounded-xl border">
      <button
        className={`px-3 py-1 text-sm ${mode === "guest" ? "bg-black text-white" : ""}`}
        onClick={() => setMode("guest")}
      >
        VIP Guest
      </button>
      <button
        className={`px-3 py-1 text-sm ${mode === "captain" ? "bg-black text-white" : ""}`}
        onClick={() => setMode("captain")}
      >
        Captain
      </button>
    </div>
  );
}
