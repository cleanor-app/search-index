# Methodology

## Source

All search volumes come from the Google Ads API `generateKeywordHistoricalMetrics`
endpoint (Keyword Planner). It returns, for a keyword and a geo target, the
average monthly searches and the last ~12 monthly data points. We request each
country independently.

## What we count per brand

For each brand we sum **only** its single head query plus spelling and naming
variants of the same name (for example `chatgpt` + `chat gpt`, or `claude` +
`claude ai` + `claude.ai`). We deliberately do **not** add nested sub-queries
(`chatgpt login`, `chatgpt app`, ...), because Keyword Planner's head-term volume
already contains that demand; summing the children would double-count. This
undercounts a product's long tail on purpose, a conscious tradeoff in exchange
for comparability and no double counting.

### Disambiguation

Some names are dominated by an unrelated meaning (for example "Gemini" the
zodiac sign, "Copilot" in Office, "Mistral" the wind, "Meta"). For those we use a
disambiguated query such as `gemini ai`. Names now dominated by the product
itself (claude, grok, deepseek, qwen, perplexity, midjourney, doubao, chatgpt)
keep the bare word. Every mapping lives in `config/popularity-config.json` and is
open to correction via a `data correction` issue.

## Scopes

- **Per country.** Volumes are pulled independently per country, so
  within-country comparisons and shares are valid.
- **Worldwide.** The sum, per brand and per month, across the tracked countries.
  It is not a global total; it is a total over the specific country set in the
  config, which we disclose.

## Derived figures

From the trailing 12-month axis in each snapshot we compute, per scope: average
monthly searches, rank, share of the category total, month-over-month change
(latest vs previous month), and year-over-year change (latest vs the first
non-zero month in the window).

## Known limitations

- **Banded values.** Keyword Planner rounds volumes into bands, so figures are
  directional, not exact. Treat small differences as noise.
- **Search interest, not usage.** Demand to search for a term is a proxy for
  attention and intent, not a measurement of active users.
- **Country set is fixed by config.** "Worldwide" reflects only the tracked
  countries. Adding countries changes the Worldwide series going forward; past
  snapshots remain immutable.
- **Keyword attribution is a modeling choice.** The head-query rule undercounts
  the long tail. This is documented and intentional.

## Reproducibility

Every derived file is regenerated from the immutable raw snapshots by
`npm run build`, with no credentials. CI runs `npm run check` and asserts the
committed CSVs match a fresh build, so the published numbers can always be traced
to, and reproduced from, their raw source.
