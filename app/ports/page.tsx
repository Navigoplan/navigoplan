"use client";

import { PortModeProvider, usePortMode } from "@/components/ports/PortModeContext";
import ModeSwitch from "@/components/ports/ModeSwitch";
import PortCardGuest from "@/components/ports/PortCardGuest";
import PortCardCaptain from "@/components/ports/PortCardCaptain";
import { usePorts } from "@/lib/ports/usePorts";
import type { Port } from "@/lib/ports/ports";

function View() {
  const { results, q, setQ, filters, setFilters } = usePorts();
  const { mode } = usePortMode();

  const onTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) =>
    setFilters((f) => ({ ...f, type: e.target.value || undefined }));

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Ionian Ports &amp; Anchorages</h1>
        <ModeSwitch />
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search (Gaios, Gouvia, Preveza…)"
          className="rounded-xl border p-2 md:col-span-2"
        />

        <select
          value={filters.area ?? ""}
          onChange={(e) => setFilters((f) => ({ ...f, area: e.target.value || undefined }))}
          className="rounded-xl border p-2"
        >
          <option value="">All areas</option>
          <option>Corfu</option>
          <option>Paxoi</option>
          <option>Lefkada</option>
          <option>Meganisi</option>
          <option>Cephalonia</option>
          <option>Ithaca</option>
          <option>Epirus coast</option>
          <option>Diapontia</option>
        </select>

        <select value={filters.type ?? ""} onChange={onTypeChange} className="rounded-xl border p-2">
          <option value="">All types</option>
          <option value="marina">Marina</option>
          <option value="harbour">Harbour</option>
          <option value="anchorage">Anchorage</option>
          <option value="pier">Pier</option>
          <option value="fuel">Fuel</option>
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {results.map((p: Port) =>
          mode === "guest" ? <PortCardGuest key={p.id} p={p} /> : <PortCardCaptain key={p.id} p={p} />
        )}
      </div>
    </div>
  );
}

export default function PortsPage() {
  return (
    <PortModeProvider>
      <View />
    </PortModeProvider>
  );
}
