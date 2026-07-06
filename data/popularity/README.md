# Cleanor Search Index

An open, monthly dataset of how popular AI tools (and, over time, file formats and
programming languages) really are, measured by **real Google search demand**, ranked
worldwide and broken down by country.

Live, interactive version: **https://cleanor.app/trends**
Maintained by [Cleanor Research Labs](https://cleanor.app) · updated monthly.

## Why this exists

Google Keyword Planner only exposes a **rolling 12-month window**, and that window moves
forward every month. So a long history of search demand does not exist in any public
source, you have to capture it. This repository does exactly that: every month we take a
snapshot and commit it, which turns the index into a versioned, citable record of how
demand for AI tools rises and falls over time.

## What's inside

```
data/popularity/
  ai/                     immutable monthly snapshots (raw)
    2026-06.json          one file per snapshot: per-country, per-brand, 12-mo series
  csv/                    flattened mirrors for spreadsheets / analysis
    popularity-ai-monthly.csv   long format: snapshot,country,brand,year_month,searches
    popularity-ai-summary.csv   ranked: scope,rank,brand,avg,share_pct,mom_pct,yoy_pct
  README.md               this file
```

The site also serves a compact computed file at
`https://cleanor.app/data/popularity/ai.json` (leaderboards + trends, ready to plot).

## Methodology

- **Source:** Google Ads Keyword Planner `generateKeywordHistoricalMetrics` (real average
  monthly Google Search volumes).
- **Metric:** for each product we sum the average monthly searches of the product name and
  its common query variants (e.g. `chatgpt`, `chat gpt`). Search demand is a widely used
  proxy for real-world interest and adoption.
- **Countries:** each country is pulled independently with its own geo target, so within a
  country the numbers are directly comparable. To compare across countries of very
  different sizes, use the **share** columns (each product as a % of the tracked category).
- **Change:** `mom_pct` is month-over-month (latest vs previous month of the series);
  `yoy_pct` compares the latest month to the first month in the 12-month window.
- **Caveat:** Keyword Planner reports volumes in **rounded bands**. Treat every figure as
  directional, not exact.

## License

Data is released under **[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)**.
Free to reuse, including commercially, with attribution to *Cleanor Research Labs
(cleanor.app)*.

## Reproduce

```bash
npm run popularity:snapshot            # all categories, all countries
node scripts/search-popularity-index.mjs --category ai --countries US,IN,DE
```

Requires Google Ads API credentials (`keys/google-ads.json`). See
`scripts/search-popularity-index.mjs` and `scripts/popularity-config.json`.

## Cite

> Cleanor Research Labs. *Cleanor Search Index: AI tool popularity by Google search
> demand.* cleanor.app/trends, <YEAR>.
