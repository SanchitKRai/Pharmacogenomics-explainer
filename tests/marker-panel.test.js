import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const panel=JSON.parse(await readFile(new URL("../data/marker-panel.json",import.meta.url),"utf8"));
test("seven unique markers include coordinates and plus-strand allele metadata",()=>{
 assert.equal(panel.markers.length,7);assert.equal(new Set(panel.markers.map(x=>x.rsid)).size,7);
 for(const m of panel.markers){
  assert.ok(Number.isInteger(m.grch37Pos)&&Number.isInteger(m.grch38Pos));
  assert.match(m.refAllele,/^[ACGT]$/);assert.match(m.effectAllele,/^[ACGT]$/);assert.ok(m.starAllele);
  assert.ok(m.refAllelesByBuild.grch37&&m.refAllelesByBuild.grch38);
  assert.ok(m.effectAllelesByBuild.grch37&&m.effectAllelesByBuild.grch38);
  assert.ok(m.cpic_url.startsWith("https://")&&m.dbsnp_url.startsWith("https://"));
 }
});
test("rs776746 includes its build-specific ref and effect orientations",()=>{
 const m=panel.markers.find(x=>x.rsid==="rs776746");
 assert.deepEqual(m.refAllelesByBuild,{grch37:"C",grch38:"T"});
 assert.deepEqual(m.effectAllelesByBuild,{grch37:"T",grch38:"C"});
});
test("panel retains explicit educational-only boundaries and evidence states",()=>{
 assert.match(panel.matching_policy,/does not harmonize clinical results/i);
 assert.ok(panel.evidence_states.found&&panel.evidence_states.unknown&&panel.evidence_states.not_found);
});
