// app/api/ports/merged/route.ts
import { NextResponse } from "next/server";
export const runtime = "nodejs";

import { buildMergedPorts } from "@/lib/portsMerged";

/* ================= helpers ================= */
type PortCategory = "harbor" | "marina" | "anchorage" | "spot";

function classifyCategory(name: string): PortCategory {
  const n = (name || "").toLowerCase();
  if (n.includes("marina")) return "marina";
  if (n.includes("bay") || n.includes("cove") || n.includes("anchorage")) return "anchorage";
  if (n.includes("canal")) return "spot";
  return "harbor";
}

function stripParen(s: string) {
  return (s || "").replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s{2,}/g, " ").trim();
}
function deaccent(s: string) {
  return (s || "").normalize("NFD").replace(/\p{Diacritic}/gu, "");
}
function uniq(arr: string[]) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of arr) {
    const k = (x || "").trim();
    if (!k) continue;
    if (!seen.has(k)) { seen.add(k); out.push(k); }
  }
  return out;
}

/** EN -> EL token mapping (για άμεσες μεταφράσεις πάνω στο όνομα) */
const TOKEN_EN2EL: Record<string, string> = {
  "Old Harbour": "Παλαιό Λιμάνι",
  "Old Harbor": "Παλαιό Λιμάνι",
  "Harbour": "Λιμάνι",
  "Harbor": "Λιμάνι",
  "Marina": "Μαρίνα",
  "Bay": "Όρμος",
  "Cove": "Όρμος",
  "Anchorage": "Όρμος",
  "Canal": "Διώρυγα",
  "Lagoon": "Λιμνοθάλασσα",
  "Islet": "Νησίδα",
  "Island": "Νησί",
};

/** Islands/areas/regions EN -> EL */
const PLACE_EN2EL: Record<string, string> = {
  // Ionian / Peloponnese bits we έχουμε ήδη
  "Zakynthos": "Ζάκυνθος",
  "Zante": "Ζάκυνθος",
  "Kerì": "Κερί",
  "Keri": "Κερί",
  "Glyfada": "Γλυφάδα",
  "Corinth": "Κόρινθος",
  "Korinth": "Κόρινθος",
  "Kiato": "Κιάτο",
  "Vrachati": "Βραχάτι",
  "Lechaion": "Λέχαιο",
  "Loutraki": "Λουτράκι",
  "Mavrolimni": "Μαυρολίμνη",
  "Antikyra": "Αντίκυρα",
  "Agios": "Άγιος",
  "Nikolaos": "Νικόλαος",
  "Isidoros": "Ισίδωρος",
  "Ioannis": "Ιωάννης",
  "Paralia": "Παραλία",
  "Saranti": "Σαράντη",
  "Aliki": "Αλυκή",
  "Vidavi": "Βιδάβη",
  "Eratini": "Ερατεινή",
  "Panormos": "Πάνορμος",
  "Nafpaktos": "Ναύπακτος",
  "Monastiraki": "Μοναστηράκι",
  "Marathias": "Μαραθιάς",
  "Aigio": "Αίγιο",
  "Akrata": "Ακράτα",
  "Diakopto": "Διακοπτό",
  "Mesolongi": "Μεσολόγγι",
  "Kyllini": "Κυλλήνη",
  "Arkoudi": "Αρκούδι",
  "Palouki": "Παλούκι",
  "Katakolo": "Κατάκολο",
  "Kyparissia": "Κυπαρισσία",
  "Marathopoli": "Μαραθόπολη",
  "Navarino": "Ναυαρίνο",
  "Pylos": "Πύλος",
  "Finikounda": "Φοινικούντα",
  "Porto Kagio": "Πόρτο Κάγιο",
  "Vathy": "Βαθύ",
  "Asomaton": "Ασωμάτων",
  "Limeni": "Λιμένι",
  "Dirou": "Διρού",
  "Mezapos": "Μεζαπό",
  "Gerolimenas": "Γερολιμένας",
  "Gytheio": "Γύθειο",
  "Skoutari": "Σκουτάρι",
  "Plitra": "Πλύτρα",
  "Archangelos": "Αρχάγγελος",
  "Kokkiniá": "Κοκκινιά",
  "Kalyvia": "Καλύβια",
  // Regions
  "Korinthia": "Κορινθία",
  "Sterea Ellada": "Στερεά Ελλάδα",
  "Achaia": "Αχαΐα",
  "Fokida": "Φωκίδα",
  "Viotia": "Βοιωτία",
  "Messinia": "Μεσσηνία",
  "Laconia": "Λακωνία",
};

/** Επιπλέον χειροκίνητα aliases για δύσκολα cases */
const EXTRA_ALIASES: Record<string, string[]> = {
  // που ζήτησες ρητά:
  "Kerì Bay (Zakynthos)": [
    "Kerì Bay", "Keri Bay", "Keri",
    "Κερί", "Κόλπος Κερίου"
  ],
  "Glyfada Harbour (Sterea Ellada)": [
    "Glyfada Harbour",
    "Γλυφάδα", "Λιμάνι Γλυφάδας"
  ],
  // μερικά ακόμη χρήσιμα short:
  "Navarino Bay (Pylos)": ["Navarino", "Ναυαρίνο"],
  "Porto Kagio": ["Πόρτο Κάγιο"],
  "Corinth Harbour": ["Κόρινθος", "Λιμάνι Κορίνθου"],
  "Korinth Canal (Isthmus)": ["Corinth Canal", "Διώρυγα Κορίνθου", "Ίσθμια"],
};

/** Δημιουργεί ελληνικό alias αντικαθιστώντας tokens & τοπωνύμια όπου γίνεται */
function greekifyName(name: string): string[] {
  const base = stripParen(name);

  // αντικατάσταση tokens (Harbour, Bay, Marina, …)
  let greek = base;
  // πρώτα multi-word tokens (Old Harbour κ.λπ.)
  const ordered = Object.keys(TOKEN_EN2EL).sort((a,b)=>b.length-a.length);
  for (const key of ordered) {
    const re = new RegExp(`\\b${key}\\b`, "gi");
    greek = greek.replace(re, TOKEN_EN2EL[key]);
  }
  // αντικατάσταση γνωστών τοπωνυμίων
  for (const key of Object.keys(PLACE_EN2EL).sort((a,b)=>b.length-a.length)) {
    const re = new RegExp(`\\b${key}\\b`, "g");
    greek = greek.replace(re, PLACE_EN2EL[key]);
  }

  // Αν μέσα σε παρενθέσεις είχε περιοχή (π.χ. Zakynthos, Sterea Ellada) πρόσθεσε σκέτες
  const paren = (name.match(/\(([^)]+)\)/)?.[1] || "").trim();
  const extras: string[] = [];
  if (paren) {
    if (PLACE_EN2EL[paren]) extras.push(PLACE_EN2EL[paren]);
    else extras.push(paren);
  }

  // Μερικά καθαρίσματα
  greek = greek.replace(/\s{2,}/g, " ").trim();

  const out = [greek, ...extras].filter(Boolean);
  return uniq(out);
}

export async function GET() {
  try {
    const merged = buildMergedPorts();

    const ports = merged
      .filter(p => typeof p.lat === "number" && typeof p.lon === "number")
      .map(p => {
        const name = p.name;
        const base = stripParen(name);
        const cat: PortCategory = classifyCategory(name);

        const autoAliases: string[] = [
          base,               // χωρίς παρενθέσεις (EN)
          deaccent(name),     // χωρίς τόνους (EN)
          deaccent(base),     // χωρίς τόνους (EN) & χωρίς παρενθέσεις
          ...greekifyName(name), // ελληνικές παραλλαγές
        ];

        const manual = EXTRA_ALIASES[name] ?? [];
        const aliases = uniq([name, ...autoAliases, ...manual]);

        return {
          id: name.toLowerCase().replace(/\s+/g, "-"),
          name,
          lat: p.lat as number,
          lon: p.lon as number,
          category: cat,
          region: p.region || "Greece",
          aliases,
        };
      });

    return NextResponse.json(ports, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "merge failed" }, { status: 500 });
  }
}
