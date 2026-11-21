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

## Current limitations / next research steps

1. Integrate versioned, machine-readable ClinPGx allele and guideline data with provenance and license review.
2. Implement clinically validated reference-build and strand harmonization before any allele interpretation.
3. For complex genes such as CYP2D6, support validated copy-number and structural-variant-aware data only.
4. Obtain clinical pharmacogenetics expert review before adding phenotype or recommendation logic.

## Privacy

The app reads the selected genotype file in the browser and does not transmit genotype rows. This is not a security audit; review browser network activity before using sensitive data. Never commit personal genomic data to GitHub, and do not upload another person's data without informed consent.
