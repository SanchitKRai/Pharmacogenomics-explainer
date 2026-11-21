# Pharmacogenomics Explainer

A privacy-conscious educational prototype that reads a 23andMe-style raw genotype text export, finds selected pharmacogenomic marker IDs, and explains the relevant gene / drug guideline context in plain language.

> **Important:** This is an educational research prototype, not a medical device, diagnostic test, clinical pharmacogenetic report, or prescribing tool. It does not infer star alleles, diplotypes, metabolizer phenotypes, or treatment recommendations. Never start, stop, or change medication based on this app. Discuss clinical pharmacogenetic testing and results with a qualified clinician or pharmacist.

## What it does

- Accepts a tab-separated TXT / TSV file with `rsid chromosome position genotype` columns.
- Skips comment lines and validates the row structure.
- Matches a small, versioned educational marker panel by rsID.
- Displays raw genotype calls and links to CPIC gene / guideline resources and dbSNP records.
- Separates three evidence states: **call found**, **unknown / no-call**, and **not found in file**.
- Reads the genotype file in the browser; there is no server upload endpoint or server-side genotype storage.

## Evidence states

| State | Meaning | What it does not mean |
|---|---|---|
| Call found in file | A panel rsID exists with a two-base A/C/G/T genotype string. | It does not establish a functional allele, star allele, diplotype, phenotype, or drug response. |
| Unknown / no-call | The rsID exists, but its call is `--`, an indel code, a single base, malformed, or duplicated. | It is not a reference genotype or a negative result. |
| Not found in file | The rsID does not occur in the uploaded file. | It does not prove the variant is biologically absent or the gene has normal function. |

23andMe documents `--` as a not-determined genotype call. Its raw data can also include insertions and deletions, and only a subset of markers have been individually validated. The parser therefore preserves these conditions as unknown rather than silently treating them as absent. See [23andMe genotype reporting](https://support.23andme.org/hc/en-us/articles/42965202914711-How-23andMe-Reports-Genotypes) and [raw-data limitations](https://customercare.23andme.com/hc/en-us/articles/115004310067-Navigating-Your-Raw-Data).

## Scientific and technical boundaries

- Matching is by rsID only. The app does not harmonize reference genome build or strand.
- Coordinates are retained from the file but are not used to determine allele identity.
- A raw two-letter genotype does not by itself identify the clinically relevant allele or its function.
- The app does not calculate star alleles, diplotypes, activity scores, metabolizer phenotypes, drug response, or dose recommendations.
- CYP2D6 can involve deletions, duplications, hybrid alleles and multiple defining variants; this demo does not resolve structural variation.
- The current CPIC statin guideline considers **SLCO1B1, ABCG2 and CYP2C9**. The SLCO1B1 rs4149056 variant occurs in more than one haplotype (including *5 and *15), so one marker is not a unique star-allele identifier. See the [2022 CPIC statin guideline](https://files.cpicpgx.org/data/guideline/publication/statins/2022/publication.pdf).
- The warfarin CPIC guideline considers VKORC1 together with CYP2C9 and CYP4F2; this app does not calculate a warfarin dose.

The panel is illustrative and incomplete. It is not a clinically validated genotyping panel.

## Run locally

This is a static app; no backend or API key is required. Serve it over HTTP because the browser loads the versioned marker panel from `data/marker-panel.json`.

```bash
python -m http.server 8000
```

Open http://localhost:8000.

## Run automated tests

Node.js 22 is used by the GitHub Actions workflow. No external npm packages are required.

```bash
npm test
```

The tests cover valid raw calls, comments, `--` no-calls, indel and single-base values, malformed calls, duplicate rsIDs, absent markers, and marker-panel JSON integrity.

## Supported educational marker panel

The definitions are versioned in [data/marker-panel.json](data/marker-panel.json). Each marker includes a gene context, a limitation statement, a CPIC resource link, and a dbSNP record.

| Marker | Gene | Context shown |
|---|---|---|
| rs4244285 | CYP2C19 | Marker used in the *2 allele definition |
| rs4986893 | CYP2C19 | Marker used in the *3 allele definition |
| rs12248560 | CYP2C19 | Promoter marker used in the *17 allele definition |
| rs3892097 | CYP2D6 | Splice-site marker associated with *4 interpretation |
| rs776746 | CYP3A5 | *3-associated splice marker |
| rs4149056 | SLCO1B1 | c.521T>C transporter marker; present in more than one haplotype |
| rs9923231 | VKORC1 | −1639G>A regulatory marker relevant to multi-gene warfarin context |

## Data and references

- [CPIC guideline library](https://cpicpgx.org/guidelines/) — guidelines explain how available genetic test results may be used to optimize drug therapy in clinical care.
- [ClinPGx / CPIC resources](https://www.clinpgx.org/page/cpicResources) — structured pharmacogenomics data and API resources.
- [ClinPGx API documentation](https://api.cpicpgx.org/) — public API and data views.
- [23andMe genotype reporting](https://support.23andme.org/hc/en-us/articles/42965202914711-How-23andMe-Reports-Genotypes) — genotype fields and no-call format.
- [23andMe raw-data limitations](https://customercare.23andme.com/hc/en-us/articles/42965238938391-Navigating-Your-Raw-Data) — raw data is informational and only a subset of markers are individually validated.

## Design implementation

The homepage follows the supplied GeneGuide Figma desktop layout and design tokens (canvas #060b11, surfaces #0d1722 / #132330, border #29404e, teal #70e8d3, Plus Jakarta Sans). The scientific hero illustration is stored locally in `assets/`; the app does not use temporary Figma asset URLs.

## Architecture

- `index.html`: Figma-aligned homepage and upload workspace.
- `styles.css`: responsive styling using GeneGuide design tokens.
- `app.js`: browser UI, marker-state rendering, and local file handling.
- `genotype-parser.js`: isolated parser and evidence-state classification logic.
- `data/marker-panel.json`: versioned, transparent educational marker definitions.
- `tests/`: Node's built-in automated tests.
- `package.json`: test command; no runtime dependencies.
- `assets/geneguide-scientific-illustration.png`: local hero artwork exported from the supplied Figma design.

## CPIC / ClinPGx guideline mapping

The app loads a dated, versioned local snapshot from `data/guideline-index.json`. It currently maps the marker-panel genes to six relevant CPIC guideline contexts: CYP2C19–clopidogrel, CYP2C19–proton pump inhibitors, serotonin reuptake inhibitor antidepressants, CYP3A5–tacrolimus, statins, and warfarin.

Each entry records its publication year, source page, publication link, PMID / DOI where available, gene–drug pair, and a pair-level status:

- `actionable_recommendations`: CPIC has actionable recommendations for at least one named drug in that gene pair.
- `multi_gene_actionable`: the gene is part of a multi-gene guideline; the complete clinical algorithm requires more than this marker or gene alone.
- `evaluated_without_actionable_recommendation`: the gene was evaluated in that guideline but CPIC does not provide an actionable recommendation for the named context.

**Important:** This is gene-level guideline navigation, not variant-to-phenotype translation. The app does not claim that a raw rsID is sufficient for the guideline's allele definitions, diplotype, activity score, phenotype, or recommendations. The statin guideline includes CYP3A5 in its evaluation without an actionable recommendation for that gene in the statin context; CYP3A5 has a separate CPIC guideline for tacrolimus.

The snapshot was checked against the official CPIC guideline directory on 2026-11-21 (29 guidelines listed on that directory at the time). The latest CPIC data repository release observed for this snapshot was v1.61.0, dated 2026-10-26, with a full database export. The preceding v1.60.1 release (2026-08-12) was an application-only API fix without a database image. This release metadata does not imply that the app's curated local subset was generated directly from the database dump. The app therefore does **not** claim that the local snapshot is a direct or live API response. The public ClinPGx API is available as JSON, but its documentation notes that the API is under development and its parameters / responses may change; API use is also subject to rate limits and a data usage policy.

Primary references:
- [CPIC guideline directory](https://www.clinpgx.org/cpic/guidelines)
- [CPIC Data API documentation and releases](https://github.com/cpicpgx/cpic-data)
- [ClinPGx API](https://api.clinpgx.org/)
- [CPIC licensing and terms](https://github.com/cpicpgx/cpic-data/blob/main/LICENSE.md)

## Variant-to-allele evidence

The app also loads `data/variant-evidence.json`, a dated, manually curated subset of official PharmVar allele-definition evidence for the seven marker-panel rsIDs. It displays the sequence notation, known allele-group associations, functional context where supported, and direct source links.

This layer is intentionally **not** an allele caller:
- It maps an rsID to documented allele-definition evidence; it does not assign a star allele to an uploaded genotype.
- CYP2C19*2 core definition was updated in 2026: c.681G>A (rs4244285) is now the only core variant defining the *2 group. The prior core definition included additional variants that newer *2 sequences showed were not present in every *2 haplotype.
- CYP2C19*3 and *17 definitions include additional core sequence context; the marker alone is insufficient to establish a haplotype.
- CYP2D6*4 includes rs3892097 as a splice-defect variant, but the gene has complex suballeles and structural variation, including deletions, duplications and hybrid genes.
- CYP3A5*3 is a splice-defect allele group containing rs776746; other CYP3A5 no-function alleles also exist.
- SLCO1B1 rs4149056 occurs in multiple haplotypes; it cannot distinguish *5, *15-related or other allele groups on its own.
- VKORC1 rs9923231 is shown as a regulatory variant, not assigned a CYP-style PharmVar star allele.

The current snapshot observed PharmVar v6.2.29 (2026-09-22) and CPIC data v1.61.0 (2026-10-26). PharmVar allele definitions are licensed CC BY-SA 4.0; CPIC curated content is CC0 1.0, with attribution and current-source verification requested. See the provenance fields in `data/variant-evidence.json`.

The parser currently displays the raw genotype call exactly as supplied. It does not harmonize reference genome build, genomic strand, transcript orientation or REF/ALT alleles. 23andMe states that its raw genotype calls are reported on the positive strand of the selected GRCh37 or GRCh38 assembly; other providers and databases may use different conventions. See [23andMe's reference genome and strand documentation](https://customercare.23andme.com/hc/en-us/articles/212883767-Which-Reference-Genome-and-Strand-Does-23andMe-Use).

## Current limitations / next research steps

1. Integrate versioned, machine-readable ClinPGx allele and guideline data with provenance and license review.
2. Implement clinically validated reference-build and strand harmonization before any allele interpretation.
3. For complex genes such as CYP2D6, support validated copy-number and structural-variant-aware data only.
4. Obtain clinical pharmacogenetics expert review before adding phenotype or recommendation logic.

## Privacy

The app reads the selected genotype file in the browser and does not transmit genotype rows. This is not a security audit; review browser network activity before using sensitive data. Never commit personal genomic data to GitHub, and do not upload another person's data without informed consent.
