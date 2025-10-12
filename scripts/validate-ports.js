#!/usr/bin/env node
// Usage: node scripts/validate-ports.js public/data/ports.v1.json
const fs = require("fs");
const path = process.argv[2] || "public/data/ports.v1.json";

const ALLOWED_CATEGORIES = new Set(["marina", "harbor", "anchorage", "spot"]);
const ALLOWED_REGIONS = new Set(["Saronic","Cyclades","Ionian","Dodecanese","Sporades","NorthAegean","Crete"]);

function die(msg, code=1){ console.error(msg); process.exit(code); }

if (!fs.existsSync(path)) die(`❌ File not found: ${path}`);

let data;
try {
  data = JSON.parse(fs.readFileSync(path, "utf8"));
} catch (e) { die(`❌ JSON parse error in ${path}:\n${e.message}`); }

if (!Array.isArray(data)) die("❌ Root must be an array of port objects.");

const ids = new Set();
const errors = [];
const counts = { total: 0, byRegion: {}, byCategory: {} };
const inc = (m,k)=> (m[k]=(m[k]||0)+1);

data.forEach((p, idx) => {
  const where = `#${idx} (id=${p && p.id})`;
  for (const f of ["id","name","lat","lon","category","region"]) {
    if (!(f in p)) errors.push(`• ${where}: missing "${f}"`);
  }
  if (p.id != null) {
    if (ids.has(p.id)) errors.push(`• ${where}: duplicate id "${p.id}"`);
    ids.add(p.id);
  }
  if (typeof p.lat !== "number" || p.lat < -90 || p.lat > 90)
    errors.push(`• ${where}: lat must be number in [-90, 90]`);
  if (typeof p.lon !== "number" || p.lon < -180 || p.lon > 180)
    errors.push(`• ${where}: lon must be number in [-180, 180]`);
  if (!ALLOWED_CATEGORIES.has(p.category))
    errors.push(`• ${where}: invalid category "${p.category}"`);
  if (!ALLOWED_REGIONS.has(p.region))
    errors.push(`• ${where}: invalid region "${p.region}"`);
  if ("aliases" in p && !Array.isArray(p.aliases))
    errors.push(`• ${where}: aliases must be an array`);

  counts.total++; inc(counts.byRegion, p.region); inc(counts.byCategory, p.category);
});

if (errors.length) {
  console.error("❌ Validation failed:");
  for (const e of errors) console.error(e);
  console.error(`\n— ${errors.length} error(s) total.`);
  process.exit(1);
}

console.log("✅ Validation passed.");
console.log(
  `Total: ${counts.total}\nBy region: ${JSON.stringify(counts.byRegion, null, 2)}\nBy category: ${JSON.stringify(counts.byCategory, null, 2)}`
);
