import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const evidenceUrl = new URL("../data/variant-evidence.json", import.meta.url);
const panelUrl = new URL("../data/marker-panel.json", import.meta.url);
const evidence = JSON.parse(await readFile(evidenceUrl, "utf8"));
const panel = JSON.parse(await readFile(panelUrl, "utf8"));

test("variant evidence snapshot has versioned PharmVar and CPIC provenance", () => {
  assert.equal(evidence.schema_version, "1.0.0");
  assert.equal(evidence.snapshot_date, "2026-11-21");
  assert.equal(evidence.provenance.pharmvar_version_observed, "6.2.29");
  assert.equal(evidence.provenance.cpic_data_release_observed, "v1.61.0");
  assert.ok(evidence.provenance.pharmvar_license_url.startsWith("https://"));
  assert.ok(evidence.provenance.cpic_license_url.startsWith("https://"));
});

test("every marker-panel rsID has one variant evidence record and direct provenance", () => {
  const ids = evidence.variants.map(item => item.rsid);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(new Set(ids), new Set(panel.markers.map(item => item.rsid)));

  for (const item of evidence.variants) {
    assert.ok(item.gene.length > 1);
    assert.ok(item.display_variant.length > 2);
    assert.ok(item.molecular_effect.length > 15);
    assert.ok(item.evidence_summary.length > 30);
    assert.ok(item.allele_associations.length > 0);
    assert.ok(item.allele_definition_url.startsWith("https://"));
    assert.ok(item.additional_required_context.length > 20);
  }
});

test("CYP2C19*2 record reflects the 2026 core-definition update", () => {
  const item = evidence.variants.find(v => v.rsid === "rs4244285");
  assert.equal(item.allele_associations[0].allele, "CYP2C19*2");
  assert.match(item.allele_associations[0].note, /only core variant/i);
  assert.ok(item.additional_evidence_url.includes("cyp2c19-2-core-allele-definition-update"));
});

test("multi-variant allele groups do not collapse to one rsID", () => {
  const slco = evidence.variants.find(v => v.rsid === "rs4149056");
  assert.ok(slco.allele_associations.length >= 2);
  assert.match(slco.additional_required_context, /rs4149056 alone/i);

  const cyp19star3 = evidence.variants.find(v => v.rsid === "rs4986893");
  assert.match(cyp19star3.allele_associations[0].note, /rs3758581/);

  const cyp19star17 = evidence.variants.find(v => v.rsid === "rs12248560");
  assert.match(cyp19star17.allele_associations[0].note, /rs3758581/);
});

test("VKORC1 regulatory locus is not mislabeled as a star allele", () => {
  const vkor = evidence.variants.find(v => v.rsid === "rs9923231");
  assert.match(vkor.allele_associations[0].relationship, /no CYP-style star allele/i);
});
