/* ========= Port Facts Master =========
   Used by CaptainCrewToolkit & QuickFacts
   Source: Sea Guide / OSM / Wikidata / official marina sites / internal notes
   ===================================== */

export type PortHazard = { label: string; note?: string; sev?: 0 | 1 | 2 }; // sev 0=info,1=warn,2=alert

export type PortFact = {
  vhf?: string;                  // primary VHF channel (marina / Port Authority)
  vhfVerified?: boolean;         // true when verified against official doc/site
  marina?: string;               // marina/port name
  anchorage?: { holding?: string; notes?: string };
  shelter?: string;              // from which winds it shelters
  exposure?: string;             // to which winds/swell it’s exposed
  hazards?: PortHazard[];        // local hazards / seamanship notes
  notes?: string[];              // misc operational notes
  sources?: string[];            // provenance (URLs or refs)
};

/* ========= Main Facts Dataset =========
   NOTE:
   - Hazards are conservative/seed level; expand with local charts/NTM.
   - Keys are canonical English names used across the app; ALIASES maps Greek/alt spellings.
*/
const FACTS: Record<string, PortFact> = {
  /* ======== SARONIC ======== */
  Alimos: {
    vhf: "71", vhfVerified: true, marina: "Alimos Marina",
    notes: [
      "Πολύ traffic σε change-over Παρασκευή/Σάββατο.",
      "Fuel berth κατόπιν συνεννόησης / Port Office VHF 71."
    ],
    sources: ["Official: alimos-marina.gr → VHF CH.71"]
  },
  Aegina: {
    vhf: "12", vhfVerified: false,
    anchorage: { holding: "sand/mud", notes: "Καλή κράτηση· απόφυγε weed patches." },
    exposure: "Ferry wash στην είσοδο λιμένα",
    hazards: [{ label: "Traffic density", sev: 1 }, { label: "Ferry wash", sev: 1, note: "Είσοδος/έξοδος ferries" }],
    sources: ["Sea Guide (scan provided)"]
  },
  Agistri: {
    vhf: "—",
    anchorage: { holding: "sand", notes: "Καλή κράτηση (SW τμήμα)." },
    shelter: "Β–ΒΑ", exposure: "Ν–ΝΔ"
  },
  Poros: {
    vhf: "12", vhfVerified: false,
    anchorage: { holding: "sand/weed", notes: "Patchy· δοκίμασε δύο φορές για set." },
    shelter: "W–NW", exposure: "SE ριπές στο στενό",
    hazards: [{ label: "Cross current", sev: 1, note: "Ρεύματα στο στενό" }, { label: "Weed patches", sev: 1 }],
    sources: ["Sea Guide (scan provided)"]
  },
  Hydra: {
    vhf: "12", vhfVerified: false,
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
    shelter: "Β–ΒΔ", exposure: "Α–ΝΑ"
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
    shelter: "Β–Δ", exposure: "Α–ΝΑ"
  },
  Epidaurus: {
    vhf: "—",
    anchorage: { holding: "sand/mud", notes: "Ήρεμο αγκυροβόλιο." },
    shelter: "Γενικά καλό", exposure: "Ν"
  },

  /* ======== CYCLADES ======== */
  Lavrio: {
    vhf: "9", vhfVerified: true, marina: "Olympic Marine",
    notes: ["Base για Cyclades· συχνός Β-ΒΑ άνεμος στην έξοδο."],
    sources: ["Official: olympicmarine.gr → VHF 9", "Olympic Marine (contacts)"]
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
    vhf: "12", vhfVerified: false, marina: "Tourlos",
    anchorage: { holding: "sand", notes: "Ρηχά, ριπές Meltemi." },
    hazards: [{ label: "Meltemi gusts", sev: 2 }, { label: "Ferry wash", sev: 1 }],
    sources: ["CruisersWiki (non-official)", "Greek Marinas Guide (listing)"]
  },
  Paros: {
    vhf: "12", vhfVerified: false,
    anchorage: { holding: "sand", notes: "Naoussa: καλή προστασία· πρόσεχε ferry wash." },
    hazards: [{ label: "Meltemi funneling", sev: 2, note: "Κανάλι Πάρου–Νάξου." }],
    sources: ["SailingEurope (non-official)"]
  },
  Naxos: {
    vhf: "12", vhfVerified: false,
    anchorage: { holding: "sand/weed", notes: "Καλύτερη προστασία Β–ΒΔ." },
    hazards: [{ label: "Ferry wash", sev: 1 }, { label: "Meltemi seas", sev: 2 }],
    sources: ["SailingEurope (non-official)"]
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
  Sifnos: { vhf: "—", anchorage: { holding: "sand", notes: "Καλό holding." }, exposure: "Μελτέμι" },
  Serifos: { vhf: "—", anchorage: { holding: "sand/weed", notes: "Καλύτερα σε καθαρό άμμο." }, exposure: "Μελτέμι" },
  Andros: { vhf: "—", exposure: "Strong Meltemi funneling (B–ΒΑ)" },
  Tinos: { vhf: "—", exposure: "Μελτέμι/ριπές στο λιμάνι" },
  Folegandros: {
    vhf: "—", anchorage: { holding: "sand", notes: "Μικροί κολπίσκοι." }, exposure: "Νότιοι/δυτικοί"
  },
  Kimolos: {
    vhf: "—", anchorage: { holding: "sand", notes: "Ρηχά προσεκτικά." }, exposure: "W–SW swell"
  },
  Koufonisia: {
    vhf: "—", anchorage: { holding: "sand", notes: "Πολύ καθαρά νερά, καλό holding." }, exposure: "Μελτέμι"
  },
  Amorgos: {
    vhf: "—", anchorage: { holding: "sand/weed", notes: "Μελτέμι δημιουργεί swell." }, exposure: "B–ΒΑ"
  },

  /* ======== IONIAN ======== */
  Corfu: {
    vhf: "69", vhfVerified: true, marina: "D-Marin Gouvia",
    anchorage: { holding: "mud/sand", notes: "Καλή κράτηση σε κολπίσκους." },
    sources: ["Official: d-marin.com/marinas/gouvia → VHF 69"]
  },
  Paxos: {
    vhf: "—", anchorage: { holding: "sand/weed", notes: "Lakka/Gaios καλά αγκυροβόλια." }, exposure: "ΝΔ swell"
  },
  Antipaxos: { vhf: "—", anchorage: { holding: "sand", notes: "Καλοκαιρινή πολυκοσμία." } },
  Lefkada: {
    vhf: "69", vhfVerified: true, marina: "Lefkada Marina",
    anchorage: { holding: "mud/sand", notes: "Κανάλι/γέφυρα με ωράρια." },
    hazards: [
      { label: "Canal traffic", sev: 1 },
      { label: "Swing bridge schedule", sev: 1, note: "Άνοιγμα ανά ώρα (09:00–22:00) + 03:00, subject to NTM." }
    ],
    notes: [
      "Lefkada swing bridge: συχνά ανά ώρα 09:00–22:00 + 03:00. Επιβεβαίωση με Port Authority πριν την προσέγγιση."
    ],
    sources: ["Official: d-marin.com/marinas/lefkas → VHF 69", "Δήμος Λευκάδας (2024)"]
  },
  Preveza: { vhf: "—", anchorage: { holding: "mud/sand" } },
  Meganisi: { vhf: "—", anchorage: { holding: "mud/sand", notes: "Βαθιές αγκυροβολίες." } },
  Kalamos: { vhf: "—", anchorage: { holding: "sand", notes: "Καλή κάλυψη." } },
  Kastos: { vhf: "—", anchorage: { holding: "sand", notes: "Μικρό νησί, περιορισμένες θέσεις." } },
  Ithaca: { vhf: "—", anchorage: { holding: "mud/sand", notes: "Βαθιά κολπάκια." } },
  Kefalonia: { vhf: "—", anchorage: { holding: "sand/weed", notes: "Assos/Fiscardo." } },
  Zakynthos: { vhf: "—", anchorage: { holding: "sand", notes: "ΝΔ ακτές με swell." }, exposure: "W–SW swell" },

  /* ======== DODECANESE ======== */
  Rhodes: { vhf: "—", anchorage: { holding: "sand", notes: "Μαρίνες/δεσίματα διαθέσιμα." }, hazards: [{ label: "Meltemi seas outside", sev: 1 }] },
  Symi: { vhf: "—", anchorage: { holding: "mud/sand", notes: "Στενός οικισμός· ριπές." }, hazards: [{ label: "Tight harbor", sev: 2 }] },
  Kos: { vhf: "—", anchorage: { holding: "sand" } },
  Kalymnos: { vhf: "—", anchorage: { holding: "sand/rock" } },
  Patmos: { vhf: "—", anchorage: { holding: "sand", notes: "Καλή κάλυψη στον όρμο." } },
  Leros: { vhf: "—", anchorage: { holding: "sand/mud" } },

  /* ======== SPORADES ======== */
  Volos: { vhf: "—", anchorage: { holding: "mud/sand" } },
  Skiathos: { vhf: "—", anchorage: { holding: "sand", notes: "Busy ferries." }, hazards: [{ label: "Ferry wash", sev: 1 }] },
  Skopelos: { vhf: "—", anchorage: { holding: "sand/weed" } },
  Alonissos: { vhf: "—", anchorage: { holding: "sand", notes: "Θαλάσσιο πάρκο· κανονισμοί προστασίας." }, hazards: [{ label: "Marine park restrictions", sev: 1 }] },

  /* ======== NORTH AEGEAN (incl. Halkidiki) ======== */
  Thessaloniki: { vhf: "—", anchorage: { holding: "mud/sand" } },
  "Nea Moudania": { vhf: "—", anchorage: { holding: "sand" } },
  "Sani Marina": { vhf: "—", marina: "Sani Resort Marina" },
  Nikiti: { vhf: "—", anchorage: { holding: "sand" } },
  Vourvourou: { vhf: "—", anchorage: { holding: "sand", notes: "Πολύ ρηχά κοντά στις ακτές." } },
  "Ormos Panagias": { vhf: "—", anchorage: { holding: "sand" } },
  Ouranoupoli: { vhf: "—", anchorage: { holding: "sand", notes: "Αγ. Όρος ζώνη — περιορισμοί." }, hazards: [{ label: "Mt. Athos restricted waters", sev: 1 }] },
  Kavala: { vhf: "—", anchorage: { holding: "sand/mud" } },
  Thassos: { vhf: "—", anchorage: { holding: "sand", notes: "Καλές αγκυροβολίες Ν." } },
  Samothraki: { vhf: "—", anchorage: { holding: "sand/rock" }, exposure: "NE blows" },
  Lemnos: { vhf: "—", anchorage: { holding: "sand" }, exposure: "Meltemi" },
  Lesvos: { vhf: "—", anchorage: { holding: "sand/mud" } },
  Chios: { vhf: "—", anchorage: { holding: "sand/rock" } },
  Samos: { vhf: "—", anchorage: { holding: "sand" }, exposure: "E–NE" },
  Ikaria: { vhf: "—", anchorage: { holding: "sand/rock" }, exposure: "Ισχυροί άνεμοι/ριπές" },

  /* ======== CRETE ======== */
  Chania: { vhf: "—", anchorage: { holding: "sand", notes: "Swell στην είσοδο με Δυτικούς." }, exposure: "W–NW swell" },
  Rethymno: { vhf: "—", anchorage: { holding: "sand" }, exposure: "Βόρειοι" },
  Heraklion: { vhf: "—", anchorage: { holding: "sand" }, hazards: [{ label: "Commercial traffic", sev: 1 }] },
  "Agios Nikolaos": { vhf: "—", anchorage: { holding: "sand/mud" } },
  Sitia: { vhf: "—", anchorage: { holding: "sand" }, exposure: "E–NE" },

  /* ======== PELOPONNESE – KORINTHIA ======== */
  "Corinth Harbour": {
    vhf: "12", vhfVerified: true,
    anchorage: { holding: "mud/sand", notes: "Βαθύς εμπορικός λιμένας, use small-craft basin N sector." },
    shelter: "Καλή υπό Ν-ΝΑ, έκθεση σε ισχυρούς ΒΑ.",
    exposure: "ΒΑ ριπές, swell από διερχόμενα.",
    hazards: [{ label: "Rocks near mole tips", sev: 2 }, { label: "Commercial traffic", sev: 1 }, { label: "Surge from ferries", sev: 1 }],
    notes: ["Προσεγγίστε με προσοχή λόγω χαμηλής βύθισης μεταξύ λιμενοβραχιόνων.", "Πολύ περιορισμένες θέσεις για σκάφη αναψυχής (S basin)."],
    sources: ["Sea Guide Vol. 3 p. 04"]
  },
  "Korinth Canal (Isthmus)": {
    vhf: "11, 12, 19, 21", vhfVerified: true,
    hazards: [{ label: "Very strong current", sev: 2 }, { label: "Narrow passage 52 m wide", sev: 2 }, { label: "Steep walls — gusty katabatic winds", sev: 1 }],
    notes: [
      "Speed limit ≈ 5 kn (under tow if > 15 m).",
      "Canal closes for convoys ≈ 00:00–06:00 for maintenance.",
      "Vessels call 'Corinth Canal Control' before entry (VHF 11 or 12)."
    ],
    sources: ["Sea Guide Vol. 3 p. 05"]
  },
  "Kiato Harbour": {
    vhf: "12", vhfVerified: true,
    anchorage: { holding: "mud/sand", notes: "Ρηχό νότιο τμήμα ≤ 2.5 m — κατάλληλο για μικρά σκάφη." },
    shelter: "Καλή υπό Ν-ΝΔ.", exposure: "Β-ΒΑ ριπές με μελτέμι.",
    hazards: [{ label: "Silting near entrance", sev: 1 }, { label: "Fishing nets close to breakwater", sev: 1 }],
    notes: ["Είσοδος μεταξύ φάρων F G και F R.", "Βάθη 2–4 m, προτιμήστε ΝΑ μέρος του λιμένα."],
    sources: ["Sea Guide Vol. 3 p. 07"]
  },
  "Vrachati Harbour": {
    vhf: "12", vhfVerified: true,
    anchorage: { holding: "sand/mud", notes: "Μικρό λιμάνι για τοπικά σκάφη." },
    shelter: "Προστασία από Ν και ΝΔ ανέμους.", exposure: "Ανεπαρκής προστασία από Β-ΒΑ.",
    hazards: [{ label: "Sunken rocks at N mole tip", sev: 2 }],
    notes: ["Προσοχή στην είσοδο — χαμηλή στάθμη και περιοχή shoals.", "Καλύτερα για ημερήσια στάση μόνο."],
    sources: ["Sea Guide Vol. 3 p. 06"]
  },
  "Lechaion (Ancient Corinth Bay)": {
    anchorage: { holding: "mud/sand", notes: "Ρηχό αγκυροβόλιο με ισχυρά ΒΑ ρεύματα." },
    exposure: "Ανοιχτό σε ΒΑ ριπές.", hazards: [{ label: "Shallow ruins submerged", sev: 1 }],
    sources: ["Sea Guide Vol. 3 p. 03"]
  },
  "Vouliagmeni / Loutraki Bay": {
    vhf: "12",
    anchorage: { holding: "sand/mud", notes: "Καλή κράτηση στα 12–15 m έξω από το λιμάνι Λουτρακίου." },
    shelter: "Από Ν-ΝΔ.", exposure: "ΒΔ ριπές και ισχυρό swell με μελτέμι.",
    hazards: [{ label: "Strong wind gusts through Geraneia Mts", sev: 2 }, { label: "Surge in harbour entrance", sev: 1 }],
    notes: ["Λιμάνι με βύθισμα έως 4 m — μόνο για μικρά σκάφη.", "Υπάρχει fuel και ανεφοδιασμός κοντά στην παραλία."],
    sources: ["Sea Guide Vol. 3 p. 08"]
  },
  "Mavrolimni Harbour": {
    vhf: "12", vhfVerified: true,
    anchorage: { holding: "sand", notes: "Κρατά καλά στα 6–10 m, προσοχή στις βόρειες ριπές." },
    shelter: "Από Ν-ΝΔ ανέμους.", exposure: "Ανοιχτό σε Β και ΒΑ.",
    hazards: [{ label: "Rocks at NO mole tip", sev: 1 }, { label: "Silting in inner basin", sev: 1 }],
    notes: ["Μικρό λιμάνι τοπικής χρήσης — όχι κατάλληλο για μεγάλα σκάφη."],
    sources: ["Sea Guide Vol. 3 p. 08"]
  },

  /* ======== STEREA ELLADA – ANTIKYRA / AG. ISIDOROS / NOUSSA ======== */
  "Antikyra Harbour": {
    vhf: "12", vhfVerified: true,
    anchorage: { holding: "mud/sand", notes: "Καλό κράτημα — ρηχά κοντά στον προβλήτα." },
    shelter: "Από Ν και Δ.", exposure: "ΒΑ swell",
    hazards: [{ label: "Strong gusts from mountains", sev: 2 }, { label: "Depth variation ±0.8 m tidal", sev: 0 }],
    notes: ["Νερό πέφτει 80 cm με παλίρροιες — προσαρμογή γραμμών."],
    sources: ["Sea Guide Vol. 3 p. 11"]
  },
  "Agios Isidoros Harbour": {
    vhf: "—",
    anchorage: { holding: "sand", notes: "Καλό holding σε ρηχά 4–6 m." },
    shelter: "Ν–ΝΔ", exposure: "ΒΑ",
    hazards: [{ label: "Shoaling near beach", sev: 1 }],
    notes: ["Μία μόνο ταβέρνα στη στεριά."],
    sources: ["Sea Guide Vol. 3 p. 12"]
  },
  "Agios Nikolaos (Sterea Ellada)": {
    vhf: "—",
    anchorage: { holding: "sand", notes: "Βάθη 3–5 m στην είσοδο, καλή προστασία σε Ν άνεμο." },
    shelter: "Ν–ΝΔ", exposure: "ΒΑ",
    hazards: [{ label: "Silting at entrance", sev: 1 }],
    notes: ["Ρηχό στο εσωτερικό τμήμα· κρατήστε αποστάσεις από βραχώδη ζώνη."],
    sources: ["Sea Guide Vol. 3 p. 12"]
  },
  "Noussa Harbour": {
    vhf: "—",
    anchorage: { holding: "mud", notes: "Ρηχό, κατάλληλο για βύθισμα < 2 m." },
    shelter: "ΝΔ", exposure: "ΒΑ",
    hazards: [{ label: "Strong NE gusts on approach", sev: 1 }],
    notes: ["Μόνο για αλιευτικά ή ημερήσια στάση."],
    sources: ["Sea Guide Vol. 3 p. 12"]
  },

  /* ======== STEREA ELLADA / KORINTHIA – ADDITIONS ======== */
  "Strava Cove": {
    anchorage: { holding: "sand", notes: "Μικρός ρηχός κόλπος. Καλός μόνο για μικρά σκάφη." },
    shelter: "Β-ΒΔ", exposure: "Ν-ΝΑ",
    hazards: [{ label: "Rocky reef N of approach", sev: 1 }, { label: "Shoals near beach", sev: 1 }],
    notes: ["Στενός χώρος ελιγμών. Υπάρχει γλίστρα (slipway)."],
    sources: ["Sea Guide Vol. 3 p. 06"]
  },
  "Kato Assos": {
    vhf: "12",
    anchorage: { holding: "sand/mud", notes: "Μικρός λιμενίσκος (βάθη 1.5–3 m)." },
    shelter: "Ν", exposure: "ΒΑ με μελτέμι",
    hazards: [{ label: "Silting at entrance", sev: 1 }],
    notes: ["Καλύτερα για τοπικά/μικρά σκάφη. Περιορισμένες παροχές."],
    sources: ["Sea Guide Vol. 3 p. 05"]
  },
  "Loutraki Harbour": {
    vhf: "12",
    anchorage: { holding: "mud/sand", notes: "Εξωτερικά της εισόδου 12–15 m, καλό κράτημα." },
    shelter: "Ν-ΝΔ", exposure: "Β-ΒΔ (surge)",
    hazards: [{ label: "Strong gusts from Geraneia", sev: 2 }, { label: "Surge at entrance", sev: 1 }],
    notes: ["Ρηχά τμήματα εντός. Κατάλληλο για μικρά draft."],
    sources: ["Sea Guide Vol. 3 p. 08"]
  },
  "NO Xylokastrou Harbour": {
    vhf: "12", marina: "Yachting Club Xylokastrou",
    anchorage: { holding: "sand/mud", notes: "Μικρή λεκάνη, ρηχή." },
    shelter: "Ν-ΝΔ", exposure: "ΒΑ",
    hazards: [{ label: "Shoals close to beach", sev: 1 }],
    notes: ["Περιορισμένες θέσεις επισκεπτών."],
    sources: ["Sea Guide Vol. 3 p. 08"]
  },
  "Mylokopi Cove": {
    anchorage: { holding: "sand", notes: "Καλό κράτημα σε 6–10 m." },
    shelter: "Ν-ΝΔ", exposure: "Β-ΒΑ",
    hazards: [{ label: "Shoaling inside cove", sev: 1 }],
    notes: ["Άφιξη από Ν με ήπιο καιρό. Χωρίς προστασία σε μελτέμι."],
    sources: ["Sea Guide Vol. 3 p. 08"]
  },
  "Alepochori Harbour": {
    vhf: "12",
    anchorage: { holding: "sand/mud", notes: "Μικρός λιμένας. Αβαθή σημεία κοντά στους μώλους." },
    shelter: "Ν-ΝΔ", exposure: "Β-ΒΑ",
    hazards: [{ label: "Weed patches", sev: 1 }, { label: "Silting", sev: 1 }],
    notes: ["Κατάλληλο για μικρά σκάφη. Παροχές στη στεριά."],
    sources: ["Sea Guide Vol. 3 p. 09"]
  },
  "Porto Germeno (Aigosthena)": {
    anchorage: { holding: "sand", notes: "Ένα από τα καλύτερα αγκυροβόλια του Κορινθιακού." },
    shelter: "Ν-ΝΔ (κλειστός κόλπος)", exposure: "Β-ΒΑ (μελτέμι)",
    hazards: [{ label: "Shoals near beach", sev: 1 }, { label: "Gusts off slopes", sev: 1 }],
    notes: ["Προσοχή σε λουόμενους/σημαδούρες το καλοκαίρι."],
    sources: ["Sea Guide Vol. 3 p. 09"]
  },
  "Agios Sotiras Bay": {
    anchorage: { holding: "sand", notes: "Καλό holding, αλλά περιορισμένος χώρος." },
    shelter: "Ν", exposure: "ΒΑ/Α",
    hazards: [{ label: "Swells with E winds", sev: 1 }],
    notes: ["Κατάλληλο για μικρά/ημερήσια στάση."],
    sources: ["Sea Guide Vol. 3 p. 09"]
  },
  "Paralia Saranti Harbour": {
    vhf: "—",
    anchorage: { holding: "sand", notes: "Καλό κράτημα. Βάθη 3–5 m." },
    shelter: "Όλοι πλην ισχυρών Α", exposure: "Α & ΑΝΕ",
    hazards: [{ label: "Rocks close W of entrance", sev: 1 }],
    notes: ["Mini-market, ταβέρνες κοντά."],
    sources: ["Sea Guide Vol. 3 p. 10"]
  },
  "Aliki Harbour (Sterea Ellada)": {
    vhf: "—",
    anchorage: { holding: "sand", notes: "Ρηχά στη Ν και Α πλευρά." },
    shelter: "Δ-ΝΔ", exposure: "Α-ΒΑ",
    hazards: [{ label: "Rocks extend in N and NE quays", sev: 2 }],
    notes: ["Σημεία βράχων στους μώλους — κρατήστε απόσταση."],
    sources: ["Sea Guide Vol. 3 p. 10"]
  },
  "Agios Vasileios Harbour": {
    vhf: "—",
    anchorage: { holding: "sand", notes: "Μικρό λιμανάκι, ρηχά σημεία." },
    shelter: "Ν-ΝΔ", exposure: "Β-ΒΑ",
    hazards: [{ label: "Swell with N winds", sev: 1 }],
    notes: ["Κίτρινες σημαδούρες παραλίας το καλοκαίρι."],
    sources: ["Sea Guide Vol. 3 p. 10"]
  },
  "Agios Ioannis (Ormos & Limeniskos)": {
    vhf: "—",
    anchorage: { holding: "sand", notes: "7–10 m στον όρμο." },
    shelter: "All round στον όρμο", exposure: "ΒΑ εκτός λιμενίσκου",
    hazards: [{ label: "Silting near slip", sev: 1 }],
    notes: ["Λιμενίσκος 2–3 m, χρήση από τοπικά σκάφη."],
    sources: ["Sea Guide Vol. 3 p. 12"]
  },

  /* ======== WESTERN KORINTHIAN GULF & ITEA–NAUPAKTOS (pp.15–24) ======== */
  "Aigio Harbour": {
    vhf: "12",
    anchorage: { holding: "sand/mud", notes: "Καλή κράτηση 6–10 m εκτός μώλου." },
    shelter: "Ν–Δ", exposure: "Β–ΒΑ",
    hazards: [{ label: "Silting inside basin", sev: 1 }],
    notes: ["Κατάλληλο με ήπιο καιρό, όχι με ισχυρούς ΒΑ."],
    sources: ["Sea Guide Vol. 3 p. 16"]
  },
  "Mavra Litharia Harbour": {
    anchorage: { holding: "sand", notes: "Μικρός ρηχός κόλπος." },
    shelter: "Ν–Δ", exposure: "Β–ΒΑ",
    hazards: [{ label: "Silting at entrance", sev: 2 }],
    notes: ["Προσοχή σε λίθους στον προσήνεμο μόλο."],
    sources: ["Sea Guide Vol. 3 p. 16"]
  },
  "Diakopto Harbour": {
    anchorage: { holding: "sand/mud", notes: "Βάθη 2–3 m." },
    shelter: "Ν", exposure: "ΒΑ",
    hazards: [{ label: "Silting & uneven bottom", sev: 1 }],
    sources: ["Sea Guide Vol. 3 p. 16"]
  },
  "NC Akrata Harbour": {
    vhf: "12",
    anchorage: { holding: "sand", notes: "Κράτημα 5–7 m εκτός." },
    shelter: "Ν–Δ", exposure: "ΒΑ",
    hazards: [{ label: "Silt & stones at entrance", sev: 2 }],
    notes: ["Μικρή λεκάνη, προσοχή σε βυθισμένα εμπόδια."],
    sources: ["Sea Guide Vol. 3 p. 15"]
  },
  "Itea Marina": {
    vhf: "12",
    anchorage: { holding: "mud/sand", notes: "Καλό κράτημα 7–10 m." },
    shelter: "Δ–ΝΔ", exposure: "ΒΑ",
    hazards: [{ label: "Buoys near swimming area", sev: 1 }],
    notes: ["Ρεύμα/νερό, fuel κοντά."],
    sources: ["Sea Guide Vol. 3 p. 18"]
  },
  "Krissaios Gulf": {
    anchorage: { holding: "sand/mud", notes: "8–12 m, καλό κράτημα." },
    shelter: "Β–ΝΔ", exposure: "Ν–ΝΑ",
    hazards: [{ label: "Strong gusts down slopes", sev: 1 }],
    notes: ["Ρεύματα προς ΝΑ–ΒΔ. Προσοχή στις ριπές."],
    sources: ["Sea Guide Vol. 3 p. 17"]
  },
  "Galaxidi Harbour": {
    vhf: "12",
    anchorage: { holding: "mud/sand", notes: "5–8 m, εξαιρετικό κράτημα." },
    shelter: "Ν–Δ", exposure: "ΒΑ",
    hazards: [{ label: "Shallow spots near piers", sev: 1 }],
    notes: ["Παροχές, καύσιμα κοντά."],
    sources: ["Sea Guide Vol. 3 pp. 19–20"]
  },
  "Kirra Harbour": {
    vhf: "12",
    anchorage: { holding: "mud/sand", notes: "5–8 m, ρηχά κοντά στο μόλο." },
    shelter: "Ν–Δ", exposure: "ΒΑ",
    hazards: [{ label: "Rocks off outer mole", sev: 2 }],
    sources: ["Sea Guide Vol. 3 p. 18"]
  },
  "Chania Harbour (Sterea Ellada)": {
    vhf: "12",
    anchorage: { holding: "sand", notes: "3–5 m." },
    shelter: "Όλοι", exposure: "ισχυροί ΝΑ",
    hazards: [{ label: "Silting", sev: 1 }],
    sources: ["Sea Guide Vol. 3 p. 20"]
  },
  "Agios Spyridon Harbour": {
    vhf: "—",
    anchorage: { holding: "sand", notes: "Ρηχά 2–3 m." },
    shelter: "Όλοι πλην Α", exposure: "Α",
    hazards: [{ label: "Silting in corners", sev: 1 }],
    sources: ["Sea Guide Vol. 3 p. 20"]
  },
  "Vidavi Bay": {
    anchorage: { holding: "sand", notes: "6–10 m." },
    shelter: "ΝΑ–ΑΝΕ", exposure: "ΝΔ",
    hazards: [{ label: "Shoals at pier base", sev: 1 }],
    sources: ["Sea Guide Vol. 3 p. 21"]
  },
  "Eratini Harbour": {
    vhf: "12",
    anchorage: { holding: "mud/sand", notes: "4–6 m." },
    shelter: "Ν–ΝΔ", exposure: "Β–ΒΑ",
    hazards: [{ label: "Rocks near N mole", sev: 2 }],
    sources: ["Sea Guide Vol. 3 p. 22"]
  },
  "Panormos Harbour": {
    vhf: "12",
    anchorage: { holding: "sand/mud", notes: "5–10 m." },
    shelter: "Ν–ΝΔ", exposure: "ΒΑ",
    hazards: [{ label: "Shallows/rocks at entrance", sev: 1 }],
    sources: ["Sea Guide Vol. 3 p. 22"]
  },
  "Trizonia Marina": {
    vhf: "12",
    anchorage: { holding: "mud", notes: "5–7 m." },
    shelter: "Όλοι πλην ΒΑ", exposure: "ΒΑ",
    hazards: [{ label: "Wreck/Chains on bottom", sev: 1 }],
    sources: ["Sea Guide Vol. 3 p. 23"]
  },
  "Glyfada Harbour (Sterea Ellada)": {
    vhf: "12",
    anchorage: { holding: "sand", notes: "3–5 m." },
    shelter: "Ν–Δ", exposure: "ΒΑ",
    hazards: [{ label: "Shoals close to mole", sev: 1 }],
    sources: ["Sea Guide Vol. 3 p. 23"]
  },
  "Nafpaktos Harbour": {
    vhf: "12",
    anchorage: { holding: "sand/mud", notes: "8–10 m εκτός λιμένα." },
    shelter: "Ν–Δ", exposure: "ΒΑ",
    hazards: [{ label: "Silting at entrance", sev: 2 }, { label: "Surge with northerlies", sev: 1 }],
    sources: ["Sea Guide Vol. 3 p. 24"]
  },
  "Monastiraki Bay": {
    anchorage: { holding: "sand", notes: "6–8 m." },
    shelter: "Ν–Δ", exposure: "ΒΑ",
    hazards: [{ label: "Rocks near outer mole", sev: 2 }],
    sources: ["Sea Guide Vol. 3 p. 24"]
  },
  "Marathias Harbour": {
    vhf: "12",
    anchorage: { holding: "sand/mud", notes: "4–6 m." },
    shelter: "Ν–ΝΔ", exposure: "ΒΑ",
    hazards: [{ label: "Silting", sev: 1 }],
    sources: ["Sea Guide Vol. 3 p. 24"]
  },

  /* ======== PATRAS–MESOLOGGI–OXIA–KYLLINI–ZAKYNTHOS (pp.25–39) ======== */
  "Rio–Antirrio": {
    vhf: "12",
    anchorage: { holding: "mud/sand", notes: "Περιοχή αναμονής 8–12 m." },
    shelter: "Ν–Δ", exposure: "Β–ΒΑ",
    hazards: [{ label: "Strong currents under bridge", sev: 2 }, { label: "Traffic separation zone", sev: 1 }],
    sources: ["Sea Guide Vol. 3 p. 28"]
  },
  "Agios Pantelimonas Harbour": {
    vhf: "12",
    anchorage: { holding: "sand", notes: "2–3 m, μικρός μόλος." },
    shelter: "Δ–ΝΔ", exposure: "ΒΑ",
    hazards: [{ label: "Silting at entrance", sev: 1 }],
    sources: ["Sea Guide Vol. 3 p. 28"]
  },
  "Makrynia Harbour": {
    anchorage: { holding: "mud", notes: "Ρηχά < 2 m. Καλό κράτημα." },
    shelter: "Ν–ΝΔ", exposure: "ΒΑ",
    hazards: [{ label: "Shoaling at pier head", sev: 1 }],
    sources: ["Sea Guide Vol. 3 p. 26"]
  },
  "Kato Vasilikis Harbour": {
    anchorage: { holding: "sand", notes: "Κράτημα με ρηχά ~2 m κοντά στο μόλο." },
    shelter: "ΝΔ", exposure: "ΒΑ",
    hazards: [{ label: "Silting at entrance", sev: 1 }],
    sources: ["Sea Guide Vol. 3 p. 26"]
  },
  "Kryoneri Harbour": {
    vhf: "12",
    anchorage: { holding: "sand", notes: "5–7 m· ρηχό προς Α." },
    shelter: "ΝΔ", exposure: "ΒΑ",
    hazards: [{ label: "Variable depths (continuous silt)", sev: 2 }, { label: "Strong S swell", sev: 1 }],
    sources: ["Sea Guide Vol. 3 p. 29"]
  },
  "Oxia Island Anchorages": {
    anchorage: { holding: "sand/rock", notes: "Νότια/Α πλευρές καλές· NW ρηχά patches." },
    shelter: "ΒΑ–ΑΝΑ", exposure: "ΝΔ",
    hazards: [{ label: "Shallow patches off NW coast", sev: 2 }, { label: "Strong currents between islets", sev: 1 }],
    sources: ["Sea Guide Vol. 3 p. 29"]
  },
  "Paralia Kato Achaia Harbour": {
    vhf: "12",
    anchorage: { holding: "sand/mud", notes: "Καλό κράτημα εντός· ρηχά στις άκρες." },
    shelter: "Α–ΝΑ", exposure: "ΒΔ",
    hazards: [{ label: "Silt at entrance", sev: 1 }],
    sources: ["Sea Guide Vol. 3 p. 29"]
  },
  "Mesolongi Marina": {
    vhf: "12",
    anchorage: { holding: "mud", notes: "Κανάλι ~2.5 NM προς το λιμάνι." },
    shelter: "Πλήρης εκτός ΝΔ", exposure: "ΝΔ (εξωτερικό κανάλι)",
    hazards: [{ label: "Narrow entrance channel", sev: 2 }, { label: "Silting in channel", sev: 2 }],
    sources: ["Sea Guide Vol. 3 p. 30"]
  },
  "Patras Marina": {
    vhf: "12",
    anchorage: { holding: "mud/sand", notes: "8–10 m εκτός λιμένα." },
    shelter: "Ν–Δ", exposure: "Β–ΒΑ",
    hazards: [{ label: "Strong swell during NW winds", sev: 2 }],
    sources: ["Sea Guide Vol. 3 p. 32"]
  },
  "Kyllini Harbour": {
    vhf: "12",
    anchorage: { holding: "sand/mud", notes: "7–10 m εκτός." },
    shelter: "Ν–ΝΔ", exposure: "ΒΑ",
    hazards: [{ label: "Ferry traffic", sev: 1 }],
    sources: ["Sea Guide Vol. 3 p. 32"]
  },
  "Mesolongi Channel Approach": {
    anchorage: { holding: "mud", notes: "Ρηχό κανάλι 2–3 m." },
    hazards: [{ label: "Silt build-up in channel", sev: 2 }],
    notes: ["Επικοινωνία με Harbour Office πριν την είσοδο."],
    sources: ["Sea Guide Vol. 3 p. 30"]
  },
  "Glyfa Harbour (Peloponnese)": {
    vhf: "12",
    anchorage: { holding: "sand", notes: "Ρηχό για μικρά σκάφη." },
    shelter: "Ν–ΝΔ", exposure: "ΒΑ",
    hazards: [{ label: "Silting in basin", sev: 1 }],
    sources: ["Sea Guide Vol. 3 p. 34"]
  },
  "Arkoudi Cove": {
    anchorage: { holding: "sand", notes: "Καθαρός βυθός, 2–3 m." },
    shelter: "Α–ΝΑ", exposure: "Δ",
    sources: ["Sea Guide Vol. 3 p. 34"]
  },
  "Palouki Harbour": {
    vhf: "12",
    anchorage: { holding: "sand/mud", notes: "Καλή κράτηση εντός." },
    shelter: "ΝΔ", exposure: "ΒΑ",
    hazards: [{ label: "Silting in entrance", sev: 1 }],
    sources: ["Sea Guide Vol. 3 p. 36"]
  },
  "Katakolo Harbour": {
    vhf: "12",
    anchorage: { holding: "mud/sand", notes: "8–10 m εκτός." },
    shelter: "ΝΔ", exposure: "ΒΑ",
    hazards: [{ label: "Works / Cruise traffic", sev: 1 }],
    sources: ["Sea Guide Vol. 3 p. 36"]
  },
  "Alykes Harbour (Zakynthos)": {
    vhf: "12",
    anchorage: { holding: "sand", notes: "Ρηχά στο Ν τμήμα." },
    shelter: "Ν–ΝΔ", exposure: "ΒΑ",
    hazards: [{ label: "Rocks along E side", sev: 2 }],
    sources: ["Sea Guide Vol. 3 p. 38"]
  },
  "Zakynthos Harbour": {
    vhf: "12",
    anchorage: { holding: "sand/mud", notes: "10–12 m εκτός." },
    shelter: "Ν–Δ", exposure: "Β–ΒΑ",
    hazards: [{ label: "Silting in berthing area", sev: 1 }],
    sources: ["Sea Guide Vol. 3 pp. 37–39"]
  },

  /* ======== WEST PELOPONNESE & ZAKYNTHOS EXTENDED (pp.41–50) ======== */
  "Kyparissia Harbour": {
    vhf: "12",
    anchorage: { holding: "sand/mud", notes: "4–6 m, silting είσοδος." },
    shelter: "Ν–Δ", exposure: "Β–ΒΑ",
    hazards: [{ label: "Silting at entrance", sev: 2 }],
    sources: ["Sea Guide Vol. 4 p. 41"]
  },
  "Strofades Islets": {
    anchorage: { holding: "sand", notes: "5–10 m· Natura υπό όρους." },
    shelter: "ΒΔ", exposure: "Ν–ΝΑ",
    hazards: [{ label: "Shallow reefs", sev: 2 }, { label: "Restricted area (NMPZ)", sev: 1 }],
    sources: ["Sea Guide Vol. 4 p. 41"]
  },
  "Agios Kyriaki Harbour": {
    anchorage: { holding: "sand/mud", notes: "1.5–2 m· μόνο μικρά." },
    shelter: "Δ–ΝΔ", exposure: "ΒΑ",
    hazards: [{ label: "Shallow approach", sev: 1 }],
    sources: ["Sea Guide Vol. 4 p. 45"]
  },
  "Marmari Bay": {
    anchorage: { holding: "sand", notes: "Ρηχά κοντά στην ακτή." },
    shelter: "Α–ΝΑ", exposure: "Δ",
    sources: ["Sea Guide Vol. 4 p. 46"]
  },
  "Marathopoli Harbour": {
    vhf: "12",
    anchorage: { holding: "sand", notes: "4–6 m· προσοχή σε W swell." },
    shelter: "Α–ΝΑ", exposure: "Δ–ΝΔ",
    hazards: [{ label: "Surf swell from W", sev: 1 }],
    sources: ["Sea Guide Vol. 4 p. 47"]
  },
  "Navarino Bay (Pylos)": {
    vhf: "12",
    anchorage: { holding: "sand/mud", notes: "5–10 m σε όλο τον όρμο." },
    shelter: "Σχεδόν πλήρης", exposure: "ΝΔ swell",
    hazards: [{ label: "Countercurrents near entrance", sev: 1 }, { label: "Occasional violent NW winds", sev: 2 }],
    sources: ["Sea Guide Vol. 4 p. 48"]
  },
  "Voïdokilia Bay": {
    anchorage: { holding: "sand", notes: "2–4 m· μόνο ημερήσιο." },
    shelter: "Α–ΝΑ", exposure: "Β–ΒΔ",
    sources: ["Sea Guide Vol. 4 p. 49"]
  },
  "Pylos Marina": {
    vhf: "12",
    anchorage: { holding: "sand/mud", notes: "4–6 m στον μόλο." },
    shelter: "Δ–ΝΔ", exposure: "ΒΑ",
    hazards: [{ label: "Occasional surge", sev: 1 }],
    sources: ["Sea Guide Vol. 4 p. 49"]
  },
  "Finikounda Harbour": {
    vhf: "12",
    anchorage: { holding: "sand/mud", notes: "3–5 m." },
    shelter: "ΝΔ", exposure: "Β–ΒΑ",
    hazards: [{ label: "Underwater rocks at entrance", sev: 1 }],
    sources: ["Sea Guide Vol. 4 p. 49"]
  },
  "Agios Nikolaos (Skinari, Zakynthos)": {
    vhf: "12",
    anchorage: { holding: "sand/rock", notes: "Προστασία Ν–ΝΔ." },
    shelter: "Ν–ΝΔ", exposure: "ΒΑ",
    hazards: [{ label: "Surge from NE", sev: 1 }, { label: "Narrow entrance", sev: 1 }],
    sources: ["Sea Guide Vol. 4 p. 43"]
  },
  "Agios Sostis Harbour (Zakynthos)": {
    vhf: "12",
    anchorage: { holding: "sand", notes: "3–5 m· μικρός μόλος." },
    shelter: "ΝΔ", exposure: "ΒΑ",
    hazards: [{ label: "Shallow near mole", sev: 1 }],
    sources: ["Sea Guide Vol. 4 p. 43"]
  },
  "Kerì Bay (Zakynthos)": {
    anchorage: { holding: "sand/mud", notes: "4–8 m· εξαιρετικό κράτημα." },
    shelter: "Ν–ΝΑ", exposure: "Β–ΒΔ",
    hazards: [{ label: "Swell from NW winds", sev: 1 }],
    sources: ["Sea Guide Vol. 4 p. 42"]
  },
  "Tsilivi Harbour (Zakynthos)": {
    anchorage: { holding: "sand", notes: "Ρηχό ~2 m." },
    shelter: "Ν–ΝΑ", exposure: "ΒΔ",
    hazards: [{ label: "Silting in basin", sev: 1 }],
    sources: ["Sea Guide Vol. 4 p. 42"]
  },
  "Makris Gialos (Zakynthos)": {
    anchorage: { holding: "sand", notes: "4–8 m· καθαρά νερά." },
    shelter: "Ν–Α", exposure: "Β–ΒΔ",
    hazards: [{ label: "Reefs near shore", sev: 1 }],
    sources: ["Sea Guide Vol. 4 p. 42"]
  },

  /* ======== MESSINIA & MANI (Sea Guide Vol.4 pp. 51–59) ======== */
  "Methodi Harbour": {
    vhf: "12",
    anchorage: { holding: "sand/mud", notes: "4–6 m, άμμος/λάσπη." },
    shelter: "ΒΑ–Α", exposure: "ΝΔ–Δ",
    hazards: [{ label: "Reefs near entrance", sev: 2 }, { label: "Cross-currents inside bay", sev: 1 }],
    sources: ["Sea Guide Vol.4 p.51"]
  },
  "Petalidi Harbour": {
    vhf: "12",
    anchorage: { holding: "sand", notes: "Ρηχό· για μικρά." },
    shelter: "Ν–ΝΑ", exposure: "Β–ΒΔ",
    hazards: [{ label: "Shallow at entrance", sev: 1 }],
    sources: ["Sea Guide Vol.4 p.51"]
  },
  "Kalamata Marina": {
    vhf: "69",
    anchorage: { holding: "sand/mud", notes: "4–10 m μέσα στο λιμάνι." },
    shelter: "Πλήρης", exposure: "SE (surge)",
    hazards: [{ label: "Surge during SE winds", sev: 1 }],
    sources: ["Sea Guide Vol.4 p.53"]
  },
  "Kitries Harbour": {
    anchorage: { holding: "sand/rock", notes: "3–6 m· άμμος/βράχος." },
    shelter: "Ν–ΝΔ", exposure: "Β–ΒΑ",
    hazards: [{ label: "Strong gusts in summer", sev: 1 }],
    sources: ["Sea Guide Vol.4 p.53"]
  },
  "Kardamyli Harbour": {
    anchorage: { holding: "sand/rock", notes: "4–8 m· προσοχή στους βράχους." },
    shelter: "Ν–ΝΑ", exposure: "Β–ΒΑ",
    hazards: [{ label: "Rocks near breakwater", sev: 2 }, { label: "Strong gorge gusts", sev: 1 }],
    sources: ["Sea Guide Vol.4 p.54"]
  },
  "Kotrona Harbour": {
    anchorage: { holding: "sand/mud", notes: "3–5 m· ήρεμο καταφύγιο." },
    shelter: "Β–ΒΑ", exposure: "Ν–ΝΔ",
    hazards: [{ label: "Rolling from swell", sev: 1 }],
    sources: ["Sea Guide Vol.4 p.58"]
  },
  "Porto Kagio": {
    anchorage: { holding: "sand/mud", notes: "5–10 m· πλήρης προστασία." },
    shelter: "Σχεδόν πλήρης", exposure: "ΒΑ ριπές",
    hazards: [{ label: "Occasional surge during strong NE", sev: 1 }],
    sources: ["Sea Guide Vol.4 p.59"]
  },
  "Vathy Bay (Poseidonia)": {
    anchorage: { holding: "sand", notes: "4–8 m." },
    shelter: "Δ–ΝΔ", exposure: "ΒΑ",
    hazards: [{ label: "Narrow entrance", sev: 1 }],
    sources: ["Sea Guide Vol.4 p.59"]
  },
  "Asomaton Bay": {
    anchorage: { holding: "sand", notes: "5–10 m· καλά προφυλαγμένο." },
    shelter: "Ν–ΝΔ", exposure: "ΒΑ",
    sources: ["Sea Guide Vol.4 p.59"]
  },
  "Limeni Bay": {
    anchorage: { holding: "sand/rock", notes: "4–8 m· περιορισμένος χώρος." },
    shelter: "ΝΔ–Δ", exposure: "ΒΑ",
    hazards: [{ label: "Rolling from afternoon winds", sev: 1 }],
    sources: ["Sea Guide Vol.4 p.55"]
  },
  "Dirou Bay": {
    anchorage: { holding: "sand/mud", notes: "4–7 m· επηρεάζεται από NW." },
    shelter: "Ν–ΝΔ", exposure: "Β–ΒΔ",
    hazards: [{ label: "Rolling from NW in summer", sev: 1 }],
    sources: ["Sea Guide Vol.4 p.55"]
  },
  "Mezapos Harbour": {
    anchorage: { holding: "sand/rock", notes: "5–8 m· στενός όρμος." },
    shelter: "Ν–ΝΔ", exposure: "ΒΑ",
    hazards: [{ label: "Rocks near entrance", sev: 2 }, { label: "Strong gusts in summer", sev: 1 }],
    sources: ["Sea Guide Vol.4 p.56"]
  },
  "Gerolimenas Harbour": {
    anchorage: { holding: "sand/rock", notes: "4–8 m· περιορισμένος χώρος." },
    shelter: "Ν–ΝΔ", exposure: "Β–ΒΑ",
    hazards: [{ label: "Surge during strong NW winds", sev: 1 }],
    sources: ["Sea Guide Vol.4 p.56"]
  },

  /* ======== LACONIA REGION (Sea Guide Vol. 4 pp. 60–62) ======== */
  "Gytheio Harbour": {
    vhf: "12",
    anchorage: { holding: "mud/sand", notes: "6–10 m μέσα στον όρμο." },
    shelter: "ΝΔ–ΒΔ", exposure: "Α–ΝΑ",
    hazards: [{ label: "Shallow mole extension (works)", sev: 2 }, { label: "Onshore winds swell in harbour", sev: 1 }],
    sources: ["Sea Guide Vol. 4 p. 61"]
  },
  "Elia Bay (Laconia)": {
    anchorage: { holding: "sand/rock", notes: "4–6 m· άμμος με βράχο." },
    shelter: "Ν–ΝΑ", exposure: "Β–ΒΔ",
    hazards: [{ label: "Rocks near pier and entrance", sev: 1 }],
    sources: ["Sea Guide Vol. 4 p. 61"]
  },
  "Skoutari Harbour": {
    anchorage: { holding: "sand", notes: "4–8 m· ύφαλοι ανατολικά." },
    shelter: "Ν–ΝΑ", exposure: "Β–ΒΔ",
    hazards: [{ label: "Underwater rocks by pier", sev: 2 }, { label: "Strong NE gusts", sev: 1 }],
    sources: ["Sea Guide Vol. 4 p. 60"]
  },
  "Plitra Harbour": {
    anchorage: { holding: "mud/sand", notes: "4–6 m· προστατευμένο." },
    shelter: "ΝΔ–Δ", exposure: "Α–ΒΑ",
    hazards: [{ label: "Shallow approach", sev: 1 }],
    sources: ["Sea Guide Vol. 4 p. 62"]
  },
  "Archangelos Bay (Laconia)": {
    anchorage: { holding: "sand", notes: "3–5 m· ήσυχο αγκυροβόλιο." },
    shelter: "ΝΔ", exposure: "Α–ΒΑ",
    hazards: [{ label: "Reefs off entrance", sev: 1 }],
    sources: ["Sea Guide Vol. 4 p. 62"]
  },
  "Kokkiniá Pier and Harbour": {
    anchorage: { holding: "sand/mud", notes: "Ρηχά 3 m· μόνο για μικρά σκάφη." },
    shelter: "ΝΔ", exposure: "ΒΑ",
    sources: ["Sea Guide Vol. 4 p. 60"]
  },
  "Kalyvia Pier": {
    anchorage: { holding: "sand", notes: "3–4 m με καλή κράτηση." },
    shelter: "Ν–ΝΔ", exposure: "ΒΑ",
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

  // Korinthia & Canal
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
  "λουτρακι": "Vouliagmeni / Loutraki Bay",
  "βουλιαγμενη λουτρακι": "Vouliagmeni / Loutraki Bay",
  "βουλιαγμενη κορινθιας": "Vouliagmeni / Loutraki Bay",
  "λιμανι λουτρακιου": "Loutraki Harbour",
  "μαυρολιμνη": "Mavrolimni Harbour",
  "νεα μαυρα λιμνη": "Mavrolimni Harbour",
  "λιμανι μαυρολιμνης": "Mavrolimni Harbour",

  // Sterea – Antikyra/Ag.Isidoros/Noussa
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

  // Sterea/Korinthia additions
  "στραβα": "Strava Cove",
  "ορμος στραβας": "Strava Cove",
  "κολπος στραβας": "Strava Cove",
  "κατω ασσος": "Kato Assos",
  "λιμανι κατω ασσου": "Kato Assos",
  "ασσος κορινθιας": "Kato Assos",
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

  // Western Korinthian & Itea–Nafpaktos
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

  // Patras–Mesolongi–Oxia–Kyllini–Zakynthos
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

  // West Peloponnese & Zakynthos extended
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

  // Messinia & Mani
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

  // Laconia
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
  // direct match
  for (const k of Object.keys(FACTS)) if (normalize(k) === key) return k;
  // alias match
  const aliased = ALIASES[key];
  if (aliased) return aliased;
  return undefined;
}

export function getPortFacts(name: string): PortFact | undefined {
  if (!name) return undefined;
  const k = resolveKey(name);
  return k ? FACTS[k] : undefined;
}

export const PORT_FACTS_DATA = FACTS;
