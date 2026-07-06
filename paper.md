---
title: 'Cleanor Search Index: an open, reproducible pipeline for a longitudinal index of category popularity from Google search demand'
tags:
  - open data
  - search demand
  - information retrieval
  - Google Keyword Planner
  - reproducible research
  - JavaScript
authors:
  - name: Cleanor Labs
    orcid: 0009-0005-4623-961X
    affiliation: 1
affiliations:
  - name: Cleanor Research Labs
    index: 1
date: 6 July 2026
bibliography: paper.bib
---

# Summary

The Cleanor Search Index is an open dataset and the reproducible pipeline that
produces it: a monthly, per-country index of software-category "popularity"
measured from real Google search demand. For each tracked category (for
example, AI assistants) the pipeline records the average monthly search volume
of every brand's head query, per country, using the Google Ads Keyword Planner
historical-metrics endpoint, and stores each capture as an immutable snapshot.
Derived leaderboards, market shares, and month-over-month and year-over-year
changes are recomputed from those snapshots by a credential-free build step,
and continuous integration asserts that the published figures match their raw
source byte-for-byte. Code is released under MIT and the data under CC BY 4.0.

# Statement of need

Search-interest data is a widely used proxy for public attention and demand in
economics, epidemiology, and information science [@choi2012predicting;
@ginsberg2009detecting]. The most common public source, Google Trends, returns
only relative, normalized indices rather than absolute volumes, and its values
are drawn from a sample that changes over time, which complicates cross-term and
longitudinal comparison [@lazer2014parable]. Google Keyword Planner instead
exposes absolute average monthly search counts per country, but only for a
trailing window of roughly twelve months that advances every month. As a
result, a consistent long-run series of absolute demand does not exist unless it
is captured prospectively, snapshot by snapshot.

This project fills that gap by (1) capturing immutable monthly snapshots so the
history accumulates, (2) applying a single, documented keyword-attribution rule
so brands remain comparable within a country and over time, and (3) shipping the
entire transform as reproducible code so any researcher can regenerate and audit
every published number without special access. The dataset supports work on
technology adoption, demand forecasting, and the geography of interest in
emerging software categories.

# State of the field

Existing tooling addresses adjacent but distinct needs. Google Trends and its
unofficial client libraries (for example `pytrends`) return normalized relative
interest, not absolute volume, and do not preserve a stable long-run baseline.
Commercial SEO platforms (Ahrefs, Semrush, and similar) provide absolute
estimates but are proprietary, paywalled, and non-reproducible: their figures
cannot be independently audited and their historical series cannot be
regenerated from source. Academic uses of search data typically either accept
the limitations of Trends or negotiate one-off private data access, neither of
which yields a shareable, extensible, openly licensed longitudinal dataset. To
our knowledge there is no open, reproducible pipeline that captures absolute
per-country Keyword Planner demand into an accumulating, auditable time series.
The Cleanor Search Index occupies that niche.

# Software design

The pipeline is deliberately factored so that the scientifically important
step, transforming raw demand into the published index, is independent of the
credentialed data-capture step:

- `src/fetch.mjs` performs the live capture. It authenticates to the Google Ads
  API, requests historical metrics per country for each configured keyword, and
  writes one immutable raw snapshot per category per month to
  `data/popularity/<category>/<YYYY-MM>.json`. This is the only component that
  requires credentials.
- `src/lib.mjs` contains the side-effect-free transforms: keyword-to-brand
  aggregation, per-scope leaderboard construction (per country and a summed
  "Worldwide" scope), share and growth computation, and CSV serialization.
- `src/build.mjs` recomputes every derived artifact purely from the committed
  raw snapshots, with no network access, by calling the same transforms. This is
  what makes the results reproducible: `npm run build` regenerates the published
  files exactly, and CI runs it and fails if the working tree changes.
- `src/validate.mjs` enforces structural invariants on the raw data and config.

Configuration (`config/popularity-config.json`) declares the tracked categories,
each brand's head query and spelling variants, and the target countries, so
extending coverage requires no code changes. Immutability of raw snapshots plus
a deterministic build gives the dataset the audit trail expected of research
data.

# Research impact statement

The index enables research that depends on absolute, comparable, longitudinal
demand signals rather than normalized indices: measuring the adoption curve and
international diffusion of new software categories, comparing the relative reach
of competing products across markets, and providing an openly licensed baseline
against which forecasting or nowcasting methods can be evaluated. Because the
capture is prospective and immutable, the value of the dataset compounds over
time in a way that cannot be reconstructed after the fact from any existing
public source. The accompanying human-readable analyses are published at
<https://cleanor.app/trends>.

# AI usage disclosure

Portions of the code and the prose in this repository were drafted with the
assistance of AI coding tools and reviewed by the authors, who take
responsibility for the correctness of the software, the data pipeline, and the
claims made here. No AI system was used to generate or alter the underlying
search-volume measurements, which come directly from the Google Ads API.

# Acknowledgements

This work relies on the Google Ads API and its Keyword Planner historical
metrics as the sole data source for search volumes.

# References
