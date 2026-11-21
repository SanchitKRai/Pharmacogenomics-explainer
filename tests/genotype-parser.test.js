import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseRawData, classifyMarker, detectGenomeBuild, classifyZygosity } from "../genotype-parser.js";
const panel=JSON.parse(await readFile(new URL("../data/marker-panel.json",import.meta.url),"utf8")).markers;
const cyp2c19=panel.find(x=>x.rsid==="rs4244285");

test("auto-detects standard TXT/TSV and ignores comment headers",()=>{
 const p=parseRawData("# generated file\n# rsid\tchromosome\tposition\tgenotype\nrs4244285\t10\t94781859\tAG");
 assert.equal(p.format,"standard");assert.equal(classifyMarker(cyp2c19,p,"GRCh38 / hg38").zygosity,"heterozygous");
});
test("auto-detects AncestryDNA five-column input and joins allele1/allele2",()=>{
 const p=parseRawData("rsid\tchromosome\tposition\tallele1\tallele2\nrs4244285\t10\t94781859\tA\tG");
 assert.equal(p.format,"ancestrydna");assert.equal(p.rows.get("rs4244285").genotype,"AG");
});
test("parses one-sample VCF GT indexes through REF and ALT",()=>{
 const vcf="##fileformat=VCFv4.2\n#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tSAMPLE\n10\t94781859\trs4244285\tG\tA\t.\tPASS\t.\tGT:DP\t0|1:32";
 const p=parseRawData(vcf);assert.equal(p.format,"vcf");assert.equal(p.rows.get("rs4244285").genotype,"GA");
 assert.equal(p.rows.get("rs4244285").strandOrientation,"plus");
});
test("rejects a multi-sample VCF instead of picking a sample",()=>{
 const vcf="##fileformat=VCFv4.2\n#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tS1\tS2\n10\t94781859\trs4244285\tG\tA\t.\tPASS\t.\tGT\t0/1\t0/0";
 assert.throws(()=>parseRawData(vcf),/Multi-sample VCF/);
});
test("tracks no-calls, indels and malformed rows in diagnostics",()=>{
 const p=parseRawData(["rs4244285\t10\t94781859\t--","rs4986893\t10\t94780653\t00","rs12248560\t10\t94761900\tID","rs3892097\t22\t42128945\tA?","not-an-rsid\t22\t42128945\tCT"].join("\n"));
 assert.equal(p.diagnostics.noCallRows,2);assert.equal(p.diagnostics.indelRows,1);
 assert.equal(p.diagnostics.malformedRows,2);assert.equal(p.skippedRows,1);
});
test("keeps no-calls as unknown rather than reference or not-found",()=>{
 const p=parseRawData("rs4244285\t10\t94781859\t--");
 assert.equal(classifyMarker(cyp2c19,p).status,"unknown");
 assert.match(classifyMarker(cyp2c19,p).reason,/no-call/i);
});
test("classifies 0/0, 0/1 and 1/1 by effect-allele copy count",()=>{
 const found=["GG","GA","AA"].map(genotype=>classifyZygosity(cyp2c19,{genotype,strandOrientation:"unknown"},"GRCh38 / hg38").zygosity);
 assert.deepEqual(found,["reference","heterozygous","homozygous_variant"]);
});
test("reverse-complements unknown-strand non-palindromic calls",()=>{
 const r=classifyZygosity(cyp2c19,{genotype:"CT",strandOrientation:"unknown"},"GRCh38 / hg38");
 assert.equal(r.orientation,"reverse-complement");assert.equal(r.normalizedGenotype,"GA");
});
test("flags A/T and C/G palindromic SNPs when strand is unknown",()=>{
 const r=classifyZygosity({refAllele:"A",effectAllele:"T",alleles:["A","T"]},{genotype:"AT",strandOrientation:"unknown"});
 assert.equal(r.palindromic,true);assert.equal(r.zygosity,"palindromic_unresolved");
});
test("detects GRCh37, GRCh38 and mixed/unverified coordinates",()=>{
 const a=parseRawData("rs4244285\t10\t96541616\tGG"),b=parseRawData("rs4244285\t10\t94781859\tGG");
 const mixed=parseRawData("rs4244285\t10\t96541616\tGG\nrs4986893\t10\t94780653\tGG");
 assert.equal(detectGenomeBuild(a,panel),"GRCh37 / hg19");assert.equal(detectGenomeBuild(b,panel),"GRCh38 / hg38");
 assert.equal(detectGenomeBuild(mixed,panel),"Mixed / Unverified");
});
test("withholds rs776746 effect-count when build is not verified",()=>{
 const m=panel.find(x=>x.rsid==="rs776746");
 const a=classifyZygosity(m,{genotype:"TT",strandOrientation:"plus"},"GRCh37 / hg19");
 const b=classifyZygosity(m,{genotype:"CC",strandOrientation:"plus"},"GRCh38 / hg38");
 const c=classifyZygosity(m,{genotype:"CC",strandOrientation:"plus"},"Mixed / Unverified");
 assert.equal(a.effectAllele,"T");assert.equal(a.zygosity,"homozygous_variant");
 assert.equal(b.effectAllele,"C");assert.equal(b.zygosity,"homozygous_variant");
 assert.equal(c.effectAllele,"build-dependent");assert.equal(c.zygosity,"mismatch");
});
