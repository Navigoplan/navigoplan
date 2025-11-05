/* ========= Port Facts Master =========
   Used by CaptainCrewToolkit & QuickFacts
   Source: Sea Guide / OSM / Wikidata / internal notes
   ===================================== */

export type PortHazard = { label: string; note?: string; sev?: 0 | 1 | 2 }; // sev 0=info,1=warn,2=alert

export type PortFact = {
  vhf?: string;
  marina?: string;
  anchorage?: { holding?: string; notes?: string };
  shelter?: string;
  exposure?: string;
  hazards?: PortHazard[];
  notes?: string[];
};

/* ========= Main Facts Dataset ========= */
const FACTS: Record<string, PortFact> = {
  Alimos: {
    vhf: "71",
    marina: "Alimos Marina",
    notes: [
      "Πολύ traffic — charter turnover Παρασκευή/Σάββατο.",
      "Fuel berth μόνο με ραντεβού / Port Office call on VHF 71.",
    ],
  },
  Aegina: {
    vhf: "12",
    anchorage: {
      holding: "sand/mud",
      notes: "Μέτρια έως καλή κράτηση· αποφυγή weed patches.",
    },
    exposure: "Ferry wash στην είσοδο λιμένα",
    hazards: [
      { label: "Traffic density", sev: 1 },
      { label: "Ferry wash", sev: 1 },
    ],
  },
  Agistri: {
    vhf: "—",
    anchorage: { holding: "sand", notes: "Καλή κράτηση στο SW μέρος." },
    shelter: "Από Β-ΒΑ",
    exposure: "Νότιοι",
  },
  Poros: {
    vhf: "12",
    anchorage: { holding: "sand/weed", notes: "Δοκίμασε δύο φορές για set." },
    shelter: "Από W-NW",
    exposure: "SE ριπές",
    hazards: [
      { label: "Cross current", sev: 1 },
      { label: "Weed patches", sev: 1 },
    ],
  },
  Hydra: {
    vhf: "12",
    anchorage: { holding: "rock/sand", notes: "Περιορισμένος χώρος, surge." },
    hazards: [
      { label: "Tight harbor", sev: 2, note: "Πολύ περιορισμένοι ελιγμοί." },
      { label: "Surge", sev: 2, note: "Από ferries και traffic." },
    ],
  },
  "Porto Cheli": {
    vhf: "—",
    anchorage: {
      holding: "mud/sand",
      notes: "Εξαιρετικό κράτημα· προσοχή σε αλυσίδες άλλων σκαφών.",
    },
    shelter: "Από όλους εκτός Α-ΝΑ",
    hazards: [
      { label: "Shallow edges", sev: 1 },
      { label: "Chain overlaps", sev: 1 },
    ],
  },
  Spetses: {
    vhf: "—",
    anchorage: {
      holding: "sand/weed",
      notes: "Patchy weed· δοκίμασε σε καθαρό άμμο.",
    },
    exposure: "Meltemi SE–E",
  },
  Mykonos: {
    vhf: "—",
    marina: "Tourlos",
    anchorage: { holding: "sand", notes: "Ρηχά, ριπές από Meltemi." },
    hazards: [
      { label: "Meltemi gusts", sev: 2 },
      { label: "Ferry wash", sev: 1 },
    ],
  },
  Paros: {
    vhf: "—",
    anchorage: { holding: "sand", notes: "Καλή κράτηση στη Naoussa Bay." },
    hazards: [
      { label: "Meltemi funneling", sev: 2, note: "Ανάμεσα Πάρου–Νάξου." },
    ],
  },
  Naxos: {
    vhf: "—",
    anchorage: { holding: "sand/weed", notes: "Καλή προστασία Β-ΒΔ." },
    hazards: [
      { label: "Ferry wash", sev: 1 },
      { label: "Meltemi seas", sev: 2 },
    ],
  },
  Milos: {
    vhf: "—",
    anchorage: {
      holding: "sand/rock",
      notes: "Προσοχή σε ρηχά έξω από κολπίσκους, ειδικά στο Kleftiko.",
    },
    exposure: "Ανοικτή σε W–SW swell",
  },
};

/* ========= Utility: normalize & lookup ========= */
function normalize(s: string) {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export function getPortFacts(name: string): PortFact | undefined {
  if (!name) return undefined;
  const key = normalize(name);
  const direct = Object.keys(FACTS).find((k) => normalize(k) === key);
  return direct ? FACTS[direct] : undefined;
}

export const PORT_FACTS_DATA = FACTS;
