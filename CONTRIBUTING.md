# Contributing to the Cleanor Search Index

Thanks for helping build an open, reproducible record of search demand. Contributions of all sizes are welcome, and you do not need Google Ads access for most of them.

## Ways to contribute

- **Track a new category.** Add a block to `config/popularity-config.json` (clone the `ai` block). Categories we want next: image/video formats, programming languages, JS frameworks, databases, cloud providers. Open an issue first so we can agree on the brand list and keyword-mapping rules.
- **Correct a keyword mapping.** If a brand's head term is wrong, ambiguous, or double-counts a nested query, open a `data correction` issue with your reasoning. This is the most valuable kind of contribution and needs no credentials.
- **Add a country.** Propose a country and its Google `geoTargetConstant` id in `config/popularity-config.json`.
- **Write an analysis.** Notebooks or scripts that read the CSVs in `data/popularity/csv/` and produce charts or findings. Put them in `notebooks/` or `docs/`.
- **Improve the harness.** Tests, validation rules, better docs.

## Development

No credentials needed for anything except capturing a live snapshot.

```bash
npm install          # (no runtime deps; this just sets up the workspace)
npm run validate     # structural checks on the raw data + config
npm run build        # recompute all derived files from the raw snapshots
npm run check        # validate + build (this is what CI runs)
```

Before opening a PR, run `npm run check` and make sure it passes and leaves the git tree clean. CI does the same and will fail if the derived files do not match the raw source.

## Rules of the road

- **Raw snapshots are immutable.** Never edit a file under `data/popularity/<category>/<YYYY-MM>.json` after it is committed. To fix a methodology issue, change the config or the build code and add a new snapshot going forward; document the change.
- **One head query per brand.** We deliberately count only a brand's main query plus spelling variants, never nested sub-queries. See `docs/methodology.md` for why. PRs that sum sub-queries will be asked to change.
- **Cite your sources** in data-correction issues (a screenshot from Keyword Planner, Trends, or a reference is ideal).

## AI usage

We use AI assistants to help write code and prose in this repository, and we disclose that in the accompanying paper. If you use AI to prepare a contribution, that is fine; please make sure you have reviewed and understand what you submit.

By contributing you agree that your code is licensed under MIT and your data contributions under CC BY 4.0.
