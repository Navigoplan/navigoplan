/* ========= Port Facts Master =========
   Used by CaptainCrewToolkit & QuickFacts
   Source: Sea Guide / OSM / Wikidata / official marina sites / internal notes
   ===================================== */

export type PortHazard = { label: string; note?: string; sev?: 0 | 1 | 2 }; // sev 0=info,1=warn,2=alert

export type PortFact = {
  vhf?: string;                                 // primary working channel (marina/Port Auth)
  vhfVerified?: boolean;                        // true when verified against official doc/site
  marina?: string;                              // marina/port name
  anchorage?: { holding?: string; notes?: string };
  shelter?: string;                             // from which winds it shelters
  exposure?: string;                            // to which winds/swell it’s exposed
  hazards?: PortHazard[];                       // local hazards / seamanship notes
  notes?: string[];                             // misc operational notes
  sources?: string[];                           // provenance (URLs or refs)
};

/* ========= Main Facts Dataset =========
   NOTE:
   - Hazards are conservative/seed level; expand with local charts/NTM.
   - Feel free to rename keys to match your canonical names in ports.v1.json.
*/
const FACTS: Record<string, PortFact> = {
  /* ======== SARONIC ======== */
  Alimos: {
    vhf: "71",
    vhfVerified: true,
    marina: "Alimos Marina",
    notes: [
      "Πολύ traffic σε change-over Παρασκευή/Σάββατο.",
      "Fuel berth κατόπιν συνεννόησης / Port Office VHF 71."
    ],
    sources: [
      "Official: alimos-marina.gr → VHF CH.71" // 
    ]
  },
  Aegina: {
    vhf: "12",
    vhfVerified: false,
    anchorage: { holding: "sand/mud", notes: "Καλή κράτηση· απόφυγε weed patches." },
    exposure: "Ferry wash στην είσοδο λιμένα",
    hazards: [
      { label: "Traffic density", sev: 1 },
      { label: "Ferry wash", sev: 1, note: "Είσοδος/έξοδος ferries" }
    ],
    sources: ["Sea Guide (scan provided)"]
  },
  Agistri: {
    vhf: "—",
    anchorage: { holding: "sand", notes: "Καλή κράτηση (SW τμήμα)." },
    shelter: "Β–ΒΑ",
    exposure: "Ν–ΝΔ"
  },
  Poros: {
    vhf: "12",
    vhfVerified: false,
    anchorage: { holding: "sand/weed", notes: "Patchy· δοκίμασε δύο φορές για set." },
    shelter: "W–NW",
    exposure: "SE ριπές στο στενό",
    hazards: [
      { label: "Cross current", sev: 1, note: "Ρεύματα στο στενό" },
      { label: "Weed patches", sev: 1 }
    ],
    sources: ["Sea Guide (scan provided)"]
  },
  Hydra: {
    vhf: "12",
    vhfVerified: false,
    anchorage: { holding: "rock/sand", notes: "Πολύ περιορισμένος χώρος, surge." },
    hazards: [
      { label: "Tight harbor", sev: 2, note: "Περιορισμένοι ελιγμοί σε στενό λιμένα" },
      { label: "Surge", sev: 2, note: "Από ferries/traffic" }
    ],
    sources: ["Sea Guide (scan provided)"]
  },
  Spetses: {
    vhf: "—",
    anchorage: { holding: "sand/weed", notes: "Patchy weed· προτίμησε καθαρό άμμο." },
    exposure: "Μελτέμι με ριπές στα δεσίματα"
  },
  Ermioni: {
    vhf: "—",
    anchorage: { holding: "mud/sand", notes: "Γενικά καλή κράτηση." },
    shelter: "Β–ΒΔ",
    exposure: "Α–ΝΑ"
  },
  "Porto Cheli": {
    vhf: "—",
    anchorage: { holding: "mud/sand", notes: "Πολύ καλή κράτηση· κίνδυνος overlap αλυσίδων." },
    shelter: "Καλό υπό παντού εκτός Α–ΝΑ μελτεμιών",
    hazards: [{ label: "Chain overlaps", sev: 1 }, { label: "Shallow edges", sev: 1 }]
  },
  Methana: {
    vhf: "—",
    anchorage: { holding: "mud", notes: "Καλή κράτηση." },
    shelter: "Β–Δ",
    exposure: "Α–ΝΑ"
  },
  Epidaurus: {
    vhf: "—",
    anchorage: { holding: "sand/mud", notes: "Ήρεμο αγκυροβόλιο." },
    shelter: "Γενικά καλό",
    exposure: "Ν"
  },

  /* ======== CYCLADES ======== */
  Lavrio: {
    vhf: "9",
    vhfVerified: true,
    marina: "Olympic Marine",
    notes: ["Base για Cyclades· συχνός Β-ΒΑ άνεμος στην έξοδο."],
    sources: [
      "Official: olympicmarine.gr → VHF 9", // 
      "Olympic Marine PDF (contact details): VHF Channel 9" // :contentReference[oaicite:2]{index=2}
    ]
  },
  Kea: {
    vhf: "—",
    anchorage: { holding: "sand/weed", notes: "Καλύτερα στα καθαρά patches." },
    exposure: "Meltemi"
  },
  Kythnos: {
    vhf: "—",
    anchorage: { holding: "sand/weed", notes: "Κρατά καλά στα sand tongues." },
    exposure: "Meltemi"
  },
  Syros: {
    vhf: "—",
    anchorage: { holding: "sand", notes: "Προστατευμένα κολπάκια (Ν)." },
    hazards: [{ label: "Ferry wash (Ermoupoli)", sev: 1 }]
  },
  Mykonos: {
    vhf: "12",
    vhfVerified: false, // προσωρινό μέχρι official Port Authority link
    marina: "Tourlos",
    anchorage: { holding: "sand", notes: "Ρηχά, ριπές Meltemi." },
    hazards: [{ label: "Meltemi gusts", sev: 2 }, { label: "Ferry wash", sev: 1 }],
    sources: [
      "CruisersWiki: Mykonos port control CH12 (non-official)", // 
      "Greek Marinas Guide (context listing)" // 
    ]
  },
  Paros: {
    vhf: "12",
    vhfVerified: false,
    anchorage: { holding: "sand", notes: "Naoussa: καλή προστασία· πρόσεχε ferry wash." },
    hazards: [{ label: "Meltemi funneling", sev: 2, note: "Κανάλι Πάρου–Νάξου." }],
    sources: [
      "SailingEurope: Paros CH12 (non-official)" // 
    ]
  },
  Naxos: {
    vhf: "12",
    vhfVerified: false,
    anchorage: { holding: "sand/weed", notes: "Καλύτερη προστασία Β–ΒΔ." },
    hazards: [{ label: "Ferry wash", sev: 1 }, { label: "Meltemi seas", sev: 2 }],
    sources: [
      "SailingEurope: Naxos CH12 (non-official)" // 
    ]
  },
  Ios: {
    vhf: "—",
    anchorage: { holding: "sand", notes: "Καλό holding." },
    exposure: "Meltemi"
  },
  Santorini: {
    vhf: "—",
    anchorage: { holding: "variable", notes: "Βαθιά νερά / moorings σε μαρίνες." },
    hazards: [{ label: "Depth / swell", sev: 2 }]
  },
  Milos: {
    vhf: "—",
    anchorage: { holding: "sand/rock", notes: "Ρηχά έξω από κολπίσκους (π.χ. Kleftiko)." },
    exposure: "W–SW swell"
  },
  Sifnos: {
    vhf: "—",
    anchorage: { holding: "sand", notes: "Καλό holding." },
    exposure: "Μελτέμι"
  },
  Serifos: {
    vhf: "—",
    anchorage: { holding: "sand/weed", notes: "Καλύτερα σε καθαρό άμμο." },
    exposure: "Μελτέμι"
  },
  Andros: { vhf: "—", exposure: "Strong Meltemi funneling (B–ΒΑ)" },
  Tinos: { vhf: "—", exposure: "Μελτέμι/ριπές στο λιμάνι" },
  Folegandros: {
    vhf: "—",
    anchorage: { holding: "sand", notes: "Μικροί κολπίσκοι." },
    exposure: "Νότιοι/δυτικοί"
  },
  Kimolos: {
    vhf: "—",
    anchorage: { holding: "sand", notes: "Ρηχά προσεκτικά." },
    exposure: "W–SW swell"
  },
  Koufonisia: {
    vhf: "—",
    anchorage: { holding: "sand", notes: "Πολύ καθαρά νερά, καλό holding." },
    exposure: "Μελτέμι"
  },
  Amorgos: {
    vhf: "—",
    anchorage: { holding: "sand/weed", notes: "Μελτέμι δημιουργεί swell." },
    exposure: "B–ΒΑ"
  },

  /* ======== IONIAN ======== */
  Corfu: {
    vhf: "69",
    vhfVerified: true,
    marina: "D-Marin Gouvia",
    anchorage: { holding: "mud/sand", notes: "Καλή κράτηση σε κολπίσκους." },
    sources: [
      "Official: d-marin.com/marinas/gouvia → VHF 69" // 
    ]
  },
  Paxos: {
    vhf: "—",
    anchorage: { holding: "sand/weed", notes: "Lakka/Gaios καλά αγκυροβόλια." },
    exposure: "ΝΔ swell"
  },
  Antipaxos: {
    vhf: "—",
    anchorage: { holding: "sand", notes: "Καλοκαιρινή πολυκοσμία." }
  },
  Lefkada: {
    vhf: "69",
    vhfVerified: true,
    marina: "Lefkada Marina",
    anchorage: { holding: "mud/sand", notes: "Κανάλι/γέφυρα με ωράρια." },
    hazards: [
      { label: "Canal traffic", sev: 1 },
      { label: "Swing bridge schedule", sev: 1, note: "Άνοιγμα ανά ώρα (09:00–22:00) + 03:00, subject to NTM." }
    ],
    notes: [
      "Lefkada swing bridge: συχνά ανά ώρα 09:00–22:00 + 03:00. Επιβεβαίωση με Port Authority πριν την προσέγγιση."
    ],
    sources: [
      "Official: d-marin.com/marinas/lefkas → VHF 69", // 
      "Δήμος Λευκάδας (ανακοίνωση ωραρίων γέφυρας, 2024)" // 
    ]
  },
  Preveza: { vhf: "—", anchorage: { holding: "mud/sand" } },
  Meganisi: { vhf: "—", anchorage: { holding: "mud/sand", notes: "Βαθιές αγκυροβολίες." } },
  Kalamos: { vhf: "—", anchorage: { holding: "sand", notes: "Καλή κάλυψη." } },
  Kastos: { vhf: "—", anchorage: { holding: "sand", notes: "Μικρό νησί, περιορισμένες θέσεις." } },
  Ithaca: { vhf: "—", anchorage: { holding: "mud/sand", notes: "Βαθιά κολπάκια." } },
  Kefalonia: { vhf: "—", anchorage: { holding: "sand/weed", notes: "Assos/Fiscardo." } },
  Zakynthos: {
    vhf: "—",
    anchorage: { holding: "sand", notes: "ΝΔ ακτές με swell." },
    exposure: "W–SW swell"
  },

  /* ======== DODECANESE ======== */
  Rhodes: {
    vhf: "—",
    anchorage: { holding: "sand", notes: "Μαρίνες/δεσίματα διαθέσιμα." },
    hazards: [{ label: "Meltemi seas outside", sev: 1 }]
  },
  Symi: {
    vhf: "—",
    anchorage: { holding: "mud/sand", notes: "Στενός οικισμός· ριπές." },
    hazards: [{ label: "Tight harbor", sev: 2 }]
  },
  Kos: { vhf: "—", anchorage: { holding: "sand" } },
  Kalymnos: { vhf: "—", anchorage: { holding: "sand/rock" } },
  Patmos: { vhf: "—", anchorage: { holding: "sand", notes: "Καλή κάλυψη στον όρμο." } },
  Leros: { vhf: "—", anchorage: { holding: "sand/mud" } },

  /* ======== SPORADES ======== */
  Volos: { vhf: "—", anchorage: { holding: "mud/sand" } },
  Skiathos: {
    vhf: "—",
    anchorage: { holding: "sand", notes: "Busy ferries." },
    hazards: [{ label: "Ferry wash", sev: 1 }]
  },
  Skopelos: { vhf: "—", anchorage: { holding: "sand/weed" } },
  Alonissos: {
    vhf: "—",
    anchorage: { holding: "sand", notes: "Θαλάσσιο πάρκο· κανονισμοί προστασίας." },
    hazards: [{ label: "Marine park restrictions", sev: 1 }]
  },

  /* ======== NORTH AEGEAN (incl. Halkidiki) ======== */
  Thessaloniki: { vhf: "—", anchorage: { holding: "mud/sand" } },
  "Nea Moudania": { vhf: "—", anchorage: { holding: "sand" } },
  "Sani Marina": { vhf: "—", marina: "Sani Resort Marina" },
  Nikiti: { vhf: "—", anchorage: { holding: "sand" } },
  Vourvourou: { vhf: "—", anchorage: { holding: "sand", notes: "Πολύ ρηχά κοντά στις ακτές." } },
  "Ormos Panagias": { vhf: "—", anchorage: { holding: "sand" } },
  Ouranoupoli: {
    vhf: "—",
    anchorage: { holding: "sand", notes: "Αγ. Όρος ζώνη — περιορισμοί." },
    hazards: [{ label: "Mt. Athos restricted waters", sev: 1 }]
  },
  Kavala: { vhf: "—", anchorage: { holding: "sand/mud" } },
  Thassos: { vhf: "—", anchorage: { holding: "sand", notes: "Καλές αγκυροβολίες Ν." } },
  Samothraki: { vhf: "—", anchorage: { holding: "sand/rock" }, exposure: "NE blows" },
  Lemnos: { vhf: "—", anchorage: { holding: "sand" }, exposure: "Meltemi" },
  Lesvos: { vhf: "—", anchorage: { holding: "sand/mud" } },
  Chios: { vhf: "—", anchorage: { holding: "sand/rock" } },
  Samos: { vhf: "—", anchorage: { holding: "sand" }, exposure: "E–NE" },
  Ikaria: { vhf: "—", anchorage: { holding: "sand/rock" }, exposure: "Ισχυροί άνεμοι/ριπές" },

  /* ======== CRETE ======== */
  Chania: {
    vhf: "—",
    anchorage: { holding: "sand", notes: "Swell στην είσοδο με Δυτικούς." },
    exposure: "W–NW swell"
  },
  Rethymno: { vhf: "—", anchorage: { holding: "sand" }, exposure: "Βόρειοι" },
  Heraklion: {
    vhf: "—",
    anchorage: { holding: "sand" },
    hazards: [{ label: "Commercial traffic", sev: 1 }]
  },
  "Agios Nikolaos": { vhf: "—", anchorage: { holding: "sand/mud" } },
  Sitia: { vhf: "—", anchorage: { holding: "sand" }, exposure: "E–NE" }
};

/* ========= Aliases (EN/GR/alt spellings) =========
   Map any alias -> canonical FACTS key (after normalize)
*/
const ALIASES: Record<string, string> = {
  // Saronic
  "αιγινα": "Aegina",
  "αγκιστρι": "Agistri",
  "πορος": "Poros",
  "υδρα": "Hydra",
  "σπετσες": "Spetses",
  "ερμιονη": "Ermioni",
  "πορτοχελι": "Porto Cheli",
  "μεθανα": "Methana",
  "επιδαυρος": "Epidaurus",
  "λαυριο": "Lavrio",
  // Cyclades
  "μυκονος": "Mykonos",
  "παρος": "Paros",
  "ναξος": "Naxos",
  "ιoς": "Ios",
  "σαντορινη": "Santorini",
  "μηλος": "Milos",
  "σιφνος": "Sifnos",
  "σεριφος": "Serifos",
  "ανδρος": "Andros",
  "τινος": "Tinos",
  "φολεγανδρος": "Folegandros",
  "κιμωλος": "Kimolos",
  "κουφονησια": "Koufonisia",
  "αμοργος": "Amorgos",
  "συρος": "Syros",
  "κυνθος": "Kythnos",
  "κεα": "Kea",
  // Ionian
  "κερκυρα": "Corfu",
  "παξοι": "Paxos",
  "αντιπαξοι": "Antipaxos",
  "λευκαδα": "Lefkada",
  "πρεβεζα": "Preveza",
  "μεγανησι": "Meganisi",
  "καλαμος": "Kalamos",
  "καστος": "Kastos",
  "ιθακη": "Ithaca",
  "κεφαλονια": "Kefalonia",
  "ζακυνθος": "Zakynthos",
  // Dodecanese
  "ροδος": "Rhodes",
  "συμη": "Symi",
  "κως": "Kos",
  "καλυμνος": "Kalymnos",
  "πατμος": "Patmos",
  "λερος": "Leros",
  // Sporades
  "βολος": "Volos",
  "σκιαθος": "Skiathos",
  "σκοπελος": "Skopelos",
  "αλoννησος": "Alonissos",
  // North Aegean / Halkidiki
  "θεσσαλονικη": "Thessaloniki",
  "νeα μoυδανια": "Nea Moudania",
  "σανη": "Sani Marina",
  "νικητη": "Nikiti",
  "βουρβουρου": "Vourvourou",
  "ορμος παναγιας": "Ormos Panagias",
  "ουρανούπολη": "Ouranoupoli",
  "καβαλα": "Kavala",
  "θασος": "Thassos",
  "σαμοθρακη": "Samothraki",
  "λημνος": "Lemnos",
  "λεσβος": "Lesvos",
  "χιος": "Chios",
  "σαμος": "Samos",
  "ικαρια": "Ikaria",
  // Crete
  "χανια": "Chania",
  "ρεθυμνο": "Rethymno",
  "ηρακλειο": "Heraklion",
  "αγιος νικολαος": "Agios Nikolaos",
  "σιτια": "Sitia"
};

/* ========= Utility: normalize & lookup ========= */
function normalize(s: string) {
  return s.trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}
function resolveKey(name: string): string | undefined {
  const key = normalize(name);
  for (const k of Object.keys(FACTS)) if (normalize(k) === key) return k; // direct
  const aliased = ALIASES[key];
  if (aliased) return aliased; // alias
  return undefined;
}

export function getPortFacts(name: string): PortFact | undefined {
  if (!name) return undefined;
  const k = resolveKey(name);
  return k ? FACTS[k] : undefined;
}

export const PORT_FACTS_DATA = FACTS;
