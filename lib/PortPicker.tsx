"use client";

import { useMemo, useState } from "react";
import type React from "react";
import { toPickerOptions, type PortCore, type PickerOption } from "@/lib/portsDisplay";

/**
 * PortPicker
 * - Δείχνει ΜΟΝΟ την ονομασία (displayLabel) στο dropdown
 * - Κάνει αναζήτηση σε name + aliases (όχι στα facts)
 *
 * Πέρνα του το ports[] από όπου ήδη τα φορτώνεις (usePorts / merged dataset).
 */

type Props = {
  ports: PortCore[];                // [{ id, name, aliases?, region?, type? }, ...]
  value?: string;                   // selected port id
  onChange: (id: string) => void;
  placeholder?: string;
  maxResults?: number;              // default 50
  className?: string;
};

export default function PortPicker({
  ports,
  value,
  onChange,
  placeholder,
  maxResults = 50,
  className,
}: Props) {
  const [query, setQuery] = useState<string>("");

  // ports -> options με ΜΟΝΟ displayLabel
  const options: PickerOption[] = useMemo(() => toPickerOptions(ports), [ports]);

  const filtered: PickerOption[] = useMemo(() => {
    if (!query) return options.slice(0, maxResults);
    const q = query.toLowerCase();
    return options
      .filter((o: PickerOption) => o.searchText.includes(q))
      .slice(0, maxResults);
  }, [options, query, maxResults]);

  const selected: PickerOption | undefined = value
    ? options.find((o: PickerOption) => o.value === value)
    : undefined;

  return (
    <div className={["relative", className].filter(Boolean).join(" ")}>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder ?? "Search port…"}
        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand-gold"
        aria-label="Search ports"
        autoComplete="off"
      />

      {/* Dropdown */}
      {(
        query !== "" || filtered.length > 0
      ) && (
        <div
          className="absolute z-50 mt-1 w-full max-h-72 overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg"
          role="listbox"
        >
          {filtered.length === 0 && (
            <div className="px-4 py-3 text-sm text-slate-500">No results</div>
          )}

          {filtered.map((o: PickerOption) => (
            <button
              key={o.value}
              className="block w-full text-left px-4 py-2 text-sm hover:bg-slate-50"
              role="option"
              aria-selected={o.value === selected?.value}
              onClick={() => {
                onChange(o.value);
                setQuery(o.label); // γεμίζει το input με ΜΟΝΟ το όνομα
              }}
              type="button"
            >
              {/* ⚠️ Εμφανίζουμε ΜΟΝΟ το label (displayLabel) */}
              {o.label}
            </button>
          ))}
        </div>
      )}

      {/* Hidden field αν χρειάζεται σε form submit */}
      {selected && <input type="hidden" name="portId" value={selected.value} />}
    </div>
  );
}
