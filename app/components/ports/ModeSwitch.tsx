"use client";
import { usePortMode } from "@/components/ports/PortModeContext";

export default function ModeSwitch() {
  const { mode, setMode } = usePortMode();
  return (
    <div className="inline-flex items-center gap-2">
      <span className="text-sm opacity-70">View:</span>
      <select
        value={mode}
        onChange={(e) => setMode(e.target.value as "guest" | "captain")}
        className="rounded-lg border p-2"
      >
        <option value="guest">VIP Guest</option>
        <option value="captain">Captain/Crew</option>
      </select>
    </div>
  );
}
