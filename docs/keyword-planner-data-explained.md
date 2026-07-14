# Keyword Planner data explained

**Google Keyword Planner reports the average number of monthly Google searches for a keyword, in a country, over a trailing 12-month window. It is real, absolute demand, not a normalised index, which is why it is worth building a dataset on. But it is rounded into bands, a head term absorbs the queries nested under it, and for some terms Google withholds the numbers entirely. This page documents what that means for the Cleanor Search Index, with the evidence taken from the committed files.**

## What the number actually is

The Google Ads API endpoint `generateKeywordHistoricalMetrics` returns, for a keyword and a geo target, an `avgMonthlySearches` figure, roughly 12 individual `monthlySearchVolumes` points, and a competition label (`low`, `medium`, `high`) that is an advertiser-competition signal, not a popularity signal.

This is search **demand**: how many times people typed that query into Google. It is a proxy for attention and intent, not a measure of active users, installs, revenue or market share, and it should never be quoted as one. A product people reach through an app icon rather than a search box will look smaller here than it is in the world.

## Limitation 1: the values are rounded into bands

This is the big one, and it is visible in the data.

Across all **35,760 monthly rows** in `data/popularity/csv/*-monthly.csv` there are only **81 distinct volume values**. Not 81 per series: 81 in the entire dataset. The bottom of the ladder runs `10, 20, 30, 40, 50, 70, 90, 110, 140, 170, 210, 260, 320`, and the top runs `101000000, 124000000, 151000000, 185000000, 226000000, 277000000`. Each rung is roughly 1.2 to 1.25 times the one below it: the ladder is logarithmic.

So a keyword does not have a volume, it has a **bucket**. Two consequences:

- **Small differences are noise.** If item A shows 4,400 and item B shows 5,400, those are adjacent rungs, not a meaningful gap.
- **Series look like staircases.** In the `2026-06` snapshot, ChatGPT in the US takes exactly two values across twelve months: `101000000` for three months, then `124000000` for nine (`popularity-ai-monthly.csv`). That is one step up the ladder, not a real jump followed by nine flat months.

A related trap: the reported average is itself rounded, and it is **not** the mean of the monthly points Google hands you alongside it. In **2,907 of the 2,980 series** in this snapshot (97.6%), `avg` differs from the arithmetic mean of that series' twelve monthly values. Canva in the US reports an `avg` of `24,900,000` while its own twelve points average `25,308,333`. Both numbers are Google's, and we publish each as given rather than reconciling them.

The practical rule: trust the order of magnitude and the direction, use **share** rather than raw volume when comparing countries of very different sizes, and never report a percentage change to one decimal place as though it were measured.

## Limitation 2: Google withholds volumes for some terms

Keyword Planner does not return metrics for every keyword you ask about. The clearest case, and the one that shaped this dataset, is cryptocurrency.

**Keyword Planner withholds historical volume for cryptocurrency asset names.** `bitcoin`, `ethereum`, `xrp`, `solana` and the rest all return null metrics, so a coin leaderboard is impossible to build from this source at any budget. That is why the `crypto` category here tracks **exchanges and wallets** (Binance, Coinbase, MetaMask, Phantom) instead: platform and app names are not restricted and do return real volumes. The constraint is recorded in the `crypto` block of `config/popularity-config.json`.

Treat that as a general warning, not a crypto quirk. A zero can mean "below the reporting threshold" or "we will not tell you", and not "nobody searched for this". Our pipeline coerces a null metric to `0` (`src/fetch.mjs`), so if you extend the config into a restricted area, check that a zero is real before publishing it as one.

## Limitation 3: demand is nested, so a head term already contains its long tail

Keyword Planner's volume for a broad head term subsumes the queries that contain it: the volume for `claude` already includes `claude ai`, `claude.ai` and `claude code`. Summing a brand's head term with its own sub-queries therefore double-counts, badly. Hence this dataset's rule, **exactly one head keyword per item, never its children**, and no separate row for a sub-product that lives inside a parent term.

The same nesting creates a naming problem. Some names are also ordinary words, and the bare term then measures the word, not the product: Gemini is a zodiac sign, Copilot is an Office feature, Mistral is a wind, and `go`, `rust`, `swift` and `ruby` are English words. Those items use a disambiguated head term (`gemini ai`, `copilot ai`, `golang`, `swift programming`), which is a **modelling choice, and a lossy one**: `gemini ai` misses everyone who searches plain `gemini` and means the model. Names the product owns outright (`claude`, `grok`, `deepseek`, `qwen`, `perplexity`, `midjourney`, `chatgpt`) keep the bare word. Every mapping sits in `config/popularity-config.json`, correctable by pull request.

One API quirk if you extend the config: Keyword Planner echoes dotted keywords back with the dot stripped, so names like `crypto.com` are stored dot-free to make the response match.

## Limitation 4: the window rolls, and past months disappear

The API returns a trailing 12-month window that moves forward every month, and anything older is not available from the source at all. That is the reason this repository exists: each snapshot is committed and never rewritten, so history accumulates here even as Google's window slides on. It also means `yoy_pct` compares the latest month with the first month **of the window**, not with a fixed calendar anchor.

## Limitation 5: "Worldwide" is a defined sum, not the globe

The `WW` scope is the per-item, per-month sum across the 20 countries in the config, not global search volume. Adding a country changes `WW` from that snapshot forward, and earlier snapshots stay as they were.

## The short version

Keyword Planner is the best free source of absolute search demand there is, and it is coarse. Use it for rank, share, magnitude and direction, not for precision. And read a zero as "no data", not as "no demand".

## More

- [What the dataset is, and how to cite it](google-search-volume-dataset.md)
- [Methodology](methodology.md): the keyword rule, the scopes, the derived figures
- The index, charted: <https://cleanor.app/trends>
