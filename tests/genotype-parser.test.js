import test from "node:test";
import assert from "node:assert/strict";
import { parseRawData, classifyMarker } from "../genotype-parser.js";

const marker = { rsid: "rs4244285" };

test("parses a 23andMe-style tab-separated row and skips comments", () => {
  const parsed = parseRawData([
    "# generated raw genotype file",
    "# rsid\\tchromosome\\tposition\\tgenotype",
    "rs4244285\\t10\\t96521657\\tAG",
    "i713426\\t1\\t787173\\t--"
  ].join("\\n"));

  assert.equal(parsed.validRows, 2);
  assert.equal(parsed.skippedRows, 0);
  assert.equal(classifyMarker(marker, parsed).status, "found");
  assert.equal(classifyMarker(marker, parsed).row.genotype, "AG");
});

test('keeps a "--" no-call as present-but-unknown, not absent', () => {
  const parsed = parseRawData("rs4244285\\t10\\t96521657\\t--");
  const assessment = classifyMarker(marker, parsed);

  assert.equal(parsed.validRows, 1);
  assert.equal(assessment.status, "unknown");
  assert.match(assessment.reason, /not determined/i);
});

test("classifies indel codes and single-base calls as unknown for this SNP panel", () => {
  for (const genotype of ["DI", "II", "A"]) {
    const parsed = parseRawData("rs4244285\\t10\\t96521657\\t" + genotype);
    assert.equal(classifyMarker(marker, parsed).status, "unknown", genotype);
  }
});

test("classifies malformed genotype strings as unknown while preserving row presence", () => {
  const parsed = parseRawData("rs4244285\\t10\\t96521657\\tA?");
  const assessment = classifyMarker(marker, parsed);

  assert.equal(parsed.validRows, 1);
  assert.equal(assessment.status, "unknown");
  assert.match(assessment.reason, /format/i);
});

test("classifies duplicate rsIDs as unknown rather than choosing a call", () => {
  const parsed = parseRawData([
    "rs4244285\\t10\\t96521657\\tAG",
    "rs4244285\\t10\\t96521657\\tGG"
  ].join("\\n"));

  assert.equal(parsed.duplicateRows, 1);
  assert.equal(classifyMarker(marker, parsed).status, "unknown");
  assert.match(classifyMarker(marker, parsed).reason, /duplicate/i);
});

test("classifies a marker absent from the file as not_found", () => {
  const parsed = parseRawData("rs9999999\\t1\\t12345\\tAA");
  const assessment = classifyMarker(marker, parsed);

  assert.equal(assessment.status, "not_found");
  assert.match(assessment.reason, /not a reference-genotype/i);
});

test("skips structurally invalid rows and throws when no valid rows remain", () => {
  const parsed = parseRawData([
    "not-an-rsid\\t10\\t96521657\\tAG",
    "rs4244285\\tchr10\\t96521657\\tAG",
    "rs4986893\\t10\\tposition\\tGG",
    "rs4244285"
  ].join("\\n"));

  assert.equal(parsed.validRows, 0);
});
