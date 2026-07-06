# Cleanor Search Index

**An open, reproducible monthly index of category "popularity" measured from real Google search demand (Keyword Planner historical metrics), by country.**

[![CI](https://github.com/cleanor-app/search-index/actions/workflows/ci.yml/badge.svg)](https://github.com/cleanor-app/search-index/actions/workflows/ci.yml)
[![Code: MIT](https://img.shields.io/badge/code-MIT-blue.svg)](LICENSE)
[![Data: CC BY 4.0](https://img.shields.io/badge/data-CC%20BY%204.0-lightgrey.svg)](data/LICENSE)
[![Read the index](https://img.shields.io/badge/read%20it-cleanor.app%2Ftrends-0a7cff.svg)](https://cleanor.app/trends)
[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.21225547.svg)](https://doi.org/10.5281/zenodo.21225547)

> 📈 Human-readable charts and write-ups live at [cleanor.app/trends](https://cleanor.app/trends). This repository is the raw data and the harness behind them.

Maintained by [Cleanor Labs](https://cleanor.app/research). If the data is useful, please [cite it](#citation).

## The research question

Public "what is popular" rankings for software categories (which AI assistant, which image format, which framework) are usually based on vendor-reported numbers, app-store charts, or opaque surveys. None of those measure **latent public demand**, and none are reproducible or comparable across countries.

Google Keyword Planner exposes actual monthly search volume for any term, per country. That is a direct, consistent proxy for how many people are looking for a thing. The problem: Keyword Planner only returns a **trailing ~12-month window that rolls forward every month**, so a long, comparable history simply does not exist unless someone captures it snapshot by snapshot.

This project does exactly that. Every month it records an immutable snapshot of per-brand, per-country search demand for a set of tracked categories, and accumulates them into an open time series that nobody else is building.

## What is in here

| Path | What it is |
| --- | --- |
| `data/popularity/<category>/<YYYY-MM>.json` | **Immutable raw snapshots**, the primary dataset. One file per category per month. |
| `data/popularity/csv/` | Flat CSV mirrors (long + summary) for spreadsheets and notebooks. |
| `config/popularity-config.json` | The tracked categories, brands, keyword variants, and countries. |
| `src/fetch.mjs` | Live capture from the Google Ads API (needs credentials). Writes a new raw snapshot. |
| `src/build.mjs` | **Offline, credential-free** recompute of every derived file from the raw snapshots. |
| `src/validate.mjs` | Structural integrity checks (run in CI). |
| `docs/methodology.md` | How the numbers are produced, and the known limitations. |

## Reproduce it yourself

Everything derived (leaderboards, shares, month-over-month and year-over-year changes, CSVs) is recomputed **from the committed raw snapshots with no API access**:

```bash
git clone https://github.com/cleanor-app/search-index
cd search-index
npm run check      # validate the raw data, then rebuild every derived file
```

CI runs exactly this and then asserts the working tree is unchanged, which proves the published numbers match their raw source byte-for-byte.

## Capture a new snapshot (maintainers)

Requires a Google Ads API developer token and OAuth credentials. Copy `keys/google-ads.example.json` to `keys/google-ads.json` (gitignored) and fill it in, then:

```bash
npm run fetch                    # all categories, all countries
npm run fetch -- --category ai   # one category
npm run fetch -- --countries US,IN,DE
```

## Methodology, in one paragraph

For each tracked brand we count **only its single head query plus spelling/naming variants of the same name** (for example `chatgpt` and `chat gpt`), never nested sub-queries, because Keyword Planner's head-term volume already contains them and summing would double-count. Volumes are pulled **independently per country** so within-country comparisons are valid; the "Worldwide" scope is the per-month sum across the tracked countries. Keyword Planner rounds volumes into bands, so treat values as directional, not exact. Full detail and limitations in [`docs/methodology.md`](docs/methodology.md).

## Contributing

New categories, additional countries, keyword-mapping corrections, and analysis notebooks are all welcome. See [`CONTRIBUTING.md`](CONTRIBUTING.md). Good first contributions are labelled [`good first issue`](https://github.com/cleanor-app/search-index/labels/good%20first%20issue).

## Citation

See [`CITATION.cff`](CITATION.cff) (GitHub's "Cite this repository" button). Authored by Cleanor Labs, [ORCID 0009-0005-4623-961X](https://orcid.org/0009-0005-4623-961X). The archived, citable version has DOI [10.5281/zenodo.21225547](https://doi.org/10.5281/zenodo.21225547) (this concept DOI always resolves to the latest release).

## License

Code is [MIT](LICENSE). Data under `data/` is [CC BY 4.0](data/LICENSE): reuse it freely, just credit "Cleanor Labs, Cleanor Search Index" and link back. More open data at [cleanor.app/research](https://cleanor.app/research).
