// Cleanor Search Index — pure transforms shared by fetch.mjs (live) and
// build.mjs (offline, reproducible). No network, no file I/O here: given a raw
// per-country/per-brand snapshot, produce the compact leaderboard dataset and
// the CSV mirrors. Keeping this side-effect-free is what makes `build.mjs`
// reproducible in CI without any API credentials.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

export function loadConfig() {
  return JSON.parse(
    fs.readFileSync(path.join(ROOT, 'config', 'popularity-config.json'), 'utf8'),
  );
}

const RANK = ['low', 'medium', 'high'];
const strongerComp = (a, b) => (RANK.indexOf(a) > RANK.indexOf(b) ? a : b || a);

// snapData shape: { [countryCode]: { name, geoId, brands: { [brandName]:
//   { avg, competition, monthly: [{ ym, v }] } } } }
//
// Returns { compact, monthlyCsv, summaryCsv } — everything a snapshot produces
// downstream. `month` and `generatedAt` are passed in so this stays pure.
export function computeOutputs({ catKey, cat, codes, countries, snapData, month, generatedAt }) {
  const brandMeta = cat.brands.map((b) => ({ name: b.name, vendor: b.vendor, keys: b.keys }));

  const axis = [
    ...new Set(
      Object.values(snapData).flatMap((c) =>
        Object.values(c.brands).flatMap((b) => b.monthly.map((m) => m.ym)),
      ),
    ),
  ].sort();
  const months = axis.slice(-12);

  function seriesForScope(getBrand) {
    const rows = brandMeta.map((bm) => {
      const src = getBrand(bm.name);
      const map = new Map((src?.monthly || []).map((m) => [m.ym, m.v]));
      const monthly = months.map((mo) => map.get(mo) ?? 0);
      const avg =
        src?.avg ?? Math.round(monthly.reduce((a, v) => a + v, 0) / (monthly.length || 1));
      const last = monthly[monthly.length - 1] || 0;
      const prev = monthly[monthly.length - 2] || 0;
      const first = monthly.find((v) => v > 0) || monthly[0] || 0;
      return {
        name: bm.name,
        vendor: bm.vendor,
        competition: src?.competition || '',
        avg,
        monthly,
        mom: prev ? Math.round(((last - prev) / prev) * 1000) / 10 : null,
        yoy: first ? Math.round(((last - first) / first) * 1000) / 10 : null,
      };
    });
    const total = rows.reduce((a, r) => a + r.avg, 0) || 1;
    rows.sort((a, z) => z.avg - a.avg);
    rows.forEach((r, idx) => {
      r.rank = idx + 1;
      r.share = Math.round((r.avg / total) * 1000) / 10;
    });
    return rows;
  }

  const series = {};
  // Worldwide = per-brand, per-month sum across the tracked countries.
  series.WW = seriesForScope((brandName) => {
    let avg = 0;
    let comp = '';
    const monthlyMap = new Map();
    for (const code of codes) {
      const b = snapData[code]?.brands[brandName];
      if (!b) continue;
      avg += b.avg;
      if (b.competition) comp = strongerComp(b.competition, comp);
      for (const m of b.monthly) monthlyMap.set(m.ym, (monthlyMap.get(m.ym) || 0) + m.v);
    }
    return {
      avg,
      competition: comp,
      monthly: [...monthlyMap.entries()].map(([ym, v]) => ({ ym, v })),
    };
  });
  for (const code of codes)
    series[code] = seriesForScope((brandName) => snapData[code]?.brands[brandName]);

  const compact = {
    category: catKey,
    label: cat.label,
    unit: cat.unit,
    snapshot: month,
    updated: generatedAt,
    source: 'Google Keyword Planner',
    sourceNote: 'Average monthly Google searches; Keyword Planner rounds volumes into bands.',
    months,
    countries: [
      { code: 'WW', name: 'Worldwide' },
      ...codes.map((c) => ({ code: c, name: countries[c][0] })),
    ],
    brands: brandMeta,
    series,
  };

  const monthly = ['snapshot,category,country_code,country,brand,vendor,year_month,searches'];
  for (const code of codes) {
    for (const b of cat.brands) {
      const src = snapData[code]?.brands[b.name];
      for (const m of src?.monthly || []) {
        monthly.push(
          `${month},${catKey},${code},"${countries[code][0]}","${b.name}","${b.vendor}",${m.ym},${m.v}`,
        );
      }
    }
  }

  const summary = [
    'snapshot,category,scope,rank,brand,vendor,avg_monthly_searches,share_pct,mom_pct,yoy_pct',
  ];
  for (const [scope, rows] of Object.entries(series)) {
    for (const r of rows)
      summary.push(
        `${month},${catKey},${scope},${r.rank},"${r.name}","${r.vendor}",${r.avg},${r.share},${r.mom ?? ''},${r.yoy ?? ''}`,
      );
  }

  return { compact, monthlyCsv: monthly.join('\n'), summaryCsv: summary.join('\n') };
}

// Discover the most recent raw snapshot committed for a category.
export function latestSnapshot(catKey) {
  const dir = path.join(ROOT, 'data', 'popularity', catKey);
  if (!fs.existsSync(dir)) return null;
  const months = fs
    .readdirSync(dir)
    .filter((f) => /^\d{4}-\d{2}\.json$/.test(f))
    .sort();
  if (!months.length) return null;
  const file = path.join(dir, months[months.length - 1]);
  return { month: months[months.length - 1].replace('.json', ''), raw: JSON.parse(fs.readFileSync(file, 'utf8')) };
}
