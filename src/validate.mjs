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

if (errors) {
  console.error(`\n${errors} problem(s) found.`);
  process.exit(1);
}
console.log('\nAll checks passed.');
