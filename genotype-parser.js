/**
 * Parse a 23andMe-style raw genotype text export.
 *
 * This parser only validates row structure and preserves raw calls. It does not
 * normalize reference strand/build or infer alleles, diplotypes, phenotypes,
 * drug response, or clinical recommendations.
 */
const RSID_PATTERN = /^(?:rs\d+|i\d+)$/i;
const CHROMOSOME_PATTERN = /^(?:[1-9]|1[0-9]|2[0-2]|X|Y|MT)$/i;
const RAW_CALL_PATTERN = /^(?:[ACGTID]{1,2}|--)$/i;
const DIPLOID_SNP_CALL_PATTERN = /^[ACGT]{2}$/i;

export function parseRawData(raw) {
  if (typeof raw !== "string") {
    throw new TypeError("Raw genotype input must be text.");
  }

  const rows = new Map();
  let validRows = 0;
  let skippedRows = 0;
  let duplicateRows = 0;

  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const parts = line.split(/\t|\s+/);
    if (parts.length < 4) {
      skippedRows += 1;
      continue;
    }

    const [rsid, chromosome, position, rawGenotype] = parts;
    if (
      !RSID_PATTERN.test(rsid) ||
      !CHROMOSOME_PATTERN.test(chromosome) ||
      !/^\d+$/.test(position)
    ) {
      skippedRows += 1;
      continue;
    }

    // Keep structurally valid rows even when their call is missing or unusual.
    // That lets the UI distinguish "unknown" from "not found".
    const genotype = String(rawGenotype ?? "").toUpperCase();
    const row = {
      rsid,
      chromosome,
      position,
      genotype,
      callFormatValid: RAW_CALL_PATTERN.test(genotype),
      duplicate: false
    };
    const key = rsid.toLowerCase();

    validRows += 1;
    if (rows.has(key)) {
      duplicateRows += 1;
      rows.get(key).duplicate = true;
    } else {
      rows.set(key, row);
    }
  }

  if (validRows === 0) {
    throw new Error(
      "No structurally valid genotype rows found. Expected rsid, chromosome, position and genotype columns."
    );
  }

  return { rows, validRows, uniqueMarkers: rows.size, skippedRows, duplicateRows };
}

/**
 * Classify the evidence state for one marker in the curated panel.
 *
 * "found" means a two-base A/C/G/T call is available in the raw file only.
 * It does not mean the alternate allele, star allele, or phenotype is present.
 */
export function classifyMarker(marker, parsed) {
  const key = String(marker.rsid).toLowerCase();
  const row = parsed.rows.get(key);

  if (!row) {
    return {
      status: "not_found",
      reason: "The rsID does not occur in this file. That is not a reference-genotype or negative result."
    };
  }

  if (row.duplicate) {
    return {
      status: "unknown",
      row,
      reason: "More than one row with this rsID was found. The app does not choose between duplicate entries."
    };
  }

  if (row.genotype === "--") {
    return {
      status: "unknown",
      row,
      reason: 'The file records "--" (not determined). No genotype call is available for this marker.'
    };
  }

  if (!row.callFormatValid) {
    return {
      status: "unknown",
      row,
      reason: "The genotype field contains a format this parser does not recognize."
    };
  }

  if (!DIPLOID_SNP_CALL_PATTERN.test(row.genotype)) {
    return {
      status: "unknown",
      row,
      reason: "This panel expects a diploid A/C/G/T SNP call. A single base or insertion/deletion code is not interpreted by this panel."
    };
  }

  return { status: "found", row, reason: null };
}
