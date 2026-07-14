# Methodology

## Source

All search volumes come from the Google Ads API `generateKeywordHistoricalMetrics`
endpoint (Keyword Planner). It returns, for a keyword and a geo target, the
average monthly searches and the last ~12 monthly data points. We request each
country independently.

## What we count per brand

**Exactly one head keyword per tracked item**, and never its sub-queries. Search
demand is nested: Keyword Planner's volume for `claude` already contains
`claude ai`, `claude.ai` and `claude code`, and the volume for `chatgpt` already
contains `chatgpt login` and `chatgpt app`. Adding variants or children to the
head term would double-count that demand, so we do not. Sub-products that live
inside a parent term (Claude Code inside `claude`) are not separate rows.

This undercounts a product's long tail on purpose, a conscious tradeoff in
exchange for comparability and no double counting. Every item's single key is
listed in `config/popularity-config.json`.

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
  directional, not exact. Treat small differences as noise. Across the 35,760
  monthly rows in `data/popularity/csv/` there are only 81 distinct volume
  values, which is the banding made visible.
- **Withheld terms.** Keyword Planner returns null metrics for some keywords,
  cryptocurrency asset names among them (`bitcoin`, `ethereum`, `xrp`,
  `solana`). A coin leaderboard is impossible from this source, which is why the
  `crypto` category tracks exchanges and wallets instead. A zero can mean "no
  data", not "no demand".
- **Search interest, not usage.** Demand to search for a term is a proxy for
  attention and intent, not a measurement of active users.
- **Country set is fixed by config.** "Worldwide" reflects only the tracked
  countries. Adding countries changes the Worldwide series going forward; past
  snapshots remain immutable.
- **Keyword attribution is a modeling choice.** The head-query rule undercounts
  the long tail, and disambiguated terms (`gemini ai`, `golang`) miss people who
  search the bare word and mean the product. This is documented and intentional.

Full detail, with the evidence, in
[Keyword Planner data explained](keyword-planner-data-explained.md).

## Reproducibility

Every derived file is regenerated from the immutable raw snapshots by
`npm run build`, with no credentials. CI runs `npm run check` and asserts the
committed CSVs match a fresh build, so the published numbers can always be traced
to, and reproduced from, their raw source.
