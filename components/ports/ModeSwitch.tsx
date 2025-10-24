"use client";
import { usePortMode } from "@/lib/ports/PortModeContext";
export default function ModeSwitch() {
  const { mode, setMode } = usePortMode();
  return (
    <div className="inline-flex rounded-full border p-1 bg-white shadow">
      <button onClick={()=>setMode("guest")} className={`px-4 py-1 rounded-full text-sm ${mode==="guest"?"bg-black text-white":"text-black"}`}>VIP / Guest</button>
      <button onClick={()=>setMode("captain")} className={`px-4 py-1 rounded-full text-sm ${mode==="captain"?"bg-black text-white":"text-black"}`}>Captain / Crew</button>
    </div>
  );
}
