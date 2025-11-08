// lib/portsDisplay.ts

export type PortCore = {
  id: string;
  name: string;                             // canonical name
  aliases?: string[];                       // π.χ. ["Agia Marina (Aegina)", "Agia Marina"]
  region?: string;
  type?: "port" | "marina" | "anchorage";
};

export type PickerOption = {
  value: string;                            // port id
  label: string;                            // ΜΟΝΟ όνομα για εμφάνιση
  searchText: string;                       // name + aliases (lowercased)
};

/**
 * Επιλέγουμε ένα "displayLabel" ΜΟΝΟ για εμφάνιση.
 * Αν υπάρχει alias με παρένθεση (π.χ. "Agia Marina (Aegina)"), το προτιμάμε.
 * Αλλιώς δείχνουμε το canonical name.
 */
export function chooseDisplayName(p: PortCore): string {
  const withIsland = p.aliases?.find((a) => /\(.+\)/.test(a));
  return withIsland ?? p.name;
}

/**
 * Χτίζουμε search text ΜΟΝΟ από name + aliases (όχι facts).
 */
export function buildSearchText(p: PortCore): string {
  const aliasStr = (p.aliases ?? []).join(" ");
  return `${p.name} ${aliasStr} ${p.region ?? ""}`.toLowerCase().trim();
}

/**
 * Μετασχηματίζει τα ports σε options για dropdown.
 */
export function toPickerOptions(ports: PortCore[]): PickerOption[] {
  return ports.map((p) => ({
    value: p.id,
    label: chooseDisplayName(p),  // ΜΟΝΟ όνομα για εμφάνιση
    searchText: buildSearchText(p),
  }));
}
