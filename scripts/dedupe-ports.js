#!/usr/bin/env node
// Usage: node scripts/dedupe-ports.js public/data/ports.v1.json
const fs = require("fs");
const file = process.argv[2] || "public/data/ports.v1.json";

if (!fs.existsSync(file)) {
  console.error("❌ File not found:", file);
  process.exit(1);
}

const raw = fs.readFileSync(file, "utf8");
let data;
try {
  data = JSON.parse(raw);
} catch (e) {
  console.error("❌ JSON parse error:", e.message);
  process.exit(1);
}
if (!Array.isArray(data)) {
  console.error("❌ Root must be array");
  process.exit(1);
}

// Κρατά το ΤΕΛΕΥΤΑΙΟ occurrence για κάθε id
const seen = new Map();
const removed = [];
for (const p of data) {
  if (!p || !p.id) continue;
  if (seen.has(p.id)) removed.push(p.id);
  seen.set(p.id, p);
}

// Ταξινόμηση για καθαρό diff
const REGION_ORDER = ["Saronic","Cyclades","Ionian","Dodecanese","Sporades","NorthAegean","Crete"];
const out = [...seen.values()].sort((a,b)=>{
  const ar = REGION_ORDER.indexOf(a.region), br = REGION_ORDER.indexOf(b.region);
  if (ar !== br) return ar - br;
  return (a.name || "").localeCompare(b.name || "");
});

// Backup + γράψιμο
const backup = `${file}.bak`;
fs.writeFileSync(backup, raw);
fs.writeFileSync(file, JSON.stringify(out, null, 2));

console.log(`✅ Deduped & sorted.`);
console.log(`• Original: ${data.length} entries`);
console.log(`• Unique  : ${out.length} entries`);
if (removed.length) {
  const uniqRemoved = [...new Set(removed)];
  console.log(`• Removed duplicates (IDs): ${uniqRemoved.length}`);
  console.log(uniqRemoved.slice(0, 50).join(", ") + (uniqRemoved.length > 50 ? ", ..." : ""));
}
console.log(`💾 Backup saved at: ${backup}`);
