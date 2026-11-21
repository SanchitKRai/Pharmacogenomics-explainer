# Pharmacogenomics Explainer

A privacy-conscious educational prototype that parses consumer raw genotype exports and explains where a marker intersects with selected pharmacogenomic resources.

> **Important:** This is an educational research demo, not a medical device, diagnostic test, or prescribing tool. It does not infer star alleles, diplotypes, metabolizer phenotypes, or treatment recommendations from consumer SNP-array data. Never start, stop, or change medication based on this app. Discuss clinical pharmacogenetic testing and results with a qualified clinician or pharmacist.

## What it does

- Accepts a 23andMe-style tab-separated raw genotype text file (`rsid chromosome position genotype`).
- Parses comment lines and validates rows.
- Looks up a small, explicitly documented set of known pharmacogenomic marker IDs in the uploaded file.
- Explains the gene/drug context and CPIC guideline links in plain language.
- Labels absent markers as **not present in this file**, not as reference/wild-type.
- Processes the file locally in the browser; no upload endpoint or server-side genotype storage is implemented.

## Why the scope is intentionally narrow

Consumer SNP-array exports are not equivalent to clinical pharmacogene testing or whole-genome sequencing. They may not cover all clinically relevant variants, structural variants, copy-number changes, haplotypes, or ancestry-relevant alleles. A single rsID is not generally enough to assign a star-allele diplotype or phenotype. This prototype therefore reports marker presence and educational context only. See 23andMe's raw-data limitations and CPIC's intended clinical use in the links below.

## Run locally

This is a static app; no backend or API key is required.

```bash
python -m http.server 8000
```

Open http://localhost:8000.

## Supported demo marker panel

The included panel is illustrative and is not a complete clinical variant panel:

| Marker | Gene | Context shown |
|---|---|---|
| rs4244285 | CYP2C19 | Common loss-of-function allele marker; clopidogrel/PPI guideline context |
| rs4986893 | CYP2C19 | Common loss-of-function allele marker; clopidogrel/PPI guideline context |
| rs12248560 | CYP2C19 | Common increased-function allele marker; CYP2C19 guideline context |
| rs3892097 | CYP2D6 | Common decreased-function marker; CYP2D6 guideline context |
| rs776746 | CYP3A5 | CYP3A5 expression marker; tacrolimus guideline context |
| rs4149056 | SLCO1B1 | Statin-associated transporter marker; simvastatin guideline context |
| rs9923231 | VKORC1 | Warfarin sensitivity-associated marker; warfarin guideline context |
| rs6025 | F5 | Included only as an example of a non-CPIC pharmacogenomics-adjacent marker? **Not interpreted by this app** |

The panel does not claim that these markers alone determine drug response. Marker interpretation requires correct genome build/strand handling, validated assay coverage, and haplotype context. The app intentionally does not calculate phenotypes.

## Example file

Use the built-in synthetic example button in the app. It contains fabricated data solely to demonstrate parsing and matching. Do not upload another person's genetic file without their informed consent.

## Data and references

- [CPIC guidelines](https://cpicpgx.org/guidelines/) — CPIC guidelines explain how available genetic test results may inform drug therapy; they are intended for clinical use with professional interpretation.
- [ClinPGx / CPIC database and API resources](https://www.clinpgx.org/page/cpicResources) — structured data and API documentation.
- [23andMe raw data limitations](https://support.23andme.org/hc/en-us/articles/42965238938391-Navigating-Your-Raw-Data) — only a subset of raw markers have been individually validated; raw data is informational, not medical/diagnostic.
- [23andMe genotype format](https://support.23andme.org/hc/en-us/articles/42965202914711-How-23andMe-Reports-Genotypes) — genotype export fields and allele calls.

## Design implementation

The homepage follows the supplied GeneGuide Figma desktop layout and design tokens (canvas #060b11, surfaces #0d1722 / #132330, border #29404e, teal #70e8d3, Plus Jakarta Sans). The scientific hero illustration is stored locally in `assets/`; the app does not use expiring Figma URLs.

## Architecture

- `index.html`: Figma-aligned homepage and upload workspace.
- `styles.css`: responsive styling using the GeneGuide Figma tokens.
- `app.js`: local parsing, validation, marker matching, and rendering.
- `assets/geneguide-scientific-illustration.png`: local hero artwork exported from the supplied Figma design.
- `data/marker-panel.json`: small transparent educational marker panel.

## Current limitations / next research steps

1. Add versioned, machine-readable ClinPGx/CPIC guideline and allele resources with licenses and provenance.
2. Implement validated reference-build and strand harmonization.
3. For genes such as CYP2D6, support clinically validated copy-number and structural-variant-aware data only.
4. Add formal unit tests and a versioned test fixture set.
5. Have a clinical pharmacogenetics expert review any future phenotype or recommendation logic before deployment.

## Privacy

The app reads the selected file in the browser and does not transmit genotype rows. Do not treat this as a security audit; review the code and browser network activity before using sensitive data. Avoid committing any personal genomic data to GitHub.
