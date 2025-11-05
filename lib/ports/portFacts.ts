/* ========= Port Facts Master =========
   Used by CaptainCrewToolkit & QuickFacts
   Sources: Sea Guide / Port Authority notes / OSM / Wikidata / internal notes
   Policy: Strict-truth. If an official VHF is not stable/announced, we leave "—".
   ===================================== */

export type PortHazard = { label: string; note?: string; sev?: 0 | 1 | 2 }; // sev 0=info,1=warn,2=alert

export type PortFact = {
  vhf?: string;                         // official marina/port working channel (if stably published)
  marina?: string;
  anchorage?: { holding?: string; notes?: string };
  shelter?: string;
  exposure?: string;
  hazards?: PortHazard[];
  notes?: string[];
};

/* ========= Main Facts Dataset ========= */
const FACTS: Record<string, PortFact> = {
  /* ======== SARONIC (strict-truth seed) ======== */

  Alimos: {
    vhf: "71", // Alimos Marina working channel
    marina: "Alimos Marina",
    notes: [
      "Μεγάλη charter βάση — έντονο turnover Παρασκευή/Σάββατο.",
      "Fuel/water με ραντεβού — επικοινωνία με Port Office στο VHF 71.",
    ],
    hazards: [
      { label: "Traffic density", sev: 1, note: "Πολύς διάπλους/ελιγμοί στη λεκάνη." },
      { label: "Ferry/ship wash", sev: 1, note: "Σαρωνικός: διερχόμενα προκαλούν κυματισμό." },
    ],
  },

  Aegina: {
    vhf: "12", // Λιμεναρχείο Αίγινας
    anchorage: {
      holding: "sand/mud",
      notes: "Μέτρια έως καλή κράτηση· απόφυγε weed patches & ράμπα ferry.",
    },
    exposure: "Ferry wash στην είσοδο λιμένα",
    hazards: [
      { label: "Traffic density", sev: 1, note: "Συχνές αφίξεις/αναχωρήσεις." },
      { label: "Ferry wash", sev: 1 },
    ],
    notes: [
      "Γνωστή για τα φιστίκια Αίγινας και τον Ναό της Αφαίας.",
    ],
  },

  Agistri: {
    vhf: "—", // δεν υπάρχει σταθερά ανακοινωμένο marina channel
    anchorage: { holding: "sand", notes: "Καλή κράτηση σε SW όρμους (π.χ. Απονήσω/Δραγονέρα)." },
    shelter: "Καλή ανάλογα με τον όρμο",
    exposure: "Ν–ΝΔ σε ορισμένα σημεία",
    hazards: [{ label: "Limited depth", sev: 1, note: "Ρηχά σε τμήματα της Σκάλας." }],
    notes: ["Μικρά κρηπιδώματα — συχνά προτιμότερος ο όρμος."],
  },

  Poros: {
    vhf: "12", // Λιμεναρχείο Πόρου
    anchorage: { holding: "sand/weed", notes: "Russian Bay & γύρω όρμοι. Δοκίμασε 2x για set αν πέσεις σε weed." },
    shelter: "Πολύ καλή από μελτέμι",
    exposure: "Όριο ταχύτητας & ρεύματα στο κανάλι",
    hazards: [
      { label: "Cross current", sev: 1, note: "Ρεύματα στο κανάλι — κράτα χαμηλή ταχύτητα." },
      { label: "Speed limit", sev: 0 },
      { label: "Weed patches", sev: 0 },
    ],
    notes: ["Ιδανικό για ανεφοδιασμό/προμήθειες."],
  },

  Hydra: {
    vhf: "—", // δεν υπάρχει σταθερό dedicated marina channel (τοπικές οδηγίες/Port Police επί τόπου)
    anchorage: { holding: "rock/sand", notes: "Μανδράκι/Βίδι: βαθιά, συχνό wake." },
    hazards: [
      { label: "Tight harbor", sev: 2, note: "Πολύ στενός χώρος — συχνά «σταυρωτές» άγκυρες." },
      { label: "Surge", sev: 1, note: "Wake/κυματισμός από διερχόμενα." },
    ],
    notes: [
      "Εξαιρετικά περιορισμένες θέσεις — άφιξη πολύ νωρίς, long lines & extra fenders.",
    ],
  },

  Spetses: {
    vhf: "—",
    anchorage: {
      holding: "sand/weed",
      notes: "Όρμος Μπαλτίζα: καλή λύση με tender. Προτίμησε καθαρό άμμο.",
    },
    exposure: "Ανάλογα με θέση· μελτέμι ριπές",
    hazards: [
      { label: "Surge", sev: 1, note: "Κυματισμός στο παλιό λιμάνι (Δάπια)." },
      { label: "Tight maneuvering", sev: 1 },
    ],
  },

  "Porto Cheli": {
    vhf: "—",
    anchorage: {
      holding: "mud/sand",
      notes: "Πολύ καλό κράτημα — εκτεταμένος ασφαλής κόλπος.",
    },
    shelter: "Πολύ καλή κάλυψη περιμετρικά",
    hazards: [
      { label: "Chain overlaps", sev: 1, note: "Πολύς κόσμος στο αγκυροβόλιο: προσοχή σε αλυσίδες." },
      { label: "Shallow edges", sev: 1 },
    ],
    notes: ["Ιδανικό για αναμονή μελτεμιού/ήρεμη νύχτα."],
  },

  Ermioni: {
    vhf: "—",
    anchorage: { holding: "mud/sand", notes: "Καλή κράτηση εντός κόλπου." },
    shelter: "Καλή εκτός νοτιά",
    exposure: "Ν–ΝΑ",
    hazards: [
      { label: "Limited berths", sev: 0 },
      { label: "Swell with southerlies", sev: 1 },
    ],
  },

  Lavrio: {
    vhf: "—", // (λιμάνι/ιδιωτικές εγκαταστάσεις έχουν ίδια/εσωτερικά κανάλια — βάλε όταν επιβεβαιωθεί)
    notes: ["Κόμβος για Κυκλάδες. Έλεγχος ανεφοδιασμού πριν απόπλου."],
  },

  /* ======== CYCLADES (kept from your file, tweaked for clarity) ======== */

  Mykonos: {
    vhf: "—",
    marina: "Tourlos",
    anchorage: { holding: "sand", notes: "Ρηχά & ριπές με μελτέμι." },
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
    anchorage: { holding: "sand/weed", notes: "Καλή προστασία B–ΒΔ." },
    hazards: [
      { label: "Ferry wash", sev: 1 },
      { label: "Meltemi seas", sev: 2 },
    ],
  },

  Milos: {
    vhf: "—",
    anchorage: {
      holding: "sand/rock",
      notes: "Ρηχά έξω από κολπίσκους — προσοχή, ειδικά στο Kleftiko.",
    },
    exposure: "Ανοικτή σε W–SW swell",
  },

  Syros: {
    vhf: "—",
    notes: ["Ερμούπολη: αστικό περιβάλλον/ανεφοδιασμός — μελτέμι side gusts."],
  },

  Serifos: {
    vhf: "—",
    anchorage: { holding: "sand", notes: "Λιβάδι — καλή κράτηση." },
  },

  Sifnos: {
    vhf: "—",
    anchorage: { holding: "sand", notes: "Κάμαρες/Βαθύ — καλά αγκυροβόλια." },
  },

  Kea: {
    vhf: "—",
    anchorage: { holding: "sand/weed", notes: "Καρθαία/Βούρκάρι: προτίμησε καθαρό άμμο." },
  },

  Kythnos: {
    vhf: "—",
    anchorage: { holding: "sand/weed", notes: "Κολώνα/Μεριχάς — δοκίμασε set σε weed." },
  },

  /* ======== (Placeholders ready for truth updates) ======== */

  Corfu: { vhf: "—", notes: ["Ιόνιο — καλές αγκυροβολίες, συχνά ήπια θάλασσα."] },
  Paxos: { vhf: "—", notes: ["Λάκκα/Γάιος — προστατευμένα νερά, προσοχή σε mooring density."] },
  Lefkada: { vhf: "—", notes: ["Κανάλια/γέφυρα — πρόγραμμα διέλευσης." ] },
  Zakynthos: { vhf: "—", notes: ["Ναυάγιο: απαγορεύσεις/ζώνες ασφαλείας εποχικά."] },
};

/* ========= Utility: normalize & lookup ========= */
function normalize(s: string) {
  return s.trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

export function getPortFacts(name: string): PortFact | undefined {
  if (!name) return undefined;
  const key = normalize(name);
  const direct = Object.keys(FACTS).find((k) => normalize(k) === key);
  return direct ? FACTS[direct] : undefined;
}

export const PORT_FACTS_DATA = FACTS;
