// Cleanor Search Index — build (offline, no credentials).
//
// Recomputes every derived artifact (the compact leaderboard JSON in dist/ and
// the CSV mirrors in data/popularity/csv/) purely from the committed raw
// snapshots in data/popularity/<category>/<YYYY-MM>.json. This is the
// reproducible core: anyone can `npm run build` and regenerate byte-for-byte
// what we publish, with no Google Ads access. CI runs this and asserts the
// working tree is unchanged, proving the published data matches its source.
//
//   node src/build.mjs                # all categories
//   node src/build.mjs --category ai  # one category

import fs from 'node:fs';
import path from 'node:path';
import { ROOT, loadConfig, computeOutputs, latestSnapshot } from './lib.mjs';

const cfg = loadConfig();
const argv = process.argv.slice(2);
const only = argv.includes('--category') ? argv[argv.indexOf('--category') + 1] : null;
const cats = only ? [only] : Object.keys(cfg.categories);

const distDir = path.join(ROOT, 'dist', 'data', 'popularity');
const csvDir = path.join(ROOT, 'data', 'popularity', 'csv');
fs.mkdirSync(distDir, { recursive: true });
fs.mkdirSync(csvDir, { recursive: true });

for (const catKey of cats) {
  const cat = cfg.categories[catKey];
  if (!cat) {
    console.error(`unknown category "${catKey}"`);
    process.exit(1);
  }
  const snap = latestSnapshot(catKey);
  if (!snap) {
    console.error(`no raw snapshot for "${catKey}" in data/popularity/${catKey}/`);
    process.exit(1);
  }
  const raw = snap.raw;
  const codes = Object.keys(raw.data);
  const countries = Object.fromEntries(
    codes.map((c) => [c, [raw.countries[c].name, raw.countries[c].geoId]]),
  );

  const { compact, monthlyCsv, summaryCsv } = computeOutputs({
    catKey,
    cat,
    codes,
    countries,
    snapData: raw.data,
    month: raw.snapshot,
    generatedAt: raw.generatedAt,
  });

  fs.writeFileSync(path.join(distDir, `${catKey}.json`), JSON.stringify(compact, null, 2) + '\n');
  fs.writeFileSync(path.join(csvDir, `popularity-${catKey}-monthly.csv`), monthlyCsv + '\n');
  fs.writeFileSync(path.join(csvDir, `popularity-${catKey}-summary.csv`), summaryCsv + '\n');

  console.log(
    `✓ ${catKey}: ${compact.brands.length} brands × ${codes.length} countries × ${compact.months.length}mo (snapshot ${raw.snapshot})`,
  );
  console.log(`   dist/data/popularity/${catKey}.json + data/popularity/csv/popularity-${catKey}-*.csv`);
}

console.log('Done.');
