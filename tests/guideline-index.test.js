import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const indexUrl = new URL("../data/guideline-index.json", import.meta.url);
const panelUrl = new URL("../data/marker-panel.json", import.meta.url);
const index = JSON.parse(await readFile(indexUrl, "utf8"));
const panel = JSON.parse(await readFile(panelUrl, "utf8"));

test("guideline index has dated provenance and a source directory", () => {
  assert.equal(index.snapshot_date, "2026-11-21");
  assert.ok(index.source.directory_url.startsWith("https://"));
  assert.ok(index.source.data_repository_releases.includes("github.com/cpicpgx/cpic-data"));
  assert.equal(index.guidelines.length, 6);
  assert.equal(index.source.latest_observed_release, "v1.61.0");
  assert.equal(index.source.latest_observed_release_date, "2026-10-26");
  assert.ok(index.source.database_dump_url.endsWith("cpic_db_dump-v1.61.0.sql.gz"));
});

test("guideline identifiers are unique and each record has publication provenance", () => {
  const ids = index.guidelines.map(guideline => guideline.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const guideline of index.guidelines) {
    assert.ok(guideline.title.length > 8);
    assert.ok(guideline.year >= 2015);
    assert.ok(guideline.source_url.startsWith("https://"));
    assert.ok(guideline.pubmed_url.startsWith("https://"));
    assert.ok(guideline.pmid.length > 4);
    assert.ok(guideline.doi.startsWith("10."));
    assert.ok(guideline.gene_pairs.length > 0);
  }
});

test("all supported marker genes have at least one guideline context", () => {
  const genesInIndex = new Set(index.guidelines.flatMap(g => g.gene_pairs.map(pair => pair.gene)));
  const markerGenes = new Set(panel.markers.map(marker => marker.gene));
  for (const gene of markerGenes) assert.ok(genesInIndex.has(gene), gene);
});

test("actionable and evaluated-without-actionable states remain distinct", () => {
  const pairs = index.guidelines.flatMap(g => g.gene_pairs);
  assert.ok(pairs.some(pair => pair.status === "actionable_recommendations"));
  assert.ok(pairs.some(pair => pair.status === "multi_gene_actionable"));
  assert.ok(pairs.some(pair => pair.status === "evaluated_without_actionable_recommendation"));
  const statinCyp3a5 = index.guidelines
    .find(g => g.id === "cpic-slco1b1-abcg2-cyp2c9-statins-2022")
    .gene_pairs.find(pair => pair.gene === "CYP3A5");
  assert.equal(statinCyp3a5.status, "evaluated_without_actionable_recommendation");
});
