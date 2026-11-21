/**
 * Browser-only parser for common genotype TXT/TSV exports and single-sample VCF.
 * It does not infer star alleles, diplotypes, phenotypes, drug response, or treatment.
 */
const RSID=/^rs\d+$/i, CHR=/^(?:chr)?(?:[1-9]|1[0-9]|2[0-2]|X|Y|M|MT)$/i, PAIR=/^[ACGT]{2}$/i;
const COMP={A:"T",T:"A",C:"G",G:"C"};
function split(line){return line.includes("\t")?line.split("\t").map(x=>x.trim()):line.trim().split(/\s+/);}
function normChr(v){const c=String(v||"").trim().replace(/^chr/i,"").toUpperCase();return c==="M"?"MT":c;}
function isHeader(f){const n=f.map(x=>x.toLowerCase().replace(/^#/,""));return n[0]==="rsid"||(n[0]==="chromosome"&&n.includes("position"))||((n[0]==="chrom"||n[0]==="#chrom")&&n.includes("pos"));}
export function detectFileFormat(raw,fileName=""){
 if(typeof raw!=="string")throw new TypeError("Raw genotype input must be text.");
 const lines=raw.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 if(/\.vcf$/i.test(fileName)||lines.some(x=>/^##fileformat=VCF/i.test(x)||/^#CHROM(?:\t|\s)/i.test(x)))return "vcf";
 const data=lines.find(x=>!x.startsWith("#")&&!isHeader(split(x)));if(!data)return "unknown";
 const n=split(data).length;return n===5?"ancestrydna":n===4?"standard":"unknown";
}
function rawCall(v){
 const s=String(v||"").trim().toUpperCase(),c=s.replace(/[\s/|]/g,"");
 if(["--","00",".","./.",".|.","./",".|"].includes(s)||["--","00","."].includes(c))return {genotype:c||"--",callKind:"no_call"};
 if(/^(?:I|D|II|DD|ID|DI)$/.test(c)||/^[ACGT]*[ID][ACGTID]*$/.test(c))return {genotype:c,callKind:"indel"};
 if(PAIR.test(c))return {genotype:c,callKind:"snp"};
 return {genotype:c||"(empty)",callKind:"malformed"};
}
function ancestryCall(a,b){
 const x=String(a||"").trim().toUpperCase(),y=String(b||"").trim().toUpperCase(),c=x+y;
 if((!x&&!y)||(x==="0"&&y==="0")||["0",".","-","--"].includes(x)||["0",".","-","--"].includes(y))return {genotype:c||"--",callKind:"no_call"};
 if(/^[ACGT]$/.test(x)&&/^[ACGT]$/.test(y))return {genotype:c,callKind:"snp"};
 if(/^[ACGTID]*[ID][ACGTID]*$/.test(c))return {genotype:c||"I/D",callKind:"indel"};
 return {genotype:c||"(empty)",callKind:"malformed"};
}
function coords(chr,pos){
 const c=String(chr||"").trim(),p=String(pos||"").trim();
 if(!c||c==="."||!p||p===".")return {valid:true,chromosome:null,position:null};
 if(!CHR.test(c)||!/^\d+$/.test(p))return {valid:false};
 return {valid:true,chromosome:normChr(c),position:Number(p)};
}
function create(format){return {rows:new Map(),format,formatLabel:format==="vcf"?"VCF":format==="ancestrydna"?"AncestryDNA 5-column":"TXT / TSV 4-column",validRows:0,uniqueMarkers:0,skippedRows:0,duplicateRows:0,diagnostics:{noCallRows:0,indelRows:0,malformedRows:0}};}
function add(parsed,row,id=row.rsid){
 parsed.validRows++;
 if(row.callKind==="no_call")parsed.diagnostics.noCallRows++;
 else if(row.callKind==="indel")parsed.diagnostics.indelRows++;
 else if(row.callKind==="malformed")parsed.diagnostics.malformedRows++;
 const key=String(id).toLowerCase();
 if(parsed.rows.has(key)){parsed.duplicateRows++;parsed.rows.get(key).duplicate=true;}
 else parsed.rows.set(key,{...row,rsid:id,duplicate:false});
}
function parseTabular(raw,format){
 const p=create(format);
 for(const ln of raw.split(/\r?\n/)){
  const line=ln.trim();if(!line||line.startsWith("#"))continue;
  const f=split(line);if(isHeader(f))continue;
  const need=format==="ancestrydna"?5:4;
  if(f.length!==need){p.skippedRows++;p.diagnostics.malformedRows++;continue;}
  const [rsid,chr,pos]=f,loc=coords(chr,pos);
  if(!RSID.test(rsid)||!loc.valid){p.skippedRows++;p.diagnostics.malformedRows++;continue;}
  const call=format==="ancestrydna"?ancestryCall(f[3],f[4]):rawCall(f[3]);
  add(p,{rsid,chromosome:loc.chromosome,position:loc.position,genotype:call.genotype,callKind:call.callKind,sourceFormat:format,strandOrientation:"unknown"});
 }return p;
}
function vcfCall(gt,ref,alt){
 const s=String(gt||"").trim();if([".","./.",".|."].includes(s))return {genotype:"--",callKind:"no_call"};
 const m=s.match(/^(\d+|\.)([\/|])(\d+|\.)$/);if(!m)return {genotype:s||"(missing GT)",callKind:"malformed"};
 if(m[1]==="."||m[3]===".")return {genotype:"--",callKind:"no_call"};
 const alleles=[ref,...String(alt||"").split(",")].map(x=>x.toUpperCase()),a=alleles[Number(m[1])],b=alleles[Number(m[3])];
 if(!a||!b)return {genotype:s,callKind:"malformed"};
 if(!/^[ACGT]$/.test(a)||!/^[ACGT]$/.test(b))return {genotype:a+"/"+b,callKind:"indel"};
 return {genotype:a+b,callKind:"snp"};
}
function parseVcf(raw){
 const p=create("vcf");let header=null;
 for(const ln of raw.split(/\r?\n/)){
  const line=ln.trim();if(!line)continue;if(line.startsWith("##"))continue;
  if(line.startsWith("#CHROM")){header=split(line);const samples=header.length-9;if(samples!==1)throw new Error(samples<1?"VCF must include one sample column with a GT field.":"Multi-sample VCF files are not supported yet. Export a single-sample VCF first.");continue;}
  if(line.startsWith("#"))continue;if(!header)throw new Error("VCF header is missing the #CHROM column header.");
  const f=split(line);if(f.length<10){p.skippedRows++;p.diagnostics.malformedRows++;continue;}
  const [chr,pos,id,ref,alt]=f,loc=coords(chr,pos);
  if(!loc.valid||!/^[ACGTN]+$/i.test(ref)||!id){p.skippedRows++;p.diagnostics.malformedRows++;continue;}
  const i=f[8].split(":").indexOf("GT"),sample=f[9].split(":");
  const call=i<0||sample[i]===undefined?{genotype:"(missing GT)",callKind:"malformed"}:vcfCall(sample[i],ref,alt);
  for(const rsid of id.split(";").filter(x=>RSID.test(x)))add(p,{rsid,chromosome:loc.chromosome,position:loc.position,genotype:call.genotype,callKind:call.callKind,sourceFormat:"vcf",strandOrientation:"plus",vcf:{ref:ref.toUpperCase(),alt:alt.toUpperCase(),gt:sample[i]}});
 }
 if(!header)throw new Error("VCF header is missing the #CHROM column header.");return p;
}
export function parseRawData(raw,options={}){
 if(typeof raw!=="string")throw new TypeError("Raw genotype input must be text.");
 const fmt=detectFileFormat(raw,options.fileName||"");
 const p=fmt==="vcf"?parseVcf(raw):(fmt==="standard"||fmt==="ancestrydna")?parseTabular(raw,fmt):null;
 if(!p)throw new Error("Could not detect the file format. Expected 4-column TXT/TSV, AncestryDNA 5-column TXT/TSV, or a single-sample VCF.");
 if(!p.validRows)throw new Error("No structurally valid genotype rows found. Check the file columns and sample genotype calls.");
 p.uniqueMarkers=p.rows.size;return p;
}
function isPalindromic(alleles){
 const s=new Set((alleles||[]).map(x=>String(x).toUpperCase()));
 return s.size===2&&((s.has("A")&&s.has("T"))||(s.has("C")&&s.has("G")));
}
function complement(call){return call.split("").map(x=>COMP[x]||"?").join("");}
export function classifyZygosity(marker,row,buildLabel="Mixed / Unverified"){
 const expected=new Set([...(marker.alleles||[]),marker.refAllele,marker.effectAllele,...Object.values(marker.refAllelesByBuild||{}),...Object.values(marker.effectAllelesByBuild||{})].filter(x=>/^[ACGT]$/i.test(String(x||""))).map(x=>String(x).toUpperCase()));
 const pair=marker.alleles||[marker.refAllele,marker.effectAllele],pal=Boolean(marker.palindromic)||isPalindromic(pair);
 const key=buildLabel.startsWith("GRCh37")?"grch37":buildLabel.startsWith("GRCh38")?"grch38":null;
 const ref=key&&marker.refAllelesByBuild?.[key]?marker.refAllelesByBuild[key]:(marker.refAllelesByBuild&&new Set(Object.values(marker.refAllelesByBuild)).size>1?"build-dependent":marker.refAllele);
 const effect=key&&marker.effectAllelesByBuild?.[key]?marker.effectAllelesByBuild[key]:(marker.effectAllelesByBuild&&new Set(Object.values(marker.effectAllelesByBuild)).size>1?null:marker.effectAllele);
 if(!effect)return {zygosity:"mismatch",zygosityLabel:"Strand/Allele Mismatch",zygosityTone:"mismatch",orientation:"unresolved",normalizedGenotype:null,effectAlleleCount:null,palindromic:pal,referenceAllele:ref,effectAllele:"build-dependent",reason:"This marker has assembly-specific forward-strand allele orientation. A build could not be verified from the matched coordinates, so effect-allele copy count is not classified."};
 const raw=String(row.genotype||"").toUpperCase(),bases=raw.split(""),direct=bases.length===2&&bases.every(x=>expected.has(x)),rev=complement(raw),reverse=bases.length===2&&rev.split("").every(x=>expected.has(x)),vcfForward=row.strandOrientation==="plus";
 if(!vcfForward&&pal&&direct&&reverse)return {zygosity:"palindromic_unresolved",zygosityLabel:"Palindromic strand unresolved",zygosityTone:"palindromic",orientation:"ambiguous",normalizedGenotype:null,effectAlleleCount:null,palindromic:true,referenceAllele:ref,effectAllele:effect,reason:"This A/T or C/G palindromic SNP cannot be strand-disambiguated from these bases alone."};
 let normalized=null,orientation=null;if(direct){normalized=raw;orientation="forward";}else if(!vcfForward&&reverse){normalized=rev;orientation="reverse-complement";}
 if(!normalized)return {zygosity:"mismatch",zygosityLabel:"Strand/Allele Mismatch",zygosityTone:"mismatch",orientation:"unresolved",normalizedGenotype:null,effectAlleleCount:null,palindromic:pal,referenceAllele:ref,effectAllele:effect,reason:"The called bases do not match the curated reference/effect allele pair in forward or reverse-complement orientation."};
 const count=normalized.split("").filter(x=>x===effect.toUpperCase()).length;
 const states=[["reference",0,"Reference 0/0","reference"],["heterozygous",1,"Heterozygous 0/1","heterozygous"],["homozygous_variant",2,"Homozygous Variant 1/1","variant"]];
 const st=states.find(x=>x[1]===count);
 return {zygosity:st[0],zygosityLabel:st[2],zygosityTone:st[3],orientation,normalizedGenotype:normalized,effectAlleleCount:count,palindromic:pal,referenceAllele:ref,effectAllele:effect,reason:null};
}
export function detectGenomeBuild(parsed,panel){
 let n=0,s37=false,s38=false,unknown=false;
 for(const m of panel){const r=parsed.rows.get(m.rsid.toLowerCase());if(!r||r.duplicate||!r.chromosome||!Number.isInteger(r.position))continue;n++;
  const chrOk=!m.chromosome||normChr(m.chromosome)===normChr(r.chromosome),a=chrOk&&r.position===m.grch37Pos,b=chrOk&&r.position===m.grch38Pos;
  if(a&&!b)s37=true;else if(b&&!a)s38=true;else unknown=true;
 }
 if(!n)return "No Coordinates";if(!unknown&&s37&&!s38)return "GRCh37 / hg19";if(!unknown&&s38&&!s37)return "GRCh38 / hg38";return "Mixed / Unverified";
}
export function classifyMarker(marker,parsed,buildLabel="Mixed / Unverified"){
 const row=parsed.rows.get(String(marker.rsid).toLowerCase());
 if(!row)return {status:"not_found",reason:"The rsID does not occur in this file. That is not a reference-genotype or negative result."};
 if(row.duplicate)return {status:"unknown",row,reason:"More than one row with this rsID was found. The app does not choose between duplicate entries."};
 if(row.callKind==="no_call")return {status:"unknown",row,reason:"The file records a no-call; no genotype could be read for this marker."};
 if(row.callKind==="indel")return {status:"unknown",row,reason:"This row contains an insertion/deletion call. This educational SNP panel compares single-nucleotide markers only."};
 if(row.callKind!=="snp"||!PAIR.test(row.genotype))return {status:"unknown",row,reason:"The genotype field is malformed or is not a supported diploid A/C/G/T SNP call."};
 return {status:"found",row,...classifyZygosity(marker,row,buildLabel)};
}
