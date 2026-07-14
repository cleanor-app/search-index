# Google search volume dataset

**The Cleanor Search Index is a free, open dataset of absolute Google search volume: how many times, on average, people searched for a given product, file format or programming language each month, per country. It covers 149 items across 10 categories and 20 countries, it is updated monthly, and it is released under CC BY 4.0, so you can use it commercially with attribution.**

The numbers come from the Google Ads API `generateKeywordHistoricalMetrics` endpoint, the same source that powers Google Keyword Planner. They are absolute average monthly searches, not a normalised 0 to 100 index, which is the difference between this dataset and Google Trends.

Read the charts at [cleanor.app/trends](https://cleanor.app/trends). The raw files live in this repository.

## Why an open dataset needed to exist

Keyword Planner hands back a trailing 12-month window, and that window rolls forward every month. Once a month falls off the back of it, that data point is gone from the public source for good. There is no free archive of it anywhere.

So a long, comparable history of search demand cannot be queried, it can only be **captured**. This repository captures one immutable snapshot per category per month and commits it. The published files are the archive.

The paid alternatives (Ahrefs, Semrush, Similarweb) sell keyword volume behind a subscription and a terms-of-service that stops you redistributing it. This dataset is CC BY 4.0, so a researcher can cite it, a journalist can chart it and a company can build on it, all without a licence negotiation.

## What is in it

| | |
| --- | --- |
| Categories | 10: `ai`, `apps`, `coding`, `crypto`, `design`, `formats`, `languages`, `nocode`, `seo`, `storage` |
| Tracked items | 149 in total, defined in `config/popularity-config.json` |
| Countries | 20: US, IN, GB, CA, AU, DE, FR, BR, MX, ID, JP, KR, IT, ES, NL, TR, VN, PL, SG, SA |
| Scopes | 21: the 20 countries plus `WW`, the per-month sum across them |
| Snapshots | `2026-06`, covering the 12 months `2025-06` to `2026-05` |
| Rows | 35,760 monthly rows and 3,129 summary rows, over 20 CSV files |
| Unit | Average monthly Google searches |

## Schema

There are three shapes to know.

### 1. The raw snapshot, `data/popularity/<category>/<YYYY-MM>.json`

The primary artefact and the thing that is immutable. Every other file in the repository is derived from it.

```json
{
  "category": "ai",
  "label": "AI systems",
  "snapshot": "2026-06",
  "generatedAt": "2026-07-06T17:01:04.277Z",
  "source": "Google Ads Keyword Planner (generateKeywordHistoricalMetrics)",
  "brands": [{ "name": "ChatGPT", "vendor": "OpenAI" }],
  "data": {
    "US": {
      "name": "United States",
      "geoId": 2840,
      "brands": {
        "ChatGPT": {
          "avg": 124000000,
          "competition": "low",
          "monthly": [
            { "ym": "2025-06", "v": 101000000 },
            { "ym": "2025-07", "v": 101000000 }
          ]
        }
      }
    }
  }
}
```

`avg` is Keyword Planner's own average monthly searches for the head keyword in that country. `monthly` is the 12-point series behind it. `geoId` is the Google Ads geo-target constant, so any pull is reproducible against the API.

### 2. The long CSV, `data/popularity/csv/popularity-<category>-monthly.csv`

`snapshot,category,country_code,country,brand,vendor,year_month,searches`

One row per country, item and month. This is the shape you want for a time-series plot or a regression.

### 3. The summary CSV, `data/popularity/csv/popularity-<category>-summary.csv`

`snapshot,category,scope,rank,brand,vendor,avg_monthly_searches,share_pct,mom_pct,yoy_pct`

One row per scope and item, already ranked. `share_pct` is the item's share of the tracked category total in that scope. `mom_pct` is the last month of the window against the previous one. `yoy_pct` is the last month against the first non-zero month of the window. The definitions live in `src/lib.mjs`, and every one of these values is recomputed from the raw snapshot by `npm run build`, so nothing here is hand-maintained.

## Loading it

No key, no account, no rate limit. The files are static.

```python
import pandas as pd

BASE = "https://raw.githubusercontent.com/cleanor-app/search-index/main/data/popularity/csv"
summary = pd.read_csv(f"{BASE}/popularity-ai-summary.csv")

ww = summary[summary.scope == "WW"].sort_values("rank")
print(ww[["rank", "brand", "avg_monthly_searches", "share_pct"]])
```

To rebuild every derived file from the raw snapshots yourself, with no API credentials:

```bash
git clone https://github.com/cleanor-app/search-index
cd search-index
npm run check
```

CI runs that same command and then asserts the working tree is unchanged, which is what makes the published CSVs verifiable: they can always be traced back to, and regenerated from, their raw source.

## Licence

- **Data** (everything under `data/`): [CC BY 4.0](../data/LICENSE). Share it, adapt it, use it commercially. The only condition is attribution: credit "Cleanor Labs, Cleanor Search Index" and link back to the repository or to <https://cleanor.app/trends>.
- **Code** (everything under `src/`): [MIT](../LICENSE).

## How to cite

The repository carries a `CITATION.cff`, so GitHub's "Cite this repository" button produces a correct entry. Two DOIs are minted:

- Zenodo (this repository): [10.5281/zenodo.21225547](https://doi.org/10.5281/zenodo.21225547). This is the concept DOI and always resolves to the latest release.
- Kaggle (dataset mirror): [10.34740/kaggle/dsv/17721131](https://doi.org/10.34740/kaggle/dsv/17721131).

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

## Before you draw conclusions

Two things about the source matter more than anything about the file format:

1. Keyword Planner reports volumes in **rounded bands**, so the figures are directional.
2. Keyword Planner **withholds** historical volume for some terms, cryptocurrency asset names among them.

Both are explained, with the evidence, in [Keyword Planner data explained](keyword-planner-data-explained.md). The keyword rule, the scopes and the derived-figure definitions are in [the methodology](methodology.md).

## More

- The index, charted: <https://cleanor.app/trends>
- Open research from Cleanor Labs: <https://cleanor.app/research>
- The repository: <https://github.com/cleanor-app/search-index>
