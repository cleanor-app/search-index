// Cleanor Search Index — fetch (live, requires Google Ads API credentials).
//
// Captures one immutable monthly snapshot of category "popularity" from real
// Google search demand (Keyword Planner historical metrics), per country, and
// writes it to data/popularity/<category>/<YYYY-MM>.json. Then recomputes the
// derived artifacts via the same code path as build.mjs.
//
// Why snapshot monthly: Keyword Planner only returns a trailing ~12-month
// window that rolls forward every month, so a long history does not exist
// unless you capture it. Each run appends a new raw snapshot; those accumulate
// into the published time series.
//
//   node src/fetch.mjs                      # all categories, all countries
//   node src/fetch.mjs --category ai        # one category
//   node src/fetch.mjs --countries US,IN,DE
//   node src/fetch.mjs --month 2026-07      # override snapshot label
//
// Credentials live in keys/google-ads.json (gitignored). See
// keys/google-ads.example.json for the shape.

import fs from 'node:fs';
import path from 'node:path';
import { ROOT, loadConfig, computeOutputs } from './lib.mjs';

const keyPath = path.join(ROOT, 'keys', 'google-ads.json');
if (!fs.existsSync(keyPath)) {
  console.error(
    `Missing ${path.relative(ROOT, keyPath)}. Copy keys/google-ads.example.json and fill in\n` +
      `your Google Ads API credentials. (Not needed for \`npm run build\`, only for a live fetch.)`,
  );
  process.exit(1);
}
const ga = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
const cfg = loadConfig();

const VER = ga.apiVersion || 'v21';
const CUSTOMER = String(ga.customerId).replace(/\D/g, '');
const LANG = cfg.language || ga.language || 'languageConstants/1000';

const die = (m) => {
  console.error('ERROR:', m);
  process.exit(1);
};
const argv = process.argv.slice(2);
const opt = (flag, def) => {
  const i = argv.indexOf(flag);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// default snapshot label: previous completed month (KP data lags the current one)
function defaultMonth() {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
const MONTH = opt('--month', defaultMonth());

const wantCats = opt('--category') ? [opt('--category')] : Object.keys(cfg.categories);
for (const c of wantCats) if (!cfg.categories[c]) die(`unknown category "${c}"`);

const wantCountries = opt('--countries');
const codes = wantCountries
  ? wantCountries
      .split(',')
      .map((c) => c.trim().toUpperCase())
      .filter((c) => cfg.countries[c])
  : Object.keys(cfg.countries);

async function accessToken() {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: ga.clientId,
      client_secret: ga.clientSecret,
      refresh_token: ga.refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const j = await r.json();
  if (!r.ok) die(`OAuth token refresh failed: ${j.error} — ${j.error_description || ''}`);
  return j.access_token;
}

async function historicalMetrics(token, geoId, keywords) {
  const headers = {
    Authorization: `Bearer ${token}`,
    'developer-token': ga.developerToken,
    'content-type': 'application/json',
  };
  if (ga.loginCustomerId)
    headers['login-customer-id'] = String(ga.loginCustomerId).replace(/\D/g, '');
  const body = {
    keywords,
    geoTargetConstants: [`geoTargetConstants/${geoId}`],
    keywordPlanNetwork: 'GOOGLE_SEARCH',
    language: LANG,
  };
  const maxAttempts = 6;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const r = await fetch(
      `https://googleads.googleapis.com/${VER}/customers/${CUSTOMER}:generateKeywordHistoricalMetrics`,
      { method: 'POST', headers, body: JSON.stringify(body) },
    );
    const text = await r.text();
    let j;
    try {
      j = JSON.parse(text);
    } catch {
      j = { raw: text };
    }
    if (r.ok) return j.results || [];
    if ((r.status === 429 || r.status === 503) && attempt < maxAttempts) {
      const wait = Math.min(60000, 2000 * 2 ** (attempt - 1));
      process.stdout.write(`  (rate-limited, retry ${attempt}/${maxAttempts} in ${wait / 1000}s) `);
      await sleep(wait);
      continue;
    }
    const msg =
      j.error?.message || j.error?.details?.[0]?.errors?.[0]?.message || text.slice(0, 400);
    die(`Google Ads API ${r.status}: ${msg}\n(version=${VER}, customer=${CUSTOMER}, geo=${geoId})`);
  }
  return [];
}

const compMap = { UNSPECIFIED: '', UNKNOWN: '', LOW: 'low', MEDIUM: 'medium', HIGH: 'high' };
const MONTHS = ['', 'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
function monthNum(mo) {
  if (typeof mo === 'number') return mo;
  const i = MONTHS.indexOf(String(mo).toUpperCase());
  return i > 0 ? i : Number(mo) || 0;
}
const ym = (y, mo) => `${y}-${String(monthNum(mo)).padStart(2, '0')}`;

async function runCategory(token, catKey) {
  const cat = cfg.categories[catKey];
  const keywords = [...new Set(cat.brands.flatMap((b) => b.keys))];
  console.log(
    `\nCleanor Search Index · ${cat.label} · ${keywords.length} keys × ${codes.length} countries · snapshot ${MONTH}`,
  );

  const snapData = {};
  let i = 0;
  for (const code of codes) {
    const [name, geoId] = cfg.countries[code];
    const results = await historicalMetrics(token, geoId, keywords);
    const byKey = new Map();
    for (const res of results) {
      const m = res.keywordMetrics || {};
      byKey.set((res.text || '').toLowerCase(), {
        avg: m.avgMonthlySearches != null ? Number(m.avgMonthlySearches) : 0,
        comp: compMap[m.competition] ?? (m.competition || ''),
        monthly: (m.monthlySearchVolumes || []).map((mv) => ({
          ym: ym(mv.year, mv.month),
          v: mv.monthlySearches != null ? Number(mv.monthlySearches) : 0,
        })),
      });
    }
    const brands = {};
    for (const b of cat.brands) {
      let avg = 0;
      let comp = '';
      const monthlyMap = new Map();
      for (const k of b.keys) {
        const row = byKey.get(k.toLowerCase());
        if (!row) continue;
        avg += row.avg;
        if (!comp || ['low', 'medium', 'high'].indexOf(row.comp) > ['low', 'medium', 'high'].indexOf(comp))
          comp = row.comp || comp;
        for (const mv of row.monthly) monthlyMap.set(mv.ym, (monthlyMap.get(mv.ym) || 0) + mv.v);
      }
      brands[b.name] = {
        avg,
        competition: comp,
        monthly: [...monthlyMap.entries()].sort((a, z) => a[0].localeCompare(z[0])).map(([mo, v]) => ({ ym: mo, v })),
      };
    }
    snapData[code] = { name, geoId, brands };
    process.stdout.write(`\r  ${++i}/${codes.length} · ${name.padEnd(20)}  `);
    await sleep(1500);
  }
  console.log('');

  // persist the immutable raw snapshot (the published dataset source)
  const rawDir = path.join(ROOT, 'data', 'popularity', catKey);
  fs.mkdirSync(rawDir, { recursive: true });
  const generatedAt = new Date().toISOString();
  const raw = {
    category: catKey,
    label: cat.label,
    unit: cat.unit,
    snapshot: MONTH,
    generatedAt,
    source: 'Google Ads Keyword Planner (generateKeywordHistoricalMetrics)',
    language: LANG,
    brands: cat.brands.map((b) => ({ name: b.name, vendor: b.vendor })),
    countries: Object.fromEntries(codes.map((c) => [c, { name: cfg.countries[c][0], geoId: cfg.countries[c][1] }])),
    data: snapData,
  };
  fs.writeFileSync(path.join(rawDir, `${MONTH}.json`), JSON.stringify(raw, null, 2) + '\n');
  console.log(`✓ data/popularity/${catKey}/${MONTH}.json  (raw snapshot)`);

  // recompute derived artifacts through the shared, offline-reproducible path
  const countries = Object.fromEntries(codes.map((c) => [c, cfg.countries[c]]));
  const { compact, monthlyCsv, summaryCsv } = computeOutputs({
    catKey,
    cat,
    codes,
    countries,
    snapData,
    month: MONTH,
    generatedAt,
  });

  const distDir = path.join(ROOT, 'dist', 'data', 'popularity');
  const csvDir = path.join(ROOT, 'data', 'popularity', 'csv');
  fs.mkdirSync(distDir, { recursive: true });
  fs.mkdirSync(csvDir, { recursive: true });
  fs.writeFileSync(path.join(distDir, `${catKey}.json`), JSON.stringify(compact, null, 2) + '\n');
  fs.writeFileSync(path.join(csvDir, `popularity-${catKey}-monthly.csv`), monthlyCsv + '\n');
  fs.writeFileSync(path.join(csvDir, `popularity-${catKey}-summary.csv`), summaryCsv + '\n');
  console.log(`✓ dist/ + data/popularity/csv/ · ${catKey}.json + monthly + summary CSV`);

  console.log(`\n  ${cat.label} · Worldwide top by avg monthly searches:`);
  for (const r of compact.series.WW.slice(0, 15)) {
    const arrow = r.mom == null ? ' ' : r.mom > 2 ? '▲' : r.mom < -2 ? '▼' : '·';
    console.log(
      `   ${String(r.rank).padStart(2)}. ${r.name.padEnd(16)} ${String(r.avg).padStart(9)}  ${String(r.share).padStart(5)}%  ${arrow} ${r.mom ?? ''}`,
    );
  }
}

(async () => {
  const token = await accessToken();
  for (const catKey of wantCats) await runCategory(token, catKey);
  console.log('\nDone.\n');
})();
