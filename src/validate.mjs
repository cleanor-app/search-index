// Cleanor Search Index — validate.
//
// Structural integrity checks on the committed raw snapshots and config, so a
// bad dataset PR fails CI instead of shipping. Reproducibility (derived files
// match their source) is enforced separately in CI by running `build` and
// asserting a clean git tree.

import fs from 'node:fs';
import path from 'node:path';
import { ROOT, loadConfig } from './lib.mjs';

let errors = 0;
const fail = (m) => {
  console.error('✗', m);
  errors++;
};
const ok = (m) => console.log('✓', m);

const cfg = loadConfig();

// --- config sanity ---
if (!cfg.categories || !Object.keys(cfg.categories).length) fail('config has no categories');
for (const [key, cat] of Object.entries(cfg.categories || {})) {
  if (!cat.label) fail(`category ${key}: missing label`);
  if (!Array.isArray(cat.brands) || !cat.brands.length) fail(`category ${key}: no brands`);
  const seen = new Set();
  for (const b of cat.brands || []) {
    if (!b.name) fail(`category ${key}: a brand has no name`);
    if (!Array.isArray(b.keys) || !b.keys.length) fail(`category ${key}/${b.name}: no keys`);
    for (const k of b.keys || []) {
      const kk = k.toLowerCase();
      if (seen.has(kk)) fail(`category ${key}: keyword "${k}" is claimed by two brands`);
      seen.add(kk);
    }
  }
}
if (errors === 0) ok(`config: ${Object.keys(cfg.categories).length} categories well-formed`);

// --- raw snapshot sanity ---
const popDir = path.join(ROOT, 'data', 'popularity');
let snapshotCount = 0;
for (const catKey of Object.keys(cfg.categories)) {
  const dir = path.join(popDir, catKey);
  if (!fs.existsSync(dir)) {
    fail(`category ${catKey}: no data/popularity/${catKey}/ directory`);
    continue;
  }
  const files = fs.readdirSync(dir).filter((f) => /^\d{4}-\d{2}\.json$/.test(f));
  if (!files.length) fail(`category ${catKey}: no monthly snapshots`);
  for (const f of files) {
    let raw;
    try {
      raw = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    } catch (e) {
      fail(`${catKey}/${f}: invalid JSON (${e.message})`);
      continue;
    }
    if (raw.snapshot !== f.replace('.json', ''))
      fail(`${catKey}/${f}: snapshot label "${raw.snapshot}" != filename`);
    if (!raw.data || !Object.keys(raw.data).length) fail(`${catKey}/${f}: empty data`);
    for (const [code, c] of Object.entries(raw.data || {})) {
      if (!c.brands || !Object.keys(c.brands).length) fail(`${catKey}/${f}/${code}: no brands`);
      for (const [bn, b] of Object.entries(c.brands || {})) {
        if (typeof b.avg !== 'number' || b.avg < 0) fail(`${catKey}/${f}/${code}/${bn}: bad avg`);
        if (!Array.isArray(b.monthly)) fail(`${catKey}/${f}/${code}/${bn}: monthly not array`);
        for (const m of b.monthly || [])
          if (!/^\d{4}-\d{2}$/.test(m.ym || '') || typeof m.v !== 'number')
            fail(`${catKey}/${f}/${code}/${bn}: bad monthly point ${JSON.stringify(m)}`);
      }
    }
    snapshotCount++;
  }
}
if (errors === 0) ok(`snapshots: ${snapshotCount} raw file(s) valid`);

// --- derived CSV sanity ---
const csvDir = path.join(ROOT, 'data', 'popularity', 'csv');
let csvCount = 0;
if (fs.existsSync(csvDir)) {
  const summaryFiles = fs
    .readdirSync(csvDir)
    .filter((f) => /^popularity-.*-summary\.csv$/.test(f));

  // Simple CSV line parser supporting quoted strings
  function parseCsvLine(line) {
    const fields = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    fields.push(current);
    return fields;
  }

  for (const file of summaryFiles) {
    const filePath = path.join(csvDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length <= 1) continue;

    const header = parseCsvLine(lines[0]);
    const snapshotIdx = header.indexOf('snapshot');
    const categoryIdx = header.indexOf('category');
    const scopeIdx = header.indexOf('scope');
    const rankIdx = header.indexOf('rank');
    const brandIdx = header.indexOf('brand');
    const avgIdx = header.indexOf('avg_monthly_searches');
    const shareIdx = header.indexOf('share_pct');

    if (
      snapshotIdx === -1 ||
      categoryIdx === -1 ||
      scopeIdx === -1 ||
      rankIdx === -1 ||
      brandIdx === -1 ||
      avgIdx === -1 ||
      shareIdx === -1
    ) {
      fail(`${file}: missing required headers`);
      continue;
    }

    // Group rows by snapshot + category + scope
    const groups = new Map();
    for (let i = 1; i < lines.length; i++) {
      const row = parseCsvLine(lines[i]);
      if (row.length < header.length) continue;
      const key = `${row[snapshotIdx]}::${row[categoryIdx]}::${row[scopeIdx]}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push({
        snapshot: row[snapshotIdx],
        category: row[categoryIdx],
        scope: row[scopeIdx],
        rank: Number(row[rankIdx]),
        brand: row[brandIdx],
        avg: Number(row[avgIdx]),
        share: Number(row[shareIdx]),
      });
    }

    for (const [groupKey, rows] of groups) {
      const { scope } = rows[0];

      // 1. Shares add up: sum to about 100 (allow rounding 99.5 to 100.5)
      const shareSum = rows.reduce((s, r) => s + r.share, 0);
      const roundedSum = Math.round(shareSum * 10) / 10;
      if (roundedSum < 99.5 || roundedSum > 100.5) {
        fail(
          `${file}: scope "${scope}" shares sum to ${roundedSum}% (expected 99.5% - 100.5%) across ${rows.length} brands`,
        );
      }

      // 2. Rank matches demand: rank 1..n descending order of avg_monthly_searches (ties allowed)
      rows.sort((a, b) => a.rank - b.rank);
      for (let j = 0; j < rows.length; j++) {
        const curr = rows[j];
        if (curr.rank !== j + 1) {
          fail(`${file}: scope "${scope}" brand "${curr.brand}" expected rank ${j + 1} but got ${curr.rank}`);
        }
        if (j > 0) {
          const prev = rows[j - 1];
          if (curr.avg > prev.avg) {
            fail(
              `${file}: scope "${scope}" brand "${curr.brand}" (rank ${curr.rank}, searches ${curr.avg}) has higher search demand than rank ${prev.rank} brand "${prev.brand}" (searches ${prev.avg})`,
            );
          }
        }
      }
    }

    csvCount++;
  }
}
if (errors === 0) ok(`derived CSVs: ${csvCount} summary CSV file(s) valid`);

if (errors) {
  console.error(`\n${errors} problem(s) found.`);
  process.exit(1);
}
console.log('\nAll checks passed.');
