import test from "node:test";
import assert from "node:assert/strict";
import { readFile,access } from "node:fs/promises";
const index=await readFile(new URL("../index.html",import.meta.url),"utf8");
const app=await readFile(new URL("../app.js",import.meta.url),"utf8");
const css=await readFile(new URL("../styles.css",import.meta.url),"utf8");
test("browser page exposes upload, build and format elements with guardrail",()=>{
 assert.match(index,/<script type="module" src="app\.js"><\/script>/);
 for(const id of ["genomeFile","buildBadge","formatBadge","summaryGrid","resultsList","unknownWrap","notFoundWrap","resetBtn","analyzeBtn","demoBtn"])assert.ok(index.includes('id="'+id+'"'),"missing "+id);
 assert.match(index,/MARKER MATCH ONLY — not a clinical phenotype or prescribing recommendation/);
 assert.match(app,/detectGenomeBuild/);assert.match(app,/txt\|tsv\|vcf/);
});
test("the app evidence files remain available",async()=>{
 for(const path of ["../data/marker-panel.json","../data/guideline-index.json","../data/variant-evidence.json"])await access(new URL(path,import.meta.url));
});
test("style sheet retains evidence blocks and includes build/zygosity pills",()=>{
 for(const selector of [".variant-evidence",".variant-evidence-heading",".build-badge",".zygosity-pill",".zygosity-reference",".zygosity-heterozygous",".zygosity-variant",".zygosity-mismatch"])assert.ok(css.includes(selector));
});
