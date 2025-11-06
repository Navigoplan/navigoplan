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
      "Official: alimos-marina.gr → VHF CH.71"
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
      "Official: olympicmarine.gr → VHF 9",
      "Olympic Marine PDF (contact details): VHF Channel 9"
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
      "CruisersWiki: Mykonos port control CH12 (non-official)",
      "Greek Marinas Guide (context listing)"
    ]
  },
  Paros: {
    vhf: "12",
    vhfVerified: false,
    anchorage: { holding: "sand", notes: "Naoussa: καλή προστασία· πρόσεχε ferry wash." },
    hazards: [{ label: "Meltemi funneling", sev: 2, note: "Κανάλι Πάρου–Νάξου." }],
    sources: [
      "SailingEurope: Paros CH12 (non-official)"
    ]
  },
  Naxos: {
    vhf: "12",
    vhfVerified: false,
    anchorage: { holding: "sand/weed", notes: "Καλύτερη προστασία Β–ΒΔ." },
    hazards: [{ label: "Ferry wash", sev: 1 }, { label: "Meltemi seas", sev: 2 }],
    sources: [
      "SailingEurope: Naxos CH12 (non-official)"
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
      "Official: d-marin.com/marinas/gouvia → VHF 69"
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
      "Official: d-marin.com/marinas/lefkas → VHF 69",
      "Δήμος Λευκάδας (ανακοίνωση ωραρίων γέφυρας, 2024)"
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
  Sitia: { vhf: "—", anchorage: { holding: "sand" }, exposure: "E–NE" },

  /* ======== PELOPONNESE – KORINTHIA ======== */
  "Corinth Harbour": {
    vhf: "12",
    vhfVerified: true,
    anchorage: { holding: "mud/sand", notes: "Βαθύς εμπορικός λιμένας, use small-craft basin N sector." },
    shelter: "Καλή υπό Ν-ΝΑ, έκθεση σε ισχυρούς ΒΑ.",
    exposure: "ΒΑ ριπές, swell από διερχόμενα.",
    hazards: [
      { label: "Rocks near mole tips", sev: 2 },
      { label: "Commercial traffic", sev: 1 },
      { label: "Surge from ferries", sev: 1 }
    ],
    notes: [
      "Προσεγγίστε με προσοχή λόγω χαμηλής βύθισης μεταξύ λιμενοβραχιόνων.",
      "Πολύ περιορισμένες θέσεις για σκάφη αναψυχής (S basin)."
    ],
    sources: ["Sea Guide Vol. 3 p. 04"]
  },
  "Korinth Canal (Isthmus)": {
    vhf: "11, 12, 19, 21",
    vhfVerified: true,
    hazards: [
      { label: "Very strong current", sev: 2 },
      { label: "Narrow passage 52 m wide", sev: 2 },
      { label: "Steep walls — gusty katabatic winds", sev: 1 }
    ],
    notes: [
      "Speed limit ≈ 5 kn (under tow if > 15 m).",
      "Canal closes for convoys ≈ 00:00–06:00 for maintenance.",
      "Vessels call 'Corinth Canal Control' before entry (VHF 11 or 12)."
    ],
    sources: ["Sea Guide Vol. 3 p. 05"]
  },
  "Kiato Harbour": {
    vhf: "12",
    vhfVerified: true,
    anchorage: { holding: "mud/sand", notes: "Ρηχό νότιο τμήμα ≤ 2.5 m — κατάλληλο για μικρά σκάφη." },
    shelter: "Καλή υπό Ν-ΝΔ.",
    exposure: "Β-ΒΑ ριπές με μελτέμι.",
    hazards: [
      { label: "Silting near entrance", sev: 1 },
      { label: "Fishing nets close to breakwater", sev: 1 }
    ],
    notes: [
      "Είσοδος μεταξύ φάρων F G και F R.",
      "Βάθη 2–4 m, προτιμήστε ΝΑ μέρος του λιμένα."
    ],
    sources: ["Sea Guide Vol. 3 p. 07"]
  },
  "Vrachati Harbour": {
    vhf: "12",
    vhfVerified: true,
    anchorage: { holding: "sand/mud", notes: "Μικρό λιμάνι για τοπικά σκάφη." },
    shelter: "Προστασία από Ν και ΝΔ ανέμους.",
    exposure: "Ανεπαρκής προστασία από Β-ΒΑ.",
    hazards: [{ label: "Sunken rocks at N mole tip", sev: 2 }],
    notes: [
      "Προσοχή στην είσοδο — χαμηλή στάθμη και περιοχή shoals.",
      "Καλύτερα για ημερήσια στάση μόνο."
    ],
    sources: ["Sea Guide Vol. 3 p. 06"]
  },
  "Lechaion (Ancient Corinth Bay)": {
    anchorage: { holding: "mud/sand", notes: "Ρηχό αγκυροβόλιο με ισχυρά ΒΑ ρεύματα." },
    exposure: "Ανοιχτό σε ΒΑ ριπές.",
    hazards: [{ label: "Shallow ruins submerged", sev: 1 }],
    sources: ["Sea Guide Vol. 3 p. 03"]
  },
  "Vouliagmeni / Loutraki Bay": {
    vhf: "12",
    anchorage: { holding: "sand/mud", notes: "Καλή κράτηση στα 12–15 m έξω από το λιμάνι Λουτρακίου." },
    shelter: "Από Ν-ΝΔ.",
    exposure: "ΒΔ ριπές και ισχυρό swell με μελτέμι.",
    hazards: [
      { label: "Strong wind gusts through Geraneia Mts", sev: 2 },
      { label: "Surge in harbour entrance", sev: 1 }
    ],
    notes: [
      "Λιμάνι με βύθισμα έως 4 m — μόνο για μικρά σκάφη.",
      "Υπάρχει fuel και ανεφοδιασμός κοντά στην παραλία."
    ],
    sources: ["Sea Guide Vol. 3 p. 08"]
  },
  "Mavrolimni Harbour": {
    vhf: "12",
    vhfVerified: true,
    anchorage: { holding: "sand", notes: "Κρατά καλά στα 6–10 m, προσοχή στις βόρειες ριπές." },
    shelter: "Από Ν-ΝΔ ανέμους.",
    exposure: "Ανοιχτό σε Β και ΒΑ.",
    hazards: [
      { label: "Rocks at NO mole tip", sev: 1 },
      { label: "Silting in inner basin", sev: 1 }
    ],
    notes: ["Μικρό λιμάνι τοπικής χρήσης — όχι κατάλληλο για μεγάλα σκάφη."],
    sources: ["Sea Guide Vol. 3 p. 08"]
  },

  /* ======== STEREA ELLADA – ANTIKYRA / AG. ISIDOROS / NOUSSA ======== */
  "Antikyra Harbour": {
    vhf: "12",
    vhfVerified: true,
    anchorage: { holding: "mud/sand", notes: "Καλό κράτημα — ρηχά κοντά στον προβλήτα." },
    shelter: "Από Ν και Δ.",
    exposure: "Ανεμοι ΒΑ δημιουργούν swell.",
    hazards: [
      { label: "Strong gusts from mountains", sev: 2 },
      { label: "Depth variation ±0.8 m tidal", sev: 0 }
    ],
    notes: ["Νερό πέφτει 80 cm με παλίρροιες — προσοχή στην προσαρμογή γραμμών."],
    sources: ["Sea Guide Vol. 3 p. 11"]
  },
  "Agios Isidoros Harbour": {
    vhf: "—",
    anchorage: { holding: "sand", notes: "Καλό holding σε ρηχά 4–6 m." },
    shelter: "Προστασία από Ν και ΝΔ.",
    exposure: "Ανοιχτό σε ΒΑ ριπές.",
    hazards: [{ label: "Shoaling near beach", sev: 1 }],
    notes: ["Μία μόνο ταβέρνα στη στεριά."],
    sources: ["Sea Guide Vol. 3 p. 12"]
  },
  "Agios Nikolaos (Sterea Ellada)": {
    vhf: "—",
    anchorage: { holding: "sand", notes: "Βάθη 3–5 m στην είσοδο, καλή προστασία σε Ν άνεμο." },
    shelter: "Από Ν και ΝΔ.",
    exposure: "Ανοιχτό σε ΒΑ.",
    hazards: [{ label: "Silting at entrance", sev: 1 }],
    notes: [
      "Ρηχό στο εσωτερικό τμήμα· τηρείτε αποστάσεις από μονοπάτι βραχώδους παράκτιας ζώνης."
    ],
    sources: ["Sea Guide Vol. 3 p. 12"]
  },
  "Noussa Harbour": {
    vhf: "—",
    anchorage: { holding: "mud", notes: "Ρηχό και καλό για μικρά σκάφη με βύθισμα < 2 m." },
    shelter: "Από ΝΔ.",
    exposure: "Ανοιχτό σε ΒΑ άνεμο.",
    hazards: [{ label: "Strong NE gusts on approach", sev: 1 }],
    notes: ["Μόνο για αλιευτικά ή ημερήσια στάση."],
    sources: ["Sea Guide Vol. 3 p. 12"]
  },

  /* ======== STEREA ELLADA / KORINTHIA – ADDITIONS ======== */
  "Strava Cove": {
    anchorage: { holding: "sand", notes: "Μικρός κόλπος, ρηχός. Καλός μόνο για μικρά σκάφη." },
    shelter: "Από Β-ΒΔ",
    exposure: "Ανοιχτός σε Ν-ΝΑ",
    hazards: [{ label: "Rocky reef N of approach", sev: 1 }, { label: "Shoals near beach", sev: 1 }],
    notes: ["Στενός χώρος ελιγμών. Υπάρχει γλίστρα (slipway)."],
    sources: ["Sea Guide Vol. 3 p. 06"]
  },
  "Kato Assos": {
    vhf: "12",
    anchorage: { holding: "sand/mud", notes: "Μικρός λιμενίσκος (βάθη 1.5–3 m)." },
    shelter: "Από Ν τομείς",
    exposure: "ΒΑ με μελτέμι",
    hazards: [{ label: "Silting at entrance", sev: 1 }],
    notes: ["Καλύτερα για τοπικά/μικρά σκάφη. Περιορισμένες παροχές."],
    sources: ["Sea Guide Vol. 3 p. 05"]
  },
  "Loutraki Harbour": {
    vhf: "12",
    anchorage: { holding: "mud/sand", notes: "Εξωτερικά της εισόδου 12–15 m, καλό κράτημα." },
    shelter: "Από Ν-ΝΔ",
    exposure: "Β-ΒΔ ριπές και surge",
    hazards: [{ label: "Strong gusts from Geraneia", sev: 2 }, { label: "Surge at entrance", sev: 1 }],
    notes: ["Ρηχά τμήματα εντός. Κατάλληλο για μικρά draft."],
    sources: ["Sea Guide Vol. 3 p. 08"]
  },
  "NO Xylokastrou Harbour": {
    vhf: "12",
    marina: "Yachting Club Xylokastrou",
    anchorage: { holding: "sand/mud", notes: "Μικρή λεκάνη, ρηχή." },
    shelter: "Ν-ΝΔ",
    exposure: "ΒΑ",
    hazards: [{ label: "Shoals close to beach", sev: 1 }],
    notes: ["Περιορισμένες θέσεις επισκεπτών."],
    sources: ["Sea Guide Vol. 3 p. 08"]
  },
  "Mylokopi Cove": {
    anchorage: { holding: "sand", notes: "Καλό κράτημα σε 6–10 m." },
    shelter: "Από Ν-ΝΔ",
    exposure: "Ανοιχτός σε Β-ΒΑ",
    hazards: [{ label: "Shoaling inside cove", sev: 1 }],
    notes: ["Ωραίος καιρός–άφιξη από Ν. Δεν υπάρχει προστασία σε μελτέμι."],
    sources: ["Sea Guide Vol. 3 p. 08"]
  },
  "Alepochori Harbour": {
    vhf: "12",
    anchorage: { holding: "sand/mud", notes: "Μικρός λιμένας. Αβαθή σημεία κοντά στους μώλους." },
    shelter: "Ν-ΝΔ",
    exposure: "Β-ΒΑ",
    hazards: [{ label: "Weed patches", sev: 1 }, { label: "Silting", sev: 1 }],
    notes: ["Κατάλληλο για μικρά σκάφη. Παροχές στη στεριά."],
    sources: ["Sea Guide Vol. 3 p. 09"]
  },
  "Porto Germeno (Aigosthena)": {
    anchorage: { holding: "sand", notes: "Ένα από τα καλύτερα αγκυροβόλια του Κορινθιακού." },
    shelter: "Καλή υπό Ν-ΝΔ (μέσα στον κλειστό κόλπο).",
    exposure: "Ανοιχτό σε Β-ΒΑ ριπές με μελτέμι",
    hazards: [
      { label: "Shoals near beach", sev: 1 },
      { label: "Gusts off slopes", sev: 1 }
    ],
    notes: ["Προσοχή σε λουόμενους/σημαδούρες το καλοκαίρι."],
    sources: ["Sea Guide Vol. 3 p. 09"]
  },
  "Agios Sotiras Bay": {
    anchorage: { holding: "sand", notes: "Καλό holding, αλλά περιορισμένος χώρος." },
    shelter: "Από Ν τομείς",
    exposure: "ΒΑ/Α",
    hazards: [{ label: "Swells with E winds", sev: 1 }],
    notes: ["Κατάλληλο για μικρά/ημερήσια στάση."],
    sources: ["Sea Guide Vol. 3 p. 09"]
  },
  "Paralia Saranti Harbour": {
    vhf: "—",
    anchorage: { holding: "sand", notes: "Καλό κράτημα. Βάθη 3–5 m." },
    shelter: "Από όλους πλην ισχυρών Α",
    exposure: "Α & ΑΝΕ",
    hazards: [{ label: "Rocks close W of entrance", sev: 1 }],
    notes: ["Mini-market, ταβέρνες κοντά."],
    sources: ["Sea Guide Vol. 3 p. 10"]
  },
  "Aliki Harbour (Sterea Ellada)": {
    vhf: "—",
    anchorage: { holding: "sand", notes: "Ρηχά στη Ν και Α πλευρά." },
    shelter: "Από Δ-ΝΔ",
    exposure: "Α-ΒΑ",
    hazards: [{ label: "Rocks extend in N and NE quays", sev: 2 }],
    notes: ["Σημεία βράχων στους μώλους — κρατήστε απόσταση."],
    sources: ["Sea Guide Vol. 3 p. 10"]
  },
  "Agios Vasileios Harbour": {
    vhf: "—",
    anchorage: { holding: "sand", notes: "Μικρό λιμανάκι, ρηχά σημεία." },
    shelter: "Από Ν-ΝΔ",
    exposure: "Β-ΒΑ",
    hazards: [{ label: "Swell with N winds", sev: 1 }],
    notes: ["Κίτρινες σημαδούρες παραλίας το καλοκαίρι."],
    sources: ["Sea Guide Vol. 3 p. 10"]
  },
  "Agios Ioannis (Ormos & Limeniskos)": {
    vhf: "—",
    anchorage: { holding: "sand", notes: "Καλό holding στον όρμο, 7–10 m." },
    shelter: "All round στον όρμο",
    exposure: "Έξω από τον λιμενίσκο σε ΒΑ",
    hazards: [{ label: "Silting near slip", sev: 1 }],
    notes: ["Βάθη στον λιμενίσκο 2–3 m. Χρήση από τοπικά σκάφη."],
    sources: ["Sea Guide Vol. 3 p. 12"]
  },

  /* ======== WESTERN KORINTHIAN GULF & ITEA–NAUPAKTOS REGION (pp. 15–24) ======== */
  "Aigio Harbour": {
    vhf: "12",
    anchorage: { holding: "sand/mud", notes: "Καλή κράτηση 6–10 m εκτός μώλου." },
    shelter: "Από Ν–Δ τομείς",
    exposure: "Ανοιχτό σε Β–ΒΑ",
    hazards: [{ label: "Silting inside basin", sev: 1 }],
    notes: ["ΝΟ Αιγίου και SC Sailing Club. Βάθη επαρκή για μικρά yachts.", "Κατάλληλο με ήπιο καιρό, όχι με ισχυρούς ΒΑ."],
    sources: ["Sea Guide Vol. 3 p. 16"]
  },
  "Mavra Litharia Harbour": {
    anchorage: { holding: "sand", notes: "Μικρός κόλπος, ρηχός. Κατάλληλος για μικρά draft." },
    shelter: "Από Ν–Δ",
    exposure: "Β–ΒΑ",
    hazards: [{ label: "Silting at entrance", sev: 2 }],
    notes: ["Καλύτερα για ψαροκάικα ή ημερήσια στάση. Προσοχή σε λίθους στον προσήνεμο μόλο."],
    sources: ["Sea Guide Vol. 3 p. 16"]
  },
  "Diakopto Harbour": {
    anchorage: { holding: "sand/mud", notes: "Μικρή λεκάνη με βάθη 2–3 m." },
    shelter: "Από Ν",
    exposure: "Ανοιχτό σε ΒΑ",
    hazards: [{ label: "Silting & uneven bottom", sev: 1 }],
    notes: ["Μόνο για μικρά σκάφη. Κατάλληλο για τοπική χρήση."],
    sources: ["Sea Guide Vol. 3 p. 16"]
  },
  "NC Akrata Harbour": {
    vhf: "12",
    anchorage: { holding: "sand", notes: "Καλή κράτηση, 5–7 m εκτός." },
    shelter: "Από Ν–Δ",
    exposure: "ΒΑ",
    hazards: [{ label: "Silt & stones at entrance", sev: 2 }],
    notes: ["Μικρή λεκάνη, προσοχή σε βυθισμένα εμπόδια στην είσοδο.", "Περιορισμένες θέσεις."],
    sources: ["Sea Guide Vol. 3 p. 15"]
  },
  "Itea Marina": {
    vhf: "12",
    anchorage: { holding: "mud/sand", notes: "Καλό κράτημα στον εξωτερικό χώρο, 7–10 m." },
    shelter: "Από Δ–ΝΔ",
    exposure: "Ανοιχτό σε ΒΑ ριπές",
    hazards: [{ label: "Buoys near swimming area", sev: 1 }],
    notes: ["Καλή υποδομή, ρεύμα/νερό, fuel κοντά.", "Διαχείριση: Port Fund Ιτέας."],
    sources: ["Sea Guide Vol. 3 p. 18"]
  },
  "Krissaios Gulf": {
    anchorage: { holding: "sand/mud", notes: "Αγκυροβόλιο με καλό κράτημα, 8–12 m." },
    shelter: "Από Β–ΝΔ",
    exposure: "Ανοιχτός σε Ν–ΝΑ",
    hazards: [{ label: "Strong gusts down slopes", sev: 1 }],
    notes: ["Ρεύματα προς ΝΑ–ΒΔ. Προσοχή στις ριπές από τα βουνά Γαλαξιδίου."],
    sources: ["Sea Guide Vol. 3 p. 17"]
  },
  "Galaxidi Harbour": {
    vhf: "12",
    anchorage: { holding: "mud/sand", notes: "Εξαιρετικό κράτημα, βάθη 5–8 m." },
    shelter: "Από Ν–Δ",
    exposure: "Ανοιχτό σε ΒΑ",
    hazards: [{ label: "Shallow spots near piers", sev: 1 }],
    notes: ["Όμορφο, ήσυχο λιμάνι· παροχές, ρεύμα/νερό/καύσιμα.", "Προσοχή στο άνοιγμα του λιμανιού σε ΒΑ."],
    sources: ["Sea Guide Vol. 3 pp. 19–20"]
  },
  "Kirra Harbour": {
    vhf: "12",
    anchorage: { holding: "mud/sand", notes: "Καλή κράτηση 5–8 m· ρηχά κοντά στο μόλο." },
    shelter: "Από Ν–Δ",
    exposure: "Ανοιχτό σε ΒΑ",
    hazards: [{ label: "Rocks off outer mole", sev: 2 }],
    notes: ["Μικρό, ήσυχο λιμανάκι· λίγες θέσεις, προσεκτική είσοδος."],
    sources: ["Sea Guide Vol. 3 p. 18"]
  },
  "Chania Harbour (Sterea Ellada)": {
    vhf: "12",
    anchorage: { holding: "sand", notes: "Καλή κράτηση· βάθη 3–5 m." },
    shelter: "Από όλους",
    exposure: "Ανοιχτό μόνο σε ισχυρούς ΝΑ",
    hazards: [{ label: "Silting", sev: 1 }],
    notes: ["Μικρό λιμάνι, κατάλληλο για διερχόμενα σκάφη. Προσοχή σε ρηχά."],
    sources: ["Sea Guide Vol. 3 p. 20"]
  },
  "Agios Spyridon Harbour": {
    vhf: "—",
    anchorage: { holding: "sand", notes: "Καλή κράτηση, ρηχά (2–3 m)." },
    shelter: "Από όλους πλην ισχυρών Α",
    exposure: "Ανατολικοί τομείς",
    hazards: [{ label: "Silting in corners", sev: 1 }],
    notes: ["Μικρός λιμενίσκος, βασικά εφόδια μόνο."],
    sources: ["Sea Guide Vol. 3 p. 20"]
  },
  "Vidavi Bay": {
    anchorage: { holding: "sand", notes: "Βάθη 6–10 m, καλό κράτημα." },
    shelter: "Από ΝΑ–ΑΝΕ",
    exposure: "Ανοιχτός σε ΝΔ",
    hazards: [{ label: "Shoals at pier base", sev: 1 }],
    notes: ["Καλή προστασία από ΒΑ ανέμους. Βασικά εφόδια κοντά."],
    sources: ["Sea Guide Vol. 3 p. 21"]
  },
  "Eratini Harbour": {
    vhf: "12",
    anchorage: { holding: "mud/sand", notes: "Καλό κράτημα· βάθη 4–6 m." },
    shelter: "Από Ν–ΝΔ",
    exposure: "Ανοιχτός σε Β–ΒΑ",
    hazards: [{ label: "Rocks near N mole", sev: 2 }],
    notes: ["Προσοχή στα ρηχά κοντά στο μόλο (PLAN A).", "Κατάλληλο για μικρά σκάφη, όχι με μελτέμι."],
    sources: ["Sea Guide Vol. 3 p. 22"]
  },
  "Panormos Harbour": {
    vhf: "12",
    anchorage: { holding: "sand/mud", notes: "Καλή κράτηση, 5–10 m." },
    shelter: "Από Ν–ΝΔ",
    exposure: "Ανοιχτό σε ΒΑ",
    hazards: [{ label: "Rocks near mole", sev: 1 }],
    notes: ["Δύο μώλοι, καλό καταφύγιο σε ήπιο καιρό.", "Προσοχή στην είσοδο, ρηχά."],
    sources: ["Sea Guide Vol. 3 p. 22"]
  },
  "Trizonia Marina": {
    vhf: "12",
    anchorage: { holding: "mud", notes: "Καλή κράτηση· βάθη 5–7 m." },
    shelter: "Από όλους πλην ισχυρών ΒΑ",
    exposure: "ΒΑ",
    hazards: [
      { label: "Wrecked yacht sunk in marina", sev: 1 },
      { label: "Chains/obstacles on bottom", sev: 1 }
    ],
    notes: [
      "Απλή μαρίνα χωρίς υπηρεσίες· καλή στάση πριν το Ρίο.",
      "Fuel delivery, mini-market στο νησί. Καθαρά νερά."
    ],
    sources: ["Sea Guide Vol. 3 p. 23"]
  },
  "Glyfada Harbour (Sterea Ellada)": {
    vhf: "12",
    anchorage: { holding: "sand", notes: "Μικρός λιμενίσκος, 3–5 m." },
    shelter: "Από Ν–Δ",
    exposure: "Ανοιχτός σε ΒΑ",
    hazards: [{ label: "Shoals close to mole", sev: 1 }],
    notes: ["Ήσυχο αγκυροβόλιο για μικρά σκάφη."],
    sources: ["Sea Guide Vol. 3 p. 23"]
  },
  "Nafpaktos Harbour": {
    vhf: "12",
    anchorage: { holding: "sand/mud", notes: "Καλό κράτημα εκτός λιμένα 8–10 m." },
    shelter: "Από Ν–Δ",
    exposure: "Ανοιχτός σε ΒΑ",
    hazards: [
      { label: "Silting at entrance", sev: 2 },
      { label: "Surge with northerlies", sev: 1 }
    ],
    notes: ["Περιορισμένες θέσεις, μικρή λεκάνη. Fuel με βυτίο.", "Ιστορικό λιμάνι, όμορφη στάση, προσοχή με swell."],
    sources: ["Sea Guide Vol. 3 p. 24"]
  },
  "Monastiraki Bay": {
    anchorage: { holding: "sand", notes: "Καλή κράτηση, 6–8 m." },
    shelter: "Από Ν–Δ",
    exposure: "Ανοιχτός σε ΒΑ",
    hazards: [{ label: "Rocks near outer mole", sev: 2 }],
    notes: ["Προστασία με ήπιους ανέμους· καλό για ημερήσια στάση."],
    sources: ["Sea Guide Vol. 3 p. 24"]
  },
  "Marathias Harbour": {
    vhf: "12",
    anchorage: { holding: "sand/mud", notes: "Καλό κράτημα, βάθη 4–6 m." },
    shelter: "Από Ν–ΝΔ",
    exposure: "ΒΑ",
    hazards: [{ label: "Silting", sev: 1 }],
    notes: ["Μικρή λεκάνη, ρηχά. Κατάλληλο για μικρά σκάφη."],
    sources: ["Sea Guide Vol. 3 p. 24"]
  },

  /* ======== PATRAS–MESOLOGGI–OXIA–KYLLINI–ZAKYNTHOS REGION (pp. 25–39) ======== */
  "Rio–Antirrio": {
    vhf: "12",
    anchorage: { holding: "mud/sand", notes: "Περιοχή αναμονής πριν τη γέφυρα, καλή κράτηση 8–12 m." },
    shelter: "Από Ν–Δ",
    exposure: "Ανοιχτό σε Β–ΒΑ ριπές",
    hazards: [
      { label: "Strong currents under bridge", sev: 2 },
      { label: "Traffic separation zone", sev: 1 }
    ],
    notes: [
      "Τα ρεύματα είναι ισχυρά· τηρείται επικοινωνία με VTS Antirrio.",
      "Περιοχή αναμονής καθορισμένη· άδεια διέλευσης απαραίτητη."
    ],
    sources: ["Sea Guide Vol. 3 p. 28"]
  },
  "Agios Pantelimonas Harbour": {
    vhf: "12",
    anchorage: { holding: "sand", notes: "Καλό κράτημα 2–3 m, μικρός μόλος." },
    shelter: "Από Δ–ΝΔ",
    exposure: "Ανοιχτός σε ΒΑ",
    hazards: [{ label: "Silting at entrance", sev: 1 }],
    notes: ["Χρήση μόνο από μικρά σκάφη· βασικά supplies στο χωριό."],
    sources: ["Sea Guide Vol. 3 p. 28"]
  },
  "Makrynia Harbour": {
    anchorage: { holding: "mud", notes: "Ρηχά, < 2 m σε σημεία. Καλό κράτημα." },
    shelter: "Από Ν–ΝΔ",
    exposure: "Ανοιχτός σε ΒΑ",
    hazards: [{ label: "Shoaling at pier head", sev: 1 }],
    notes: ["Μόνο για μικρά σκάφη· ρηχό λιμανάκι."],
    sources: ["Sea Guide Vol. 3 p. 26"]
  },
  "Kato Vasilikis Harbour": {
    anchorage: { holding: "sand", notes: "Καλό κράτημα με ρηχά (2 m) κοντά στο μόλο." },
    shelter: "Από ΝΔ",
    exposure: "Ανοιχτός σε ΒΑ",
    hazards: [{ label: "Silting at entrance", sev: 1 }],
    notes: ["Χρήση κυρίως από τοπικά σκάφη."],
    sources: ["Sea Guide Vol. 3 p. 26"]
  },
  "Kryoneri Harbour": {
    vhf: "12",
    anchorage: { holding: "sand", notes: "Καλό κράτημα σε 5–7 m· ρηχό προς Α." },
    shelter: "Από ΝΔ",
    exposure: "Ανοιχτός σε ΒΑ ριπές",
    hazards: [
      { label: "Variable depths (continuous silt)", sev: 2 },
      { label: "Strong southerly swell", sev: 1 }
    ],
    notes: [
      "Συχνή εναπόθεση ιλύος· βαθιά σκάφη να αποφεύγουν.",
      "Καλή στάση σε ήπιους καιρούς."
    ],
    sources: ["Sea Guide Vol. 3 p. 29"]
  },
  "Oxia Island Anchorages": {
    anchorage: { holding: "sand/rock", notes: "Νότια πλευρά: καλή κράτηση, προστασία από ΒΑ." },
    shelter: "Από ΒΑ–ΑΝΑ",
    exposure: "Ανοιχτός σε ΝΔ",
    hazards: [
      { label: "Shallow patches off NW coast", sev: 2 },
      { label: "Strong currents between islets", sev: 1 }
    ],
    notes: [
      "Πολύ όμορφο spot, ρηχά κοντά στην ακτή.",
      "Ακατάλληλο σε ισχυρούς ΝΔ ανέμους."
    ],
    sources: ["Sea Guide Vol. 3 p. 29"]
  },
  "Paralia Kato Achaia Harbour": {
    vhf: "12",
    anchorage: { holding: "sand/mud", notes: "Καλό κράτημα εντός· ρηχά στις άκρες." },
    shelter: "Από Α–ΝΑ",
    exposure: "Ανοιχτός σε ΒΔ",
    hazards: [{ label: "Silt at entrance", sev: 1 }],
    notes: ["Μικρό λιμανάκι κατάλληλο για τοπικά σκάφη."],
    sources: ["Sea Guide Vol. 3 p. 29"]
  },
  "Mesolongi Marina": {
    vhf: "12",
    anchorage: { holding: "mud", notes: "Κράτηση εξαιρετική, κανάλι 2,5 ΝΜ προς το λιμάνι." },
    shelter: "Πλήρης εκτός ισχυρών ΝΔ",
    exposure: "ΝΔ ριπές σε εξωτερικό κανάλι",
    hazards: [
      { label: "Narrow entrance channel", sev: 2 },
      { label: "Silting in channel", sev: 2 }
    ],
    notes: [
      "Καλή προστασία, ήσυχο καταφύγιο.",
      "Ρεύμα / νερό / καύσιμα στο Marina Office."
    ],
    sources: ["Sea Guide Vol. 3 p. 30"]
  },
  "Patras Marina": {
    vhf: "12",
    anchorage: { holding: "mud/sand", notes: "Καλή κράτηση εκτός λιμένα 8–10 m." },
    shelter: "Από Ν–Δ",
    exposure: "Ανοιχτός σε Β–ΒΑ",
    hazards: [{ label: "Strong swell during NW winds", sev: 2 }],
    notes: [
      "Πολλές θέσεις, ρεύμα/νερό/καύσιμα.",
      "Κίνηση εμπορικών πλοίων· προσοχή στη σήμανση."
    ],
    sources: ["Sea Guide Vol. 3 p. 32"]
  },
  "Kyllini Harbour": {
    vhf: "12",
    anchorage: { holding: "sand/mud", notes: "Καλή κράτηση εκτός λιμένα 7–10 m." },
    shelter: "Από Ν–ΝΔ",
    exposure: "Ανοιχτός σε ΒΑ",
    hazards: [{ label: "Ferry traffic", sev: 1 }],
    notes: [
      "Εμπορικό λιμάνι, υποδομές για fuel / νερό.",
      "Καλή στάση πριν τη διάσχιση προς Ζάκυνθο."
    ],
    sources: ["Sea Guide Vol. 3 p. 32"]
  },
  "Mesolongi Channel Approach": {
    anchorage: { holding: "mud", notes: "Κανάλι ρηχό (2–3 m)· καλή κράτηση." },
    hazards: [{ label: "Silt build-up in channel", sev: 2 }],
    notes: ["Να επικοινωνείτε με Harbour Office πριν την είσοδο."],
    sources: ["Sea Guide Vol. 3 p. 30"]
  },
  "Glyfa Harbour (Peloponnese)": {
    vhf: "12",
    anchorage: { holding: "sand", notes: "Μικρό λιμάνι για τοπικά σκάφη / ρηχά." },
    shelter: "Από Ν–ΝΔ",
    exposure: "Ανοιχτός σε ΒΑ",
    hazards: [{ label: "Silting in basin", sev: 1 }],
    notes: ["Καλή στάση σε ήπιους καιρούς."],
    sources: ["Sea Guide Vol. 3 p. 34"]
  },
  "Arkoudi Cove": {
    anchorage: { holding: "sand", notes: "Καθαρό βυθό, ρηχό (2–3 m)." },
    shelter: "Από Α–ΝΑ",
    exposure: "Ανοιχτός σε Δ",
    notes: ["Όμορφο αγκυροβόλιο για ημέρα ή νύχτα με ήπιους ανέμους."],
    sources: ["Sea Guide Vol. 3 p. 34"]
  },
  "Palouki Harbour": {
    vhf: "12",
    anchorage: { holding: "sand/mud", notes: "Καλή κράτηση εντός λιμένα." },
    shelter: "Από ΝΔ",
    exposure: "Ανοιχτός σε ΒΑ",
    hazards: [{ label: "Silting in entrance", sev: 1 }],
    notes: ["Προσοχή σε συχνή εναπόθεση ιλύος· ρηχά κοντά στον μόλο."],
    sources: ["Sea Guide Vol. 3 p. 36"]
  },
  "Katakolo Harbour": {
    vhf: "12",
    anchorage: { holding: "mud/sand", notes: "Καλή κράτηση εκτός λιμένα 8–10 m." },
    shelter: "Από ΝΔ",
    exposure: "Ανοιχτός σε ΒΑ",
    hazards: [
      { label: "Works in progress (moles)", sev: 1 },
      { label: "Cruise traffic", sev: 1 }
    ],
    notes: [
      "Βάθη μέχρι 11 m· πολύ καλή υποδομή fuel / νερό.",
      "Προσοχή σε ρεύματα και συχνό swell."
    ],
    sources: ["Sea Guide Vol. 3 p. 36"]
  },
  "Alykes Harbour (Zakynthos)": {
    vhf: "12",
    anchorage: { holding: "sand", notes: "Καλή κράτηση με ρηχά στο νότιο τμήμα." },
    shelter: "Από Ν–ΝΔ",
    exposure: "Ανοιχτός σε ΒΑ",
    hazards: [{ label: "Rocks along E side", sev: 2 }],
    notes: ["Τοπικό λιμανάκι · ρηχά και σφιχτή είσοδος."],
    sources: ["Sea Guide Vol. 3 p. 38"]
  },
  "Zakynthos Harbour": {
    vhf: "12",
    anchorage: { holding: "sand/mud", notes: "Καλό κράτημα εκτός λιμένα 10–12 m." },
    shelter: "Από Ν–Δ",
    exposure: "Ανοιχτός σε Β–ΒΑ",
    hazards: [{ label: "Silting in berthing area", sev: 1 }],
    notes: [
      "Μεγάλη μαρίνα με ρεύμα/νερό/fuel.",
      "Προσοχή σε swell από ΝΔ ανέμους."
    ],
    sources: ["Sea Guide Vol. 3 pp. 37–39"]
  },

  /* ======== WEST PELOPONNESE & ZAKYNTHOS EXTENDED (pp. 41–50) ======== */
  "Kyparissia Harbour": {
    vhf: "12",
    anchorage: { holding: "sand/mud", notes: "Καλή κράτηση 4–6 m, αλλά silting στην είσοδο." },
    shelter: "Από Ν–Δ",
    exposure: "Ανοιχτός σε Β–ΒΑ",
    hazards: [
      { label: "Silting at entrance", sev: 2 },
      { label: "Strong onshore winds", sev: 1 }
    ],
    notes: [
      "Προσοχή σε ρηχά σημεία στην είσοδο.",
      "Βάθος 3–5 m, κατάλληλο για μικρά σκάφη."
    ],
    sources: ["Sea Guide Vol. 4 p. 41"]
  },
  "Strofades Islets": {
    anchorage: { holding: "sand", notes: "Ρηχό αγκυροβόλιο 5–10 m, καλή κράτηση· προστασία από ΒΔ." },
    shelter: "Από ΒΔ",
    exposure: "Ανοιχτός σε Ν–ΝΑ",
    hazards: [
      { label: "Shallow reefs", sev: 2 },
      { label: "Restricted area (NMPZ)", sev: 1 }
    ],
    notes: [
      "Περιοχή Natura, επιτρέπεται αγκυροβόλιο μόνο υπό όρους.",
      "Συχνές ριπές με Meltemi."
    ],
    sources: ["Sea Guide Vol. 4 p. 41"]
  },
  "Agios Kyriaki Harbour": {
    vhf: "—",
    anchorage: { holding: "sand/mud", notes: "Ρηχό 1,5–2 m, κατάλληλο για μικρά σκάφη." },
    shelter: "Από Δ–ΝΔ",
    exposure: "Ανοιχτός σε ΒΑ",
    hazards: [{ label: "Shallow approach", sev: 1 }],
    notes: ["Μόνο για μικρά τοπικά σκάφη, διαθέσιμο νερό/φαρμακείο κοντά."],
    sources: ["Sea Guide Vol. 4 p. 45"]
  },
  "Marmari Bay": {
    anchorage: { holding: "sand", notes: "Καλή κράτηση· ρηχά κοντά στην ακτή." },
    shelter: "Από Α–ΝΑ",
    exposure: "Ανοιχτός σε Δ",
    notes: ["Πανέμορφη παραλία για ημερήσια στάση, χωρίς υποδομές."],
    sources: ["Sea Guide Vol. 4 p. 46"]
  },
  "Marathopoli Harbour": {
    vhf: "12",
    anchorage: { holding: "sand", notes: "Καλή κράτηση 4–6 m· προσοχή σε δυτικούς ανέμους." },
    shelter: "Από Α–ΝΑ",
    exposure: "Ανοιχτός σε Δ–ΝΔ",
    hazards: [{ label: "Surf swell from W", sev: 1 }],
    notes: ["Καλή στάση καλοκαιρινού καιρού· μικρή προστασία σε δυτικούς."],
    sources: ["Sea Guide Vol. 4 p. 47"]
  },
  "Navarino Bay (Pylos)": {
    vhf: "12",
    anchorage: { holding: "sand/mud", notes: "Εξαιρετικό κράτημα σε όλο τον όρμο, 5–10 m." },
    shelter: "Σχεδόν πλήρης προστασία (φυσικός κόλπος)",
    exposure: "Ανοιχτός μόνο σε ΝΔ swell",
    hazards: [
      { label: "Countercurrents near entrance", sev: 1 },
      { label: "Occasional violent NW winds", sev: 2 }
    ],
    notes: [
      "Ιστορικός όρμος Ναυαρίνου· ιδανικό αγκυροβόλιο.",
      "Προσοχή σε αντίθετα ρεύματα κοντά στην είσοδο."
    ],
    sources: ["Sea Guide Vol. 4 p. 48"]
  },
  "Voïdokilia Bay": {
    anchorage: { holding: "sand", notes: "Καθαρός βυθός, ρηχό αγκυροβόλιο 2–4 m." },
    shelter: "Από Α–ΝΑ",
    exposure: "Ανοιχτός σε Β–ΒΔ",
    notes: [
      "Από τις ομορφότερες παραλίες της Ελλάδας· μόνο ημερήσιο αγκυροβόλιο.",
      "Χωρίς υποδομές· άμμος, καθαρά νερά."
    ],
    sources: ["Sea Guide Vol. 4 p. 49"]
  },
  "Pylos Marina": {
    vhf: "12",
    anchorage: { holding: "sand/mud", notes: "Καλή κράτηση· βάθη 4–6 m στον μόλο." },
    shelter: "Από Δ–ΝΔ",
    exposure: "Ανοιχτός σε ΒΑ",
    hazards: [{ label: "Occasional surge", sev: 1 }],
    notes: [
      "Πλήρεις υποδομές: fuel, νερό, ρεύμα, φαρμακείο.",
      "Ανεφοδιασμός στο Coral Gas / Cyclon Oil."
    ],
    sources: ["Sea Guide Vol. 4 p. 49"]
  },
  "Finikounda Harbour": {
    vhf: "12",
    anchorage: { holding: "sand/mud", notes: "Καλή κράτηση, ρηχά (3–5 m)." },
    shelter: "Από ΝΔ",
    exposure: "Ανοιχτός σε Β–ΒΑ",
    hazards: [{ label: "Underwater rocks at entrance", sev: 1 }],
    notes: [
      "Όμορφο χωριό με υποδομές, εύκολη πρόσβαση.",
      "Καλή προστασία· προσοχή στα βράχια στην είσοδο."
    ],
    sources: ["Sea Guide Vol. 4 p. 49"]
  },
  "Agios Nikolaos (Skinari, Zakynthos)": {
    vhf: "12",
    anchorage: { holding: "sand/rock", notes: "Καλό κράτημα· προστασία από Ν–ΝΔ." },
    shelter: "Από Ν–ΝΔ",
    exposure: "Ανοιχτός σε ΒΑ",
    hazards: [
      { label: "Surge from NE", sev: 1 },
      { label: "Narrow entrance", sev: 1 }
    ],
    notes: [
      "Μικρό λιμανάκι· βραχώδης είσοδος· προσοχή σε swell.",
      "Στάση για Blue Caves / Ναυάγιο."
    ],
    sources: ["Sea Guide Vol. 4 p. 43"]
  },
  "Agios Sostis Harbour (Zakynthos)": {
    vhf: "12",
    anchorage: { holding: "sand", notes: "Καλή κράτηση σε 3–5 m, μικρός μόλος." },
    shelter: "Από ΝΔ",
    exposure: "Ανοιχτός σε ΒΑ",
    hazards: [{ label: "Shallow near mole", sev: 1 }],
    notes: ["Ιδανικό για μικρά σκάφη και ημερήσιες εκδρομές."],
    sources: ["Sea Guide Vol. 4 p. 43"]
  },
  "Kerì Bay (Zakynthos)": {
    anchorage: { holding: "sand/mud", notes: "Εξαιρετικό κράτημα· βάθη 4–8 m." },
    shelter: "Από Ν–ΝΑ",
    exposure: "Ανοιχτός σε Β–ΒΔ",
    hazards: [{ label: "Swell from NW winds", sev: 1 }],
    notes: [
      "Πολύ καλή προστασία· καύσιμα στο χωριό.",
      "Πολύ ωραία τοποθεσία με καθαρό βυθό."
    ],
    sources: ["Sea Guide Vol. 4 p. 42"]
  },
  "Tsilivi Harbour (Zakynthos)": {
    anchorage: { holding: "sand", notes: "Ρηχό (2 m)· μόνο για μικρά σκάφη." },
    shelter: "Από Ν–ΝΑ",
    exposure: "Ανοιχτός σε ΒΔ",
    hazards: [{ label: "Silting in basin", sev: 1 }],
    notes: ["Μικρό ψαρολίμανο· ασφαλές σε ήπιους καιρούς."],
    sources: ["Sea Guide Vol. 4 p. 42"]
  },
  "Makris Gialos (Zakynthos)": {
    anchorage: { holding: "sand", notes: "Καλή κράτηση· προστασία από Ν–Α." },
    shelter: "Από Ν–Α",
    exposure: "Ανοιχτός σε Β–ΒΔ",
    hazards: [{ label: "Reefs near shore", sev: 1 }],
    notes: [
      "Ωραίο αγκυροβόλιο με καθαρά νερά και μικρό βάθος (4–8 m).",
      "Ιδανικό για ημερήσια στάση και κολύμπι."
    ],
    sources: ["Sea Guide Vol. 4 p. 42"]
  },

  /* ======== MESSINIA & MANI (Sea Guide Vol.4 pp. 51–59) ======== */
  "Methodi Harbour": {
    vhf: "12",
    anchorage: { holding: "sand/mud", notes: "Καλή κράτηση 4–6 m, άμμος/λάσπη." },
    shelter: "Από ΒΑ–Α",
    exposure: "Ανοιχτός σε ΝΔ–Δ",
    hazards: [
      { label: "Reefs near entrance", sev: 2 },
      { label: "Cross-currents inside bay", sev: 1 }
    ],
    notes: [
      "Πολύ όμορφο ιστορικό λιμάνι, προσοχή σε ισχυρά ρεύματα και swell.",
      "Επιφανειακά ρεύματα εναλλάσσονται συχνά, προσοχή σε προσέγγιση."
    ],
    sources: ["Sea Guide Vol.4 p.51"]
  },
  "Petalidi Harbour": {
    vhf: "12",
    anchorage: { holding: "sand", notes: "Ρηχό λιμάνι, καλή κράτηση για μικρά σκάφη." },
    shelter: "Από Ν–ΝΑ",
    exposure: "Ανοιχτός σε Β–ΒΔ",
    hazards: [{ label: "Shallow at entrance", sev: 1 }],
    notes: [
      "Μικρό ψαρολίμανο· διαθέτει νερό, ρεύμα, φαρμακείο και πρατήριο SLK OIL.",
      "Προσοχή στα ρηχά κοντά στη γλίστρα."
    ],
    sources: ["Sea Guide Vol.4 p.51"]
  },
  "Kalamata Marina": {
    vhf: "69",
    anchorage: { holding: "sand/mud", notes: "Πλήρης προστασία μέσα στο λιμάνι, βάθη 4–10 m." },
    shelter: "Εξαιρετική προστασία, όλο το χρόνο",
    exposure: "Ελάχιστη (μόνο σε ισχυρούς Ν–ΝΑ ανέμους)",
    hazards: [
      { label: "Lag on mole (καμπύλη προκυμαίας)", sev: 1 },
      { label: "Surge during SE winds", sev: 1 }
    ],
    notes: [
      "Πλήρεις υποδομές (MedMarinas): fuel, νερό, ρεύμα, κατάστημα yacht chandlers.",
      "Καλή στάση για ανεφοδιασμό και service."
    ],
    sources: ["Sea Guide Vol.4 p.53"]
  },
  "Kitries Harbour": {
    vhf: "—",
    anchorage: { holding: "sand/rock", notes: "Καλή κράτηση 3–6 m, άμμος και βράχος." },
    shelter: "Από Ν–ΝΔ",
    exposure: "Ανοιχτός σε Β–ΒΑ",
    hazards: [{ label: "Strong gusts in summer", sev: 1 }],
    notes: ["Πολύ όμορφο μικρό λιμανάκι με 2 ταβέρνες· προσοχή σε ριπές ανέμου."],
    sources: ["Sea Guide Vol.4 p.53"]
  },
  "Kardamyli Harbour": {
    vhf: "—",
    anchorage: { holding: "sand/rock", notes: "Καλή κράτηση 4–8 m· προσοχή στους βράχους." },
    shelter: "Από Ν–ΝΑ",
    exposure: "Ανοιχτός σε Β–ΒΑ",
    hazards: [
      { label: "Rocks near breakwater", sev: 2 },
      { label: "Strong gusts through gorge", sev: 1 }
    ],
    notes: [
      "Όμορφο φυσικό λιμανάκι, περιορισμένος χώρος ελιγμών.",
      "Καλή προστασία από καλοκαιρινούς ανέμους."
    ],
    sources: ["Sea Guide Vol.4 p.54"]
  },
  "Kotrona Harbour": {
    vhf: "—",
    anchorage: { holding: "sand/mud", notes: "Καλή κράτηση 3–5 m· ήρεμο καταφύγιο." },
    shelter: "Από Β–ΒΑ",
    exposure: "Ανοιχτός σε Ν–ΝΔ",
    hazards: [{ label: "Rolling from swell", sev: 1 }],
    notes: [
      "Πολύ ασφαλές αγκυροβόλιο· προστασία σε καλοκαιρινούς NW ανέμους.",
      "Βάθη 3–6 m, άμμος και λάσπη."
    ],
    sources: ["Sea Guide Vol.4 p.58"]
  },
  "Porto Kagio": {
    vhf: "—",
    anchorage: { holding: "sand/mud", notes: "Καλή κράτηση 5–10 m, πλήρης προστασία." },
    shelter: "Σχεδόν πλήρης, εκτός από ισχυρούς ΒΑ",
    exposure: "Ανοιχτός σε ΒΑ ριπές",
    hazards: [{ label: "Occasional surge during strong NE", sev: 1 }],
    notes: [
      "Πανέμορφος όρμος· κατάλληλος για διανυκτέρευση.",
      "Μικρό λιμανάκι στο εσωτερικό για ψαρόβαρκες."
    ],
    sources: ["Sea Guide Vol.4 p.59"]
  },
  "Vathy Bay (Poseidonia)": {
    vhf: "—",
    anchorage: { holding: "sand", notes: "Καλό κράτημα 4–8 m· προστασία από Δ." },
    shelter: "Από Δ–ΝΔ",
    exposure: "Ανοιχτός σε ΒΑ",
    hazards: [{ label: "Narrow entrance", sev: 1 }],
    notes: [
      "Αρχαίος όρμος· ήσυχο σημείο με ωραίο φυσικό τοπίο.",
      "Βάθη 3–7 m, καλή κράτηση."
    ],
    sources: ["Sea Guide Vol.4 p.59"]
  },
  "Asomaton Bay": {
    vhf: "—",
    anchorage: { holding: "sand", notes: "Καλή κράτηση 5–10 m· καλά προφυλαγμένο αγκυροβόλιο." },
    shelter: "Από Ν–ΝΔ",
    exposure: "Ανοιχτός σε ΒΑ",
    notes: [
      "Πολύ όμορφος όρμος στη Μάνη· αρχαίος ναός Ποσειδώνα στο λόφο.",
      "Πλήρης ηρεμία και καθαρά νερά."
    ],
    sources: ["Sea Guide Vol.4 p.59"]
  },
  "Limeni Bay": {
    vhf: "—",
    anchorage: { holding: "sand/rock", notes: "Καλή κράτηση 4–8 m· άμμος και φύκια." },
    shelter: "Από ΝΔ–Δ",
    exposure: "Ανοιχτός σε ΒΑ",
    hazards: [{ label: "Rolling from afternoon winds", sev: 1 }],
    notes: [
      "Πανέμορφος παραδοσιακός όρμος, αλλά περιορισμένος χώρος αγκυροβολίας.",
      "Βάθη 4–10 m· μικρός μόλος για τοπικά σκάφη."
    ],
    sources: ["Sea Guide Vol.4 p.55"]
  },
  "Dirou Bay": {
    vhf: "—",
    anchorage: { holding: "sand/mud", notes: "Καλό κράτημα 4–7 m· επηρεάζεται από NW ανέμους." },
    shelter: "Από Ν–ΝΔ",
    exposure: "Ανοιχτός σε Β–ΒΔ",
    hazards: [{ label: "Rolling from NW in summer", sev: 1 }],
    notes: [
      "Γνωστός για τα σπήλαια Διρού· ωραίο αγκυροβόλιο ήρεμου καιρού.",
      "Ιδανικό για επίσκεψη στην ακτή με tender."
    ],
    sources: ["Sea Guide Vol.4 p.55"]
  },
  "Mezapos Harbour": {
    vhf: "—",
    anchorage: { holding: "sand/rock", notes: "Καλή κράτηση 5–8 m· στενός όρμος." },
    shelter: "Από Ν–ΝΔ",
    exposure: "Ανοιχτός σε ΒΑ",
    hazards: [
      { label: "Rocks near entrance", sev: 2 },
      { label: "Strong gusts in summer", sev: 1 }
    ],
    notes: [
      "Πολύ όμορφο μικρό λιμανάκι με ρηχή είσοδο.",
      "Ταβέρνα στο βόρειο άκρο· προσοχή σε ριπές."
    ],
    sources: ["Sea Guide Vol.4 p.56"]
  },
  "Gerolimenas Harbour": {
    vhf: "—",
    anchorage: { holding: "sand/rock", notes: "Καλή κράτηση 4–8 m· περιορισμένος χώρος." },
    shelter: "Από Ν–ΝΔ",
    exposure: "Ανοιχτός σε Β–ΒΑ",
    hazards: [{ label: "Surge during strong NW winds", sev: 1 }],
    notes: [
      "Όμορφος όρμος Μάνης, προστατευμένος· εστιατόρια και καταλύματα.",
      "Ιδανική στάση για μικρά σκάφη, προσοχή στο swell."
    ],
    sources: ["Sea Guide Vol.4 p.56"]
  },

  /* ======== LACONIA REGION (Sea Guide Vol. 4 pp. 60–62) ======== */
  "Gytheio Harbour": {
    vhf: "12",
    anchorage: { holding: "mud/sand", notes: "Καλή κράτηση 6–10 m μέσα στον όρμο." },
    shelter: "Από ΝΔ – ΒΔ",
    exposure: "Ανοιχτός σε Α–ΝΑ ριπές",
    hazards: [
      { label: "Shallow mole extension under construction (works 2020s)", sev: 2 },
      { label: "Onshore winds send swell into harbour", sev: 1 }
    ],
    notes: [
      "Κύριο λιμάνι της Μάνης· προσεκτική είσοδος λόγω έργων.",
      "Διαθέτει καύσιμα, τελωνείο, φαρμακείο, νερό και ρεύμα."
    ],
    sources: ["Sea Guide Vol. 4 p. 61"]
  },
  "Elia Bay (Laconia)": {
    vhf: "—",
    anchorage: { holding: "sand/rock", notes: "Καλό κράτημα 4–6 m· άμμος με βράχο." },
    shelter: "Από Ν–ΝΑ",
    exposure: "Ανοιχτός σε Β–ΒΔ",
    hazards: [{ label: "Rocks near pier and entrance", sev: 1 }],
    notes: [
      "Μικρό λιμανάκι με προστασία από νοτιοανατολικούς.",
      "Περιορισμένος χώρος ελιγμών, καλή στάση για μικρά σκάφη."
    ],
    sources: ["Sea Guide Vol. 4 p. 61"]
  },
  "Skoutari Harbour": {
    vhf: "—",
    anchorage: { holding: "sand", notes: "Κράτηση καλή 4–8 m, προσοχή σε υφάλους ανατολικά." },
    shelter: "Από Ν–ΝΑ",
    exposure: "Ανοιχτός σε Β–ΒΔ",
    hazards: [
      { label: "Underwater rocks by pier", sev: 2 },
      { label: "Strong gusts from NE", sev: 1 }
    ],
    notes: [
      "Εξαιρετική παραλία· χωρίς υποδομές.",
      "Προσοχή στη βόρεια πλευρά του προβλήτα (ρηχά)."
    ],
    sources: ["Sea Guide Vol. 4 p. 60"]
  },
  "Plitra Harbour": {
    vhf: "—",
    anchorage: { holding: "mud/sand", notes: "Καλή κράτηση 4–6 m, προστατευμένο λιμανάκι." },
    shelter: "Από ΝΔ–Δ",
    exposure: "Ανοιχτός σε Α–ΒΑ",
    hazards: [{ label: "Shallow approach", sev: 1 }],
    notes: [
      "Ιστορικός τόπος (βυθισμένη πόλη Ασώπος). Καλή προστασία.",
      "Διαθέτει μικρές προβλήτες και παροχή νερού."
    ],
    sources: ["Sea Guide Vol. 4 p. 62"]
  },
  "Archangelos Bay (Laconia)": {
    vhf: "—",
    anchorage: { holding: "sand", notes: "Καλή κράτηση 3–5 m· ήσυχο αγκυροβόλιο." },
    shelter: "Από ΝΔ",
    exposure: "Ανοιχτός σε Α–ΒΑ",
    hazards: [{ label: "Reefs off entrance", sev: 1 }],
    notes: [
      "Μικρός όρμος με προστασία και ωραίο τοπίο.",
      "Κατάλληλο για ημερήσια στάση· όχι υποδομές."
    ],
    sources: ["Sea Guide Vol. 4 p. 62"]
  },
  "Kokkiniá Pier and Harbour": {
    vhf: "—",
    anchorage: { holding: "sand/mud", notes: "Ρηχά 3 m· μόνο για μικρά σκάφη." },
    shelter: "Από ΝΔ",
    exposure: "Ανοιχτός σε ΒΑ",
    notes: [
      "Απομονωμένο σημείο με δύο προβλήτες, χωρίς υποδομές.",
      "Καλή στάση για ηρεμία και κολύμπι."
    ],
    sources: ["Sea Guide Vol. 4 p. 60"]
  },
  "Kalyvia Pier": {
    vhf: "—",
    anchorage: { holding: "sand", notes: "Ρηχό 3–4 m με καλή κράτηση." },
    shelter: "Από Ν–ΝΔ",
    exposure: "Ανοιχτός σε ΒΑ",
    notes: [
      "Προβλήτα μόνο για τοπικά σκάφη.",
      "Ήσυχο σημείο με καλή πρόσβαση στην παραλία."
    ],
    sources: ["Sea Guide Vol. 4 p. 60"]
  }
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
  "σιτια": "Sitia",
  // peloponnese – korinthia
  "κορινθος λιμανι": "Corinth Harbour",
  "λιμανι κορινθου": "Corinth Harbour",
  "κορινθος": "Corinth Harbour",
  "διωρυγα κορινθου": "Korinth Canal (Isthmus)",
  "ισθμος": "Korinth Canal (Isthmus)",
  "κορινθιακη διωρυγα": "Korinth Canal (Isthmus)",
  "corinth canal": "Korinth Canal (Isthmus)",
  "κιατο": "Kiato Harbour",
  "λιατο": "Kiato Harbour",
  "λιμανι κιατου": "Kiato Harbour",
  "βραχατι": "Vrachati Harbour",
  "λιμανι βραχατιου": "Vrachati Harbour",
  "λεχαιον": "Lechaion (Ancient Corinth Bay)",
  "αρχαιος λεχαιων": "Lechaion (Ancient Corinth Bay)",
  "κολπος κορινθου λεχαιον": "Lechaion (Ancient Corinth Bay)",
  // peloponnese – korinthia (loutraki & mavrolimni)
  "λουτρακι": "Vouliagmeni / Loutraki Bay",
  "βουλιαγμενη λουτρακι": "Vouliagmeni / Loutraki Bay",
  "βουλιαγμενη κορινθιας": "Vouliagmeni / Loutraki Bay",
  "λιμανι λουτρακιου": "Loutraki Harbour",
  "μαυρολιμνη": "Mavrolimni Harbour",
  "νεα μαυρα λιμνη": "Mavrolimni Harbour",
  "λιμανι μαυρολιμνης": "Mavrolimni Harbour",
  // sterea ellada – antikyra / ag. isidoros / noussa
  "αντικυρα": "Antikyra Harbour",
  "λιμανι αντικυρας": "Antikyra Harbour",
  "αγιος ισιδωρος": "Agios Isidoros Harbour",
  "λιμανι αγιου ισιδωρου": "Agios Isidoros Harbour",
  "αγιος νικολαος στερεα": "Agios Nikolaos (Sterea Ellada)",
  "αγιος νικολαος βιωτιας": "Agios Nikolaos (Sterea Ellada)",
  "λιμανι αγιου νικολαου βιωτιας": "Agios Nikolaos (Sterea Ellada)",
  "νουσσα": "Noussa Harbour",
  "λιμανι νουσσας": "Noussa Harbour",
  "ορμος νουσσας": "Noussa Harbour",
  // sterea ellada / korinthia – additions
  "στραβα": "Strava Cove",
  "ορμος στραβας": "Strava Cove",
  "κολπος στραβας": "Strava Cove",
  "κατω ασσος": "Kato Assos",
  "λιμανι κατω ασσου": "Kato Assos",
  "ασσος κορινθιας": "Kato Assos",
  "λουτρακι λιμανι": "Loutraki Harbour",
  "ορμος λουτρακιου": "Loutraki Harbour",
  "ξυλοκαστρο": "NO Xylokastrou Harbour",
  "νο ξυλοκαστρου": "NO Xylokastrou Harbour",
  "λιμανι ξυλοκαστρου": "NO Xylokastrou Harbour",
  "μυλοκοπη": "Mylokopi Cove",
  "ορμος μυλοκοπης": "Mylokopi Cove",
  "αλεποχωρι": "Alepochori Harbour",
  "λιμανι αλεποχωριου": "Alepochori Harbour",
  "πορτο γερμενο": "Porto Germeno (Aigosthena)",
  "αιγοσθενες": "Porto Germeno (Aigosthena)",
  "λιμανι πορτο γερμενου": "Porto Germeno (Aigosthena)",
  "αγιος σωτηρας": "Agios Sotiras Bay",
  "ορμος αγιου σωτηρα": "Agios Sotiras Bay",
  "παραλια σαραντη": "Paralia Saranti Harbour",
  "λιμανι σαραντης": "Paralia Saranti Harbour",
  "σαραντη βιωτιας": "Paralia Saranti Harbour",
  "αλικη στερεα": "Aliki Harbour (Sterea Ellada)",
  "λιμανι αλικης": "Aliki Harbour (Sterea Ellada)",
  "αγιος βασιλειος": "Agios Vasileios Harbour",
  "λιμανι αγιου βασιλειου": "Agios Vasileios Harbour",
  "αγιος ιωαννης": "Agios Ioannis (Ormos & Limeniskos)",
  "ορμος αγιου ιωαννη": "Agios Ioannis (Ormos & Limeniskos)",
  "λιμενισκος αγιου ιωαννη": "Agios Ioannis (Ormos & Limeniskos)",
  // western korinthian gulf & itea–nafpaktos region
  "αιγιο": "Aigio Harbour",
  "λιμανι αιγιου": "Aigio Harbour",
  "μαυρα λιθαρια": "Mavra Litharia Harbour",
  "λιμανι μαυρων λιθαριων": "Mavra Litharia Harbour",
  "διακοπτο": "Diakopto Harbour",
  "λιμανι διακοπτου": "Diakopto Harbour",
  "ακρατα": "NC Akrata Harbour",
  "λιμανι ακρατας": "NC Akrata Harbour",
  "ναυτικος ομιλος ακρατας": "NC Akrata Harbour",
  "ιτεα": "Itea Marina",
  "μαρινα ιτεας": "Itea Marina",
  "λιμανι ιτεας": "Itea Marina",
  "κρισσαιος κολπος": "Krissaios Gulf",
  "κολπος κρισσαιος": "Krissaios Gulf",
  "γαλαξιδι": "Galaxidi Harbour",
  "λιμανι γαλαξιδιου": "Galaxidi Harbour",
  "κιρρα": "Kirra Harbour",
  "λιμανι κιρρας": "Kirra Harbour",
  "χανια στερεα": "Chania Harbour (Sterea Ellada)",
  "χανια φωκιδας": "Chania Harbour (Sterea Ellada)",
  "λιμανι χανιων φωκιδας": "Chania Harbour (Sterea Ellada)",
  "αγιος σπυριδων": "Agios Spyridon Harbour",
  "λιμανι αγιου σπυριδωνα": "Agios Spyridon Harbour",
  "βιδαβι": "Vidavi Bay",
  "ορμος βιδαβι": "Vidavi Bay",
  "ερατινη": "Eratini Harbour",
  "λιμανι ερατινης": "Eratini Harbour",
  "πανορμος φωκιδας": "Panormos Harbour",
  "λιμανι πανορμου": "Panormos Harbour",
  "τριζονια": "Trizonia Marina",
  "μαρινα τριζονιων": "Trizonia Marina",
  "λιμανι τριζονιων": "Trizonia Marina",
  "γλυφαδα φωκιδας": "Glyfada Harbour (Sterea Ellada)",
  "λιμανι γλυφαδας φωκιδας": "Glyfada Harbour (Sterea Ellada)",
  "ναυπακτος": "Nafpaktos Harbour",
  "λιμανι ναυπακτου": "Nafpaktos Harbour",
  "μοναστηρακι": "Monastiraki Bay",
  "ορμος μοναστηρακι": "Monastiraki Bay",
  "μαραθιας": "Marathias Harbour",
  "λιμανι μαραθια": "Marathias Harbour",
  // patras–mesologgi–oxia–kyllini–zakynthos region
  "ριο αντιρριο": "Rio–Antirrio",
  "αντιρριο": "Rio–Antirrio",
  "γεφυρα ριου αντιρριου": "Rio–Antirrio",
  "αγιος παντελεημονας": "Agios Pantelimonas Harbour",
  "λιμανι αγιου παντελεημονα": "Agios Pantelimonas Harbour",
  "μακρυνια": "Makrynia Harbour",
  "λιμανι μακρυνιας": "Makrynia Harbour",
  "κατω βασιλικης": "Kato Vasilikis Harbour",
  "λιμανι κατω βασιλικης": "Kato Vasilikis Harbour",
  "κρυονερι": "Kryoneri Harbour",
  "λιμανι κρυονεριου": "Kryoneri Harbour",
  "οξια": "Oxia Island Anchorages",
  "νησος οξια": "Oxia Island Anchorages",
  "ορμοι οξιας": "Oxia Island Anchorages",
  "παραλια κατω αχαια": "Paralia Kato Achaia Harbour",
  "λιμανι κατω αχαιας": "Paralia Kato Achaia Harbour",
  "μεσολογγι": "Mesolongi Marina",
  "μαρινα μεσολογγιου": "Mesolongi Marina",
  "λιμανι μεσολογγιου": "Mesolongi Marina",
  "πατρα": "Patras Marina",
  "μαρινα πατρας": "Patras Marina",
  "λιμανι πατρας": "Patras Marina",
  "κυλληνη": "Kyllini Harbour",
  "λιμανι κυλληνης": "Kyllini Harbour",
  "καναλι μεσολογγιου": "Mesolongi Channel Approach",
  "προσβαση μεσολογγιου": "Mesolongi Channel Approach",
  "γλυφα πελοποννησος": "Glyfa Harbour (Peloponnese)",
  "λιμανι γλυφας": "Glyfa Harbour (Peloponnese)",
  "αρκουδι": "Arkoudi Cove",
  "ορμος αρκουδιου": "Arkoudi Cove",
  "παλουκι": "Palouki Harbour",
  "λιμανι παλουκιου": "Palouki Harbour",
  "κατακολο": "Katakolo Harbour",
  "λιμανι κατακολου": "Katakolo Harbour",
  "πορτ κατακολο": "Katakolo Harbour",
  "αλυκες ζακυνθος": "Alykes Harbour (Zakynthos)",
  "λιμανι αλυκες": "Alykes Harbour (Zakynthos)",
  "ορμος αλυκων": "Alykes Harbour (Zakynthos)",
  "ζακυνθος": "Zakynthos Harbour",
  "λιμανι ζακυνθου": "Zakynthos Harbour",
  "μαρινα ζακυνθου": "Zakynthos Harbour",
  // west peloponnese & zakynthos extended
  "κυπαρισσια": "Kyparissia Harbour",
  "λιμανι κυπαρισσιας": "Kyparissia Harbour",
  "στροφάδες": "Strofades Islets",
  "στροφάδια": "Strofades Islets",
  "νησια στροφάδες": "Strofades Islets",
  "αγιος κυριακος": "Agios Kyriaki Harbour",
  "αγιος κυριακη": "Agios Kyriaki Harbour",
  "λιμανι αγιου κυριακου": "Agios Kyriaki Harbour",
  "μαρμαρι": "Marmari Bay",
  "κολπος μαρμαρι": "Marmari Bay",
  "ορμος μαρμαρι": "Marmari Bay",
  "μαραθοπολη": "Marathopoli Harbour",
  "λιμανι μαραθοπολης": "Marathopoli Harbour",
  "ναυαρινο": "Navarino Bay (Pylos)",
  "κολπος ναυαρινου": "Navarino Bay (Pylos)",
  "πυλος ναυαρινο": "Navarino Bay (Pylos)",
  "βοϊδοκιλια": "Voïdokilia Bay",
  "βοϊδοκοιλια": "Voïdokilia Bay",
  "ορμος βοϊδοκιλιας": "Voïdokilia Bay",
  "πυλος": "Pylos Marina",
  "μαρινα πυλου": "Pylos Marina",
  "λιμανι πυλου": "Pylos Marina",
  "φοινικουντα": "Finikounda Harbour",
  "λιμανι φοινικουντας": "Finikounda Harbour",
  "αγιος νικολαος σκινάρι": "Agios Nikolaos (Skinari, Zakynthos)",
  "αγιος νικολαος ζακυνθος": "Agios Nikolaos (Skinari, Zakynthos)",
  "σκινάρι": "Agios Nikolaos (Skinari, Zakynthos)",
  "λιμανι σκινάρι": "Agios Nikolaos (Skinari, Zakynthos)",
  "αγιος σωστης": "Agios Sostis Harbour (Zakynthos)",
  "λιμανι αγιου σωστη": "Agios Sostis Harbour (Zakynthos)",
  "αγιος σωστης ζακυνθος": "Agios Sostis Harbour (Zakynthos)",
  "κερι": "Kerì Bay (Zakynthos)",
  "ορμος κερι": "Kerì Bay (Zakynthos)",
  "κερι ζακυνθος": "Kerì Bay (Zakynthos)",
  "τσιλιβι": "Tsilivi Harbour (Zakynthos)",
  "λιμανι τσιλιβι": "Tsilivi Harbour (Zakynthos)",
  "μακρης γιαλος": "Makris Gialos (Zakynthos)",
  "ορμος μακρης γιαλος": "Makris Gialos (Zakynthos)",
  "μακρυς γιαλος": "Makris Gialos (Zakynthos)",
  "μακρυς γιαλος ζακυνθος": "Makris Gialos (Zakynthos)",
  // messinia & mani
  "μεθωνη": "Methodi Harbour",
  "λιμανι μεθωνης": "Methodi Harbour",
  "μεθοδη": "Methodi Harbour",
  "πεταλιδι": "Petalidi Harbour",
  "λιμανι πεταλιδιου": "Petalidi Harbour",
  "καλαματα": "Kalamata Marina",
  "μαρινα καλαματας": "Kalamata Marina",
  "λιμανι καλαματας": "Kalamata Marina",
  "κιτριες": "Kitries Harbour",
  "λιμανι κιτριων": "Kitries Harbour",
  "καρδαμυλη": "Kardamyli Harbour",
  "λιμανι καρδαμυλης": "Kardamyli Harbour",
  "κοτρονα": "Kotrona Harbour",
  "λιμανι κοτρονας": "Kotrona Harbour",
  "πορτο καγιο": "Porto Kagio",
  "ορμος πορτο καγιο": "Porto Kagio",
  "βαθυ ποσειδωνια": "Vathy Bay (Poseidonia)",
  "ορμος βαθυ": "Vathy Bay (Poseidonia)",
  "βαθυ μανης": "Vathy Bay (Poseidonia)",
  "ασωματων": "Asomaton Bay",
  "ορμος ασωματων": "Asomaton Bay",
  "κολπος ασωματων": "Asomaton Bay",
  "λιμενη": "Limeni Bay",
  "ορμος λιμενη": "Limeni Bay",
  "λιμενη μανης": "Limeni Bay",
  "διρος": "Dirou Bay",
  "ορμος διρου": "Dirou Bay",
  "σπηλαια διρου": "Dirou Bay",
  "μεζαπος": "Mezapos Harbour",
  "λιμανι μεζαπου": "Mezapos Harbour",
  "γερολιμενας": "Gerolimenas Harbour",
  "λιμανι γερολιμενα": "Gerolimenas Harbour",
  "ορμος γερολιμενα": "Gerolimenas Harbour",
  // laconia region
  "γυθειο": "Gytheio Harbour",
  "λιμανι γυθειου": "Gytheio Harbour",
  "μαρινα γυθειου": "Gytheio Harbour",
  "ελια λακωνια": "Elia Bay (Laconia)",
  "ορμος ελιας": "Elia Bay (Laconia)",
  "λιμανι ελιας": "Elia Bay (Laconia)",
  "σκουταρι": "Skoutari Harbour",
  "λιμανι σκουταριου": "Skoutari Harbour",
  "πλυτρα": "Plitra Harbour",
  "λιμανι πλυτρας": "Plitra Harbour",
  "ορμος πλυτρας": "Plitra Harbour",
  "αρχαγγελος λακωνια": "Archangelos Bay (Laconia)",
  "ορμος αρχαγγελου": "Archangelos Bay (Laconia)",
  "λιμανι αρχαγγελου": "Archangelos Bay (Laconia)",
  "κοκκινια": "Kokkiniá Pier and Harbour",
  "προβλητα κοκκινιας": "Kokkiniá Pier and Harbour",
  "λιμανι κοκκινιας": "Kokkiniá Pier and Harbour",
  "καλυβια": "Kalyvia Pier",
  "προβλητα καλυβιων": "Kalyvia Pier",
  "λιμανι καλυβιων": "Kalyvia Pier"
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
