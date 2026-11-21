import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const panelUrl = new URL("../data/marker-panel.json", import.meta.url);
const panel = JSON.parse(await readFile(panelUrl, "utf8"));

test("marker panel has a version, scope and explicit interpretation policy", () => {
  assert.equal(panel.panel_version.split(".").length, 3);
  assert.ok(panel.scope.length > 20);
  assert.ok(panel.matching_policy.includes("does not harmonize"));
});

test("panel rsIDs are unique and every marker carries provenance links and limits", () => {
  const ids = panel.markers.map(marker => marker.rsid);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(ids.length, 7);
  for (const marker of panel.markers) {
    assert.ok(marker.rsid.startsWith("rs"));
    assert.ok(marker.cpic_url.startsWith("https://"));
    assert.ok(marker.dbsnp_url.startsWith("https://"));
    assert.ok(marker.interpretation_limit.length > 30);
    assert.ok(marker.marker_meaning.length > 20);
  }
});

test("panel declares the three distinct evidence states", () => {
  assert.ok(panel.evidence_states.found);
  assert.ok(panel.evidence_states.unknown);
  assert.ok(panel.evidence_states.not_found);
  assert.ok(panel.evidence_states.unknown.includes("--"));
});
