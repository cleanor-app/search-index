# Cleanor Search Index

**An open dataset of Google search demand: real Keyword Planner volume for 149 items across 10 categories and 20 countries, updated monthly. Free, CC BY 4.0.**

[![CI](https://github.com/cleanor-app/search-index/actions/workflows/ci.yml/badge.svg)](https://github.com/cleanor-app/search-index/actions/workflows/ci.yml)
[![Code: MIT](https://img.shields.io/badge/code-MIT-blue.svg)](LICENSE)
[![Data: CC BY 4.0](https://img.shields.io/badge/data-CC%20BY%204.0-lightgrey.svg)](data/LICENSE)
[![Read the index](https://img.shields.io/badge/read%20it-cleanor.app%2Ftrends-0a7cff.svg)](https://cleanor.app/trends)
[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.21225547.svg)](https://doi.org/10.5281/zenodo.21225547)
[![Hugging Face](https://img.shields.io/badge/%F0%9F%A4%97%20dataset-cleanorlabs%2Fcleanor--search--index-ff9d00.svg)](https://huggingface.co/datasets/cleanorlabs/cleanor-search-index)
[![Kaggle](https://img.shields.io/badge/Kaggle-dataset%20%2B%20DOI-20beff.svg?logo=kaggle)](https://www.kaggle.com/datasets/cleanorlabs/cleanor-search-index)

Most "what is popular" rankings come from vendor numbers, app-store charts, or surveys. This one comes from **absolute monthly Google search volume**, pulled per country from the Google Ads API (Keyword Planner historical metrics), committed as an immutable snapshot every month, and released as open data.

The paid alternatives are Ahrefs and Semrush. The free alternative, Google Trends, only gives you a relative 0 to 100 index. This gives you the number.

> 📈 Human-readable charts and write-ups live at [cleanor.app/trends](https://cleanor.app/trends). This repository is the raw data and the harness behind it.

Maintained by [Cleanor Labs](https://cleanor.app/research). If the data is useful, please [cite it](#citation).

## Why this exists

Keyword Planner only returns a **trailing 12-month window that rolls forward every month**. A long, comparable history of search demand therefore does not exist in any public source: it has to be captured, month by month, before it scrolls away. This repository does that capture and commits the result, which turns a disappearing window into a permanent, citable time series.

## What is in the data

Coverage, as committed today:

| | |
| --- | --- |
| Categories | **10**: `ai`, `apps`, `coding`, `crypto`, `design`, `formats`, `languages`, `nocode`, `seo`, `storage` |
| Tracked items | **149** brands, formats and languages in total ([`config/popularity-config.json`](config/popularity-config.json)) |
| Countries | **20**: US, IN, GB, CA, AU, DE, FR, BR, MX, ID, JP, KR, IT, ES, NL, TR, VN, PL, SG, SA |
| Scopes | **21**: the 20 countries, plus `WW` (the per-month sum across them) |
| Snapshots | `2026-06`, one raw JSON per category |
| Months in that snapshot | **12**: `2025-06` through `2026-05` |
| Rows | **35,760** monthly rows and **3,129** summary rows, across 20 CSV files |
| Metric | Average monthly Google searches (absolute, not an index) |
| Licence | Data [CC BY 4.0](data/LICENSE), code [MIT](LICENSE) |

Those row counts are exactly what the coverage implies: 149 items × 20 countries × 12 months = 35,760 monthly rows, and 149 items × 21 scopes = 3,129 summary rows.

### Layout

| Path | What it is |
| --- | --- |
| `data/popularity/<category>/<YYYY-MM>.json` | **Immutable raw snapshots**, the primary dataset. One file per category per month. |
| `data/popularity/csv/popularity-<category>-monthly.csv` | Long format: one row per country, item and month. |
| `data/popularity/csv/popularity-<category>-summary.csv` | Ranked leaderboard per scope, with share and change. |
| `config/popularity-config.json` | The tracked categories, items, head keywords and country geo targets. |
| `src/fetch.mjs` | Live capture from the Google Ads API (needs credentials). Writes a new raw snapshot. |
| `src/build.mjs` | **Offline, credential-free** recompute of every derived file from the raw snapshots. |
| `src/validate.mjs` | Structural integrity checks (run in CI). |

### Schema: monthly CSV

`snapshot,category,country_code,country,brand,vendor,year_month,searches`

```csv
2026-06,ai,US,"United States","ChatGPT","OpenAI",2025-09,124000000
2026-06,formats,US,"United States","AVIF","Raster image",2025-09,5400
```

`searches` is the absolute average monthly Google search volume Keyword Planner reported for that item's head keyword, in that country, in that month.

### Schema: summary CSV

`snapshot,category,scope,rank,brand,vendor,avg_monthly_searches,share_pct,mom_pct,yoy_pct`

```csv
2026-06,ai,WW,1,"ChatGPT","OpenAI",720350000,82.6,6.5,42.7
2026-06,ai,WW,3,"Claude","Anthropic",14452500,1.7,4.6,992.3
```

`scope` is a country code or `WW`. `share_pct` is the item's share of the tracked category total. `mom_pct` compares the last month of the window with the one before it, and `yoy_pct` compares the last month with the first non-zero month of the 12-month window ([`src/lib.mjs`](src/lib.mjs)).

### Schema: raw snapshot JSON

```json
{
  "category": "ai",
  "snapshot": "2026-06",
  "source": "Google Ads Keyword Planner (generateKeywordHistoricalMetrics)",
  "data": {
    "US": {
      "name": "United States", "geoId": 2840,
      "brands": {
        "ChatGPT": {
          "avg": 124000000,
          "competition": "low",
          "monthly": [{ "ym": "2025-06", "v": 101000000 }]
        }
      }
    }
  }
}
```

## Quick start

Download one CSV. No clone, no key, no account:

```bash
curl -O https://raw.githubusercontent.com/cleanor-app/search-index/main/data/popularity/csv/popularity-ai-summary.csv
```

Load it in pandas:

```python
import pandas as pd

BASE = "https://raw.githubusercontent.com/cleanor-app/search-index/main/data/popularity/csv"

# ranked leaderboard: one row per scope and item
summary = pd.read_csv(f"{BASE}/popularity-ai-summary.csv")
print(summary[summary.scope == "WW"].head())

# full 12-month series: one row per country, item and month
monthly = pd.read_csv(f"{BASE}/popularity-ai-monthly.csv")
us = monthly[monthly.country_code == "US"].pivot_table(
    index="year_month", columns="brand", values="searches"
)
us.plot(logy=True)
```

Swap `ai` for any of `apps`, `coding`, `crypto`, `design`, `formats`, `languages`, `nocode`, `seo`, `storage`.

Or take the whole thing and rebuild every derived file from the raw snapshots, with no API access at all:

```bash
git clone https://github.com/cleanor-app/search-index
cd search-index
npm run check      # validate the raw data, then rebuild every derived file
```

CI runs exactly this and then asserts the working tree is unchanged, which proves the published CSVs match their raw source byte for byte.

There is a worked example notebook at [`docs/kaggle-eda.ipynb`](docs/kaggle-eda.ipynb).

## Key findings

From the `2026-06` snapshot, `WW` scope (the sum across the 20 tracked countries). All figures are average monthly searches.

- **ChatGPT holds 82.6% of all tracked AI-assistant search demand**: 720,350,000 average monthly searches, against 95,002,000 for Gemini (10.9%) and 14,452,500 for Claude (1.7%). Source: [`popularity-ai-summary.csv`](data/popularity/csv/popularity-ai-summary.csv).
- **The challengers grow far faster than the leader**: Claude +992.3% year over year and Gemini +584.4%, against +42.7% for ChatGPT, which starts from a base roughly 50 times larger. Source: [`popularity-ai-summary.csv`](data/popularity/csv/popularity-ai-summary.csv).
- **Claude Code has passed VS Code in search demand**: 1,947,800 (25.6% share, +269.7% YoY) against 1,704,100 (22.4%) for VS Code. Source: [`popularity-coding-summary.csv`](data/popularity/csv/popularity-coding-summary.csv).
- **Design is the most concentrated category tracked**: Canva takes 91.9% (116,573,000), Figma 2.8% (3,563,600). Source: [`popularity-design-summary.csv`](data/popularity/csv/popularity-design-summary.csv).
- **GIF is searched almost as much as PDF**: 2,545,300 (33.1%) against 2,906,600 (37.8%), and GIF is growing faster (+38.2% against +10.2% YoY). Source: [`popularity-formats-summary.csv`](data/popularity/csv/popularity-formats-summary.csv).
- **Every leading programming language is losing search demand**: Python -7.7%, Java -21.6%, JavaScript -20.6% YoY. Source: [`popularity-languages-summary.csv`](data/popularity/csv/popularity-languages-summary.csv).
- **In SEO tools the most-searched product is a free one**: Google Search Console takes 54.6% (2,013,900), Semrush 14.1% (520,000). Source: [`popularity-seo-summary.csv`](data/popularity/csv/popularity-seo-summary.csv).

Keyword Planner rounds volumes into bands, so read these as directional, not exact. See [Keyword Planner data explained](docs/keyword-planner-data-explained.md).

## Docs

| Doc | What it answers |
| --- | --- |
| [`docs/google-search-volume-dataset.md`](docs/google-search-volume-dataset.md) | What the dataset is, its schema, how to cite it, what the licence allows. |
| [`docs/keyword-planner-data-explained.md`](docs/keyword-planner-data-explained.md) | What Keyword Planner volume actually measures, and its real limitations. |
| [`docs/methodology.md`](docs/methodology.md) | How each number is produced: the keyword rule, the scopes, the derived figures. |
| [`docs/kaggle-eda.ipynb`](docs/kaggle-eda.ipynb) | A worked exploratory notebook over the CSVs. |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Adding a category, a country, or a keyword-mapping correction. |

## FAQ

### How is this different from Google Trends?

Google Trends gives you a **relative** index, 0 to 100, normalised inside whatever comparison you asked for. You cannot read a number of searches off it, and two Trends charts are not comparable with each other. This dataset gives you **absolute average monthly search volume** from Keyword Planner, so 124,000,000 means 124,000,000 searches a month, and any two rows can be compared, summed or shared out.

### Is it free? Can I use it commercially?

Yes to both. The data under `data/` is [CC BY 4.0](data/LICENSE): share it, adapt it, build a commercial product on it, as long as you credit "Cleanor Labs, Cleanor Search Index" and link back. The code is [MIT](LICENSE). There is no API key, no account and no rate limit: the CSVs are static files in this repository.

### How often is it updated?

Monthly. A GitHub Action ([`.github/workflows/monthly-snapshot.yml`](.github/workflows/monthly-snapshot.yml)) captures a new snapshot on the 3rd of each month, because Keyword Planner data lags the calendar month. Past snapshots are never rewritten: a new month is a new file.

### How accurate are the numbers?

They are Google's own numbers, but Google reports them in **rounded bands**. Across all 35,760 monthly rows in this repository there are only **81 distinct volume values**, which is the banding made visible. Trust the direction and the order of magnitude, treat small gaps between neighbouring items as noise. Detail in [`docs/keyword-planner-data-explained.md`](docs/keyword-planner-data-explained.md).

### Why are there no cryptocurrencies, only exchanges?

Because Google Keyword Planner **withholds historical volume for cryptocurrency asset names**: `bitcoin`, `ethereum`, `xrp`, `solana` and the rest return null metrics, so a coin leaderboard cannot be built from this source at all. Exchange and wallet names are not restricted and do return real volumes, so the `crypto` category tracks those instead. This is documented in [`config/popularity-config.json`](config/popularity-config.json).

### What exactly is counted for each item?

Exactly one head keyword per item, and never its sub-queries. Keyword Planner's volume for `claude` already contains `claude ai`, `claude.ai` and `claude code`, so adding those would double-count. Names that collide with a common word use a disambiguated head term instead (`gemini ai`, `golang`, `swift programming`). Every mapping is visible, and correctable by pull request, in [`config/popularity-config.json`](config/popularity-config.json).

### What does "Worldwide" mean here?

The per-item, per-month **sum across the 20 tracked countries**, not a global total. It is a well-defined aggregate over a disclosed country set. Adding a country changes the `WW` series from that point forward, and past snapshots stay exactly as they were.

### Can I get the data as JSON?

Yes. The raw snapshots are JSON: `data/popularity/<category>/2026-06.json`. A compact, chart-ready computed file is also served at `https://cleanor.app/data/popularity/<category>.json`.

## Capture a new snapshot (maintainers)

Requires a Google Ads API developer token and OAuth credentials. Copy `keys/google-ads.example.json` to `keys/google-ads.json` (gitignored) and fill it in, then:

```bash
npm run fetch                    # all categories, all countries
npm run fetch -- --category ai   # one category
npm run fetch -- --countries US,IN,DE
```

## Contributing

New categories, additional countries, keyword-mapping corrections and analysis notebooks are all welcome. See [`CONTRIBUTING.md`](CONTRIBUTING.md). Good first contributions are labelled [`good first issue`](https://github.com/cleanor-app/search-index/labels/good%20first%20issue).

## Related projects

- [cleanor-app/cleanor-storage-lab](https://github.com/cleanor-app/cleanor-storage-lab): open benchmarks and datasets on device storage and file sizes.
- [cleanor-app/cleanor-mcp](https://github.com/cleanor-app/cleanor-mcp): a zero-auth MCP server that exposes Cleanor's tools and data to AI agents.
- [cleanor-app/browser-image-tools](https://github.com/cleanor-app/browser-image-tools): image compression and conversion that runs entirely in the browser.

## Citation

See [`CITATION.cff`](CITATION.cff) (GitHub's "Cite this repository" button). Authored by Cleanor Labs, [ORCID 0009-0005-4623-961X](https://orcid.org/0009-0005-4623-961X). Two citable DOIs are available:

- **Zenodo** (this repository): [10.5281/zenodo.21225547](https://doi.org/10.5281/zenodo.21225547), the concept DOI, always resolves to the latest release.
- **Kaggle** (dataset mirror): [10.34740/kaggle/dsv/17721131](https://doi.org/10.34740/kaggle/dsv/17721131), at [kaggle.com/datasets/cleanorlabs/cleanor-search-index](https://www.kaggle.com/datasets/cleanorlabs/cleanor-search-index).

```bibtex
@dataset{cleanor_search_index,
  title     = {Cleanor Search Index: an open monthly index of category popularity
               from Google search demand},
  author    = {{Cleanor Labs}},
  doi       = {10.5281/zenodo.21225547},
  url       = {https://cleanor.app/trends},
  publisher = {Zenodo}
}
```

## License

Code is [MIT](LICENSE). Data under `data/` is [CC BY 4.0](data/LICENSE): reuse it freely, including commercially, just credit "Cleanor Labs, Cleanor Search Index" and link back. More open data at [cleanor.app/research](https://cleanor.app/research).
