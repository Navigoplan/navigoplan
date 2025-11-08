// lib/sgWeather.ts
// Διαβάζει περιγραφικό "weather" από το /public/data/sea_guide_vol3_master.json
// και επιστρέφει { el?: string; en?: string } για δοσμένο λιμάνι (EN/EL).

type SGRow = {
  name?: { el?: string; en?: string };
  weather?: { el?: string; en?: string };
};

const _cache = new Map<string, { el?: string; en?: string }>();
let _loaded = false;

function norm(s = "") {
  return s.trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

async function _ensureLoaded() {
  if (_loaded) return;

  try {
    const res = await fetch("/data/sea_guide_vol3_master.json", { cache: "force-cache" });
    if (!res.ok) { _loaded = true; return; }
    const list = (await res.json()) as SGRow[];

    for (const r of list) {
      const en = r.name?.en?.trim();
      const el = r.name?.el?.trim();
      if (!en && !el) continue;
      const wx = r.weather ? { en: r.weather.en, el: r.weather.el } : undefined;
      if (!wx) continue;

      if (en) _cache.set(norm(en), wx);
      if (el) _cache.set(norm(el), wx);
    }
  } catch {
    // swallow — αν αποτύχει, δεν ρίχνουμε το UI
  } finally {
    _loaded = true;
  }
}

export async function getSGWeather(name: string) {
  if (!name) return undefined;
  const key = norm(name);
  if (_cache.has(key)) return _cache.get(key)!;

  await _ensureLoaded();
  return _cache.get(key);
}
