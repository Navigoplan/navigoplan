"use client";

import { useMemo, useState } from "react";
import type React from "react";

/* ========= Local types ========= */

export type PortCore = {
  id: string;
  name: string;                           // canonical
  aliases?: string[];                     // e.g. ["Agia Marina (Aegina)", "Agia Marina"]
  region?: string;
  type?: "port" | "marina" | "anchorage";
};

type PickerOption = {
  value: string;                          // port id
  label: string;                          // ONLY display name (no facts)
  searchText: string;                     // name + aliases (lowercased)
};

/* ========= Helpers (με “καθάρισμα” aliases) ========= */

// λέξεις/μοτίβα που προδίδουν ότι η παρένθεση είναι ΣΧΟΛΙΟ (facts) και όχι τοποθεσία
const BANNED_IN_PARENS = [
  "traffic", "change-over", "crowd", "crowded", "meltemi", "swell",
  "fuel", "water", "power", "taxi", "shops", "supermarket", "notes",
  "π","πολύ","παρασκευή","σάββατο","άνεμο","κύμα","πρόσεχε","γεμάτο",
  "συνωστισ", "καύσωνας", "βοήθ", "τηλέφ", "προσοχή"
];

// true αν η παρένθεση μοιάζει με “τοποθεσία” (π.χ. Aegina / Αίγινα), όχι σχόλιο
function isCleanParenthesis(inner: string): boolean {
  const s = inner.trim().toLowerCase();

  // κόβουμε αν περιέχει απαγορευμένες λέξεις
  if (BANNED_IN_PARENS.some(k => s.includes(k))) return false;

  // κόβουμε αν έχει σύμβολα που συνήθως δεν υπάρχουν σε τοπωνύμια
  if (/[0-9!:;.,/\\#@%&*=_+<>?|]/.test(s)) return false;

  // αποδεχόμαστε μικρά/μεσαία μήκη (ένα ή δύο λέξεις συνήθως: "Aegina", "Naxos")
  const words = s.split(/\s+/).filter(Boolean);
  if (words.length > 3) return false;
  if (s.length > 24) return false;

  return true;
}

function extractCleanParenAlias(aliases?: string[]): string | undefined {
  if (!aliases?.length) return;

  // 1) προτίμηση σε aliases που ήδη είναι "Όνομα (Νησί)" και η παρένθεση είναι καθαρή
  for (const a of aliases) {
    const m = a.match(/^(.*)\((.+)\)\s*$/);
    if (!m) continue;
    const inner = m[2];
    if (isCleanParenthesis(inner)) return a.trim();
  }

  // 2) fallback: επιστρέφουμε το πρώτο alias που ΔΕΝ περιέχει “κακά” μοτίβα
  for (const a of aliases) {
    const low = a.toLowerCase();
    if (!BANNED_IN_PARENS.some(k => low.includes(k))) {
      return a.trim();
    }
  }

  return;
}

// Τελική επιλογή label:
// - Αν το name έχει καθαρές παρενθέσεις, κρατάμε αυτό.
// - Αλλιώς, αν υπάρχει καθαρό alias με παρενθέσεις, το προτιμάμε.
// - Αλλιώς, απλά το name (χωρίς σχόλια).
function chooseDisplayName(p: PortCore): string {
  const name = p.name.trim();

  const nameMatch = name.match(/^(.*)\((.+)\)\s*$/);
  if (nameMatch && isCleanParenthesis(nameMatch[2])) {
    return name;
  }

  const cleanAlias = extractCleanParenAlias(p.aliases);
  if (cleanAlias) return cleanAlias;

  // έσχατο fallback: κόψε ό,τι ύποπτη παρένθεση υπάρχει στο name
  if (nameMatch && !isCleanParenthesis(nameMatch[2])) {
    return nameMatch[1].trim();
  }

  return name;
}

function buildSearchText(p: PortCore): string {
  const aliasStr = (p.aliases ?? []).join(" ");
  return `${p.name} ${aliasStr} ${p.region ?? ""}`.toLowerCase().trim();
}

function toPickerOptions(ports: PortCore[]): PickerOption[] {
  return ports.map((p) => ({
    value: p.id,
    label: chooseDisplayName(p), // ONLY clean display name
    searchText: buildSearchText(p),
  }));
}

/* ===================== Component ===================== */

type Props = {
  ports: PortCore[];                // raw ports (no facts here)
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

      {(query !== "" || filtered.length > 0) && (
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
                setQuery(o.label); // ΜΟΝΟ καθαρό όνομα
              }}
              type="button"
            >
              {o.label}
            </button>
          ))}
        </div>
      )}

      {selected && <input type="hidden" name="portId" value={selected.value} />}
    </div>
  );
}
