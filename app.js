/* GeneGuide: marker-level educational demo only. No phenotype or prescribing logic. */
const PANEL = [
  {rsid:"rs4244285",gene:"CYP2C19",label:"CYP2C19 *2-associated marker",context:"A commonly studied loss-of-function variant marker.",drugs:"Clopidogrel · selected proton-pump inhibitors · other CYP2C19 substrates",explain:"This marker is commonly used in research on CYP2C19 function. CPIC has drug-specific guidance for certain CYP2C19 results, including clopidogrel. One marker alone does not establish a complete CYP2C19 diplotype or metabolizer phenotype.",guideline:"https://cpicpgx.org/guidelines/"},
  {rsid:"rs4986893",gene:"CYP2C19",label:"CYP2C19 *3-associated marker",context:"A commonly studied loss-of-function variant marker.",drugs:"Clopidogrel · selected proton-pump inhibitors · other CYP2C19 substrates",explain:"This marker is associated with a CYP2C19 no-function allele in relevant reference contexts. Clinical interpretation requires validated testing and the full set of relevant alleles. The app does not infer phenotype from this row.",guideline:"https://cpicpgx.org/guidelines/"},
  {rsid:"rs12248560",gene:"CYP2C19",label:"CYP2C19 *17-associated marker",context:"A commonly studied increased-function promoter variant marker.",drugs:"CYP2C19 substrates; guideline relevance varies by drug.",explain:"This marker is associated with increased CYP2C19 expression in some haplotype contexts. The effect on a specific medication depends on the full diplotype and the drug-specific guideline. This app does not make that assignment.",guideline:"https://cpicpgx.org/guidelines/"},
  {rsid:"rs3892097",gene:"CYP2D6",label:"CYP2D6 splice variant marker",context:"A commonly studied decreased/no-function-associated marker.",drugs:"Several CYP2D6 substrates, including selected antidepressants and opioids.",explain:"CYP2D6 interpretation is complex: gene deletions, duplications, hybrid alleles, and multiple variants can matter. A single marker is not sufficient to determine CYP2D6 phenotype. Consult validated clinical testing and the specific drug guideline.",guideline:"https://cpicpgx.org/guidelines/"},
  {rsid:"rs776746",gene:"CYP3A5",label:"CYP3A5 *3-associated marker",context:"A commonly studied splice variant associated with CYP3A5 expression status.",drugs:"Tacrolimus",explain:"CYP3A5 genotype can be relevant to tacrolimus dosing guidance. A single marker match is not a full diplotype call; clinical laboratories and clinicians use validated genotype-to-phenotype methods alongside therapeutic drug monitoring.",guideline:"https://cpicpgx.org/guidelines/"},
  {rsid:"rs4149056",gene:"SLCO1B1",label:"SLCO1B1 c.521T>C marker",context:"A transporter variant studied in relation to statin-associated muscle symptoms.",drugs:"Simvastatin and other statins (drug-specific guidance varies).",explain:"This SLCO1B1 marker is associated with altered transporter activity and is included in pharmacogenomic research and statin guidance. It is not, by itself, a diagnosis or an instruction to change a statin.",guideline:"https://cpicpgx.org/guidelines/"},
  {rsid:"rs9923231",gene:"VKORC1",label:"VKORC1 -1639G>A marker",context:"A regulatory marker associated with warfarin dose variability.",drugs:"Warfarin",explain:"VKORC1 variation is one factor associated with warfarin dose requirements. Warfarin dosing is multifactorial and requires clinical monitoring; this app does not calculate a dose or give a dosing recommendation.",guideline:"https://cpicpgx.org/guidelines/"}
];

const fileInput = document.getElementById("genomeFile");
const analyzeBtn = document.getElementById("analyzeBtn");
const demoBtn = document.getElementById("demoBtn");
const fileChip = document.getElementById("fileChip");
const dropzone = document.getElementById("dropzone");
let selectedFile = null;

fileInput.addEventListener("change", () => {
  selectedFile = fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
  updateFileState();
});
function updateFileState(){
  analyzeBtn.disabled = !selectedFile;
  fileChip.hidden = !selectedFile;
  if(selectedFile) fileChip.textContent = selectedFile.name;
}
["dragenter","dragover"].forEach(evt => dropzone.addEventListener(evt, e => {e.preventDefault();dropzone.classList.add("dragover");}));
["dragleave","drop"].forEach(evt => dropzone.addEventListener(evt, e => {e.preventDefault();dropzone.classList.remove("dragover");}));
dropzone.addEventListener("drop", e => {
  const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
  if(f && (f.name.toLowerCase().endsWith(".txt") || f.name.toLowerCase().endsWith(".tsv"))){
    selectedFile = f;
    fileInput.files = e.dataTransfer.files;
    updateFileState();
  } else if(f) alert("Please choose a .txt or .tsv genotype export.");
});
analyzeBtn.addEventListener("click", async () => {
  if(!selectedFile) return;
  try { renderReport(parseRawData(await selectedFile.text())); }
  catch(err){ alert("Could not read this file: " + err.message); }
});
demoBtn.addEventListener("click", () => {
  const demo = [
    "# Synthetic demonstration data — not a real person's genotype",
    "# rsid\tchromosome\tposition\tgenotype",
    "rs4244285\t10\t96521657\tAG",
    "rs4986893\t10\t96540410\tGG",
    "rs12248560\t10\t965ಾಯ22522\tCT",
    "rs3892097\t22\t42128945\tCT",
    "rs776746\t7\t99672916\tCT",
    "rs4149056\t12\t21331549\tTC",
    "rs9999999\t1\t12345\tAA"
  ].join("\n");
  renderReport(parseRawData(demo), true);
});

function parseRawData(raw){
  const rows = new Map();
  let validRows=0, skippedRows=0;
  for(const rawLine of raw.split(/\r?\n/)){
    const line=rawLine.trim();
    if(!line || line.startsWith("#")) continue;
    const parts=line.split(/\t|\s+/);
    if(parts.length < 4){skippedRows++;continue;}
    const [rsid, chromosome, position, genotype]=parts;
    if(!/^(rs\d+|i\d+)$/i.test(rsid) || !/^[ACGTI-]{1,2}$/i.test(genotype) || !/^\d+$/.test(position)){
      skippedRows++;continue;
    }
    rows.set(rsid.toLowerCase(), {rsid,chromosome,position,genotype:genotype.toUpperCase()});
    validRows++;
  }
  if(validRows===0) throw new Error("No valid genotype rows found. Check that this is a tab-separated raw genotype export.");
  return {rows,validRows,skippedRows};
}

function renderReport(parsed,isDemo=false){
  const results=PANEL.filter(p=>parsed.rows.has(p.rsid)).map(p=>({...p,call:parsed.rows.get(p.rsid)}));
  const absent=PANEL.filter(p=>!parsed.rows.has(p.rsid));
  document.getElementById("summaryGrid").innerHTML = [
    summaryCard(parsed.validRows.toLocaleString(),"VALID ROWS PARSED"),
    summaryCard(results.length,"PANEL MARKERS FOUND"),
    summaryCard(absent.length,"PANEL MARKERS NOT FOUND")
  ].join("");
  document.getElementById("resultsList").innerHTML = results.length ? results.map(resultCard).join("") : '<div class="result-card"><strong>No supported panel markers found.</strong><p class="result-description">This does not mean there are no pharmacogenomic variants. The panel is small and consumer arrays have limited coverage.</p></div>';
  document.getElementById("notFoundWrap").innerHTML = '<h3>Markers not present in this file ('+absent.length+')</h3><p>'+absent.map(x=>x.rsid+" ("+x.gene+")").join(" · ")+'<br><br><strong>Not present</strong> means the rsID was not found in the uploaded data. It is not a reference-genotype call, a negative result, or evidence that the gene has normal function.</p>';
  document.getElementById("resultsSection").hidden=false;
  document.querySelector(".data-footnote").textContent = (isDemo?"Synthetic demo data used. ":"") + "Processed in this browser · "+parsed.skippedRows+" malformed/non-data lines skipped · no clinical phenotype assigned.";
  document.getElementById("resultsSection").scrollIntoView({behavior:"smooth",block:"start"});
}
function summaryCard(value,label){return '<div class="summary-card"><strong>'+escapeHTML(String(value))+'</strong><span>'+label+'</span></div>';}
function resultCard(r){
  return '<article class="result-card"><div class="result-head"><div><div class="gene-name">'+escapeHTML(r.gene)+' <span style="color:#718780;font-weight:400">/ '+escapeHTML(r.label)+'</span></div><div class="gene-context">'+escapeHTML(r.context)+'</div></div><span class="genotype-badge">'+escapeHTML(r.call.genotype)+'</span></div><p class="result-description">'+escapeHTML(r.explain)+'</p><div class="result-meta"><span class="meta-tag">'+escapeHTML(r.rsid)+'</span><span class="meta-tag">'+escapeHTML(r.drugs)+'</span><span class="meta-tag">MARKER MATCH ONLY</span></div><a class="result-link" href="'+r.guideline+'" target="_blank" rel="noopener noreferrer">Explore CPIC guideline library ↗</a></article>';
}
function escapeHTML(value){return value.replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));}
document.getElementById("resetBtn").addEventListener("click",()=>{
  document.getElementById("resultsSection").hidden=true;
  selectedFile=null;fileInput.value="";updateFileState();
  window.scrollTo({top:0,behavior:"smooth"});
});