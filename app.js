/* GeneGuide: educational marker-presence explainer. No clinical phenotype or prescribing logic. */
import { parseRawData, classifyMarker } from "./genotype-parser.js";

const panelResponse = await fetch(new URL("./data/marker-panel.json", import.meta.url));
if (!panelResponse.ok) {
  throw new Error("Could not load the marker panel. Refresh the page or contact the project maintainer.");
}
const panelData = await panelResponse.json();
const PANEL = panelData.markers;

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

function updateFileState() {
  analyzeBtn.disabled = !selectedFile;
  fileChip.hidden = !selectedFile;
  if (selectedFile) fileChip.textContent = selectedFile.name;
}

["dragenter", "dragover"].forEach(evt => dropzone.addEventListener(evt, event => {
  event.preventDefault();
  dropzone.classList.add("dragover");
}));
["dragleave", "drop"].forEach(evt => dropzone.addEventListener(evt, event => {
  event.preventDefault();
  dropzone.classList.remove("dragover");
}));

dropzone.addEventListener("drop", event => {
  const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
  if (file && /\\.(txt|tsv)$/i.test(file.name)) {
    selectedFile = file;
    fileInput.files = event.dataTransfer.files;
    updateFileState();
  } else if (file) {
    alert("Please choose a .txt or .tsv genotype export.");
  }
});

analyzeBtn.addEventListener("click", async () => {
  if (!selectedFile) return;
  try {
    renderReport(parseRawData(await selectedFile.text()));
  } catch (error) {
    alert("Could not read this file: " + error.message);
  }
});

// Synthetic fixture deliberately demonstrates all three evidence states:
// a call available, a no-call ("--"), and a panel marker absent from the file.
demoBtn.addEventListener("click", () => {
  const demo = [
    "# Synthetic demonstration data — not a real person's genotype",
    "# rsid\\tchromosome\\tposition\\tgenotype",
    "rs4244285\\t10\\t96521657\\tAG",
    "rs4986893\\t10\\t96540410\\tGG",
    "rs12248560\\t10\\t96522522\\tCT",
    "rs3892097\\t22\\t42128945\\tCT",
    "rs4149056\\t12\\t21331549\\tTC",
    "rs776746\\t7\\t99672916\\t--",
    "rs9999999\\t1\\t12345\\tAA"
  ].join("\\n");

  renderReport(parseRawData(demo), true);
});

function renderReport(parsed, isDemo = false) {
  const assessments = PANEL.map(marker => ({
    marker,
    ...classifyMarker(marker, parsed)
  }));

  const found = assessments.filter(item => item.status === "found");
  const unknown = assessments.filter(item => item.status === "unknown");
  const notFound = assessments.filter(item => item.status === "not_found");

  document.getElementById("summaryGrid").innerHTML = [
    summaryCard(parsed.validRows.toLocaleString(), "STRUCTURED DATA ROWS"),
    summaryCard(found.length, "TWO-BASE SNP CALLS AVAILABLE"),
    summaryCard(unknown.length, "UNKNOWN / NO-CALL"),
    summaryCard(notFound.length, "NOT FOUND IN FILE")
  ].join("");

  document.getElementById("resultsList").innerHTML = found.length
    ? found.map(resultCard).join("")
    : '<div class="result-card"><strong>No panel marker has a usable two-base SNP call.</strong><p class="result-description">This does not mean there are no pharmacogenomic variants. Check the unknown and not-found states below.</p></div>';

  const unknownWrap = document.getElementById("unknownWrap");
  unknownWrap.innerHTML = unknown.length
    ? '<h3>Present, but unknown / not interpretable (' + unknown.length + ')</h3>' +
      unknown.map(unknownCard).join("")
    : '<h3>No unknown calls in the supported panel</h3><p>All panel rows that were present contained a two-base A/C/G/T call. This is not a clinical interpretation.</p>';

  document.getElementById("notFoundWrap").innerHTML =
    '<h3>Not found in this file (' + notFound.length + ')</h3>' +
    (notFound.length
      ? '<p>' + notFound.map(item => escapeHTML(item.marker.rsid + " (" + item.marker.gene + ")")).join(" · ") +
        '<br><br><strong>Not found</strong> means the rsID did not occur in the uploaded file. It does not mean the reference genotype was confirmed, the variant is absent biologically, or the gene has normal function.</p>'
      : '<p>All supported panel rsIDs occurred in the file. Presence alone does not establish an allele or phenotype.</p>');

  document.getElementById("resultsSection").hidden = false;
  document.querySelector(".data-footnote").textContent =
    (isDemo ? "Synthetic demo data used. " : "") +
    "Processed in this browser · " + parsed.skippedRows + " malformed structure rows skipped · " +
    parsed.duplicateRows + " duplicate rows detected · no star allele or clinical phenotype assigned.";

  document.getElementById("resultsSection").scrollIntoView({ behavior: "smooth", block: "start" });
}

function summaryCard(value, label) {
  return '<div class="summary-card"><strong>' + escapeHTML(String(value)) +
    '</strong><span>' + escapeHTML(label) + '</span></div>';
}

function resultCard(item) {
  const marker = item.marker;
  const row = item.row;
  return '<article class="result-card">' +
    '<div class="result-head"><div><div class="gene-name">' + escapeHTML(marker.gene) +
    ' <span>/ ' + escapeHTML(marker.label) + '</span></div><div class="gene-context">' +
    escapeHTML(marker.variant) + ' · ' + escapeHTML(marker.context) + '</div></div>' +
    '<div class="result-top-meta"><span class="result-status status-found">CALL FOUND IN FILE</span>' +
    '<span class="genotype-badge">' + escapeHTML(row.genotype) + '</span></div></div>' +
    '<div class="result-interpretation-grid">' +
    '<section class="result-block"><strong>Marker context</strong><p>' + escapeHTML(marker.marker_meaning) + '</p></section>' +
    '<section class="result-block"><strong>What this does not establish</strong><p>' +
    escapeHTML(marker.interpretation_limit) + '</p></section></div>' +
    '<div class="result-meta"><span class="meta-tag">' + escapeHTML(marker.rsid) +
    '</span><span class="meta-tag">' + escapeHTML(marker.drug_context) +
    '</span><span class="meta-tag">RAW CALL ONLY</span></div>' +
    '<div class="result-links"><a class="result-link" href="' + escapeHTML(marker.cpic_url) +
    '" target="_blank" rel="noopener noreferrer">' + escapeHTML(marker.cpic_label) +
    ' ↗</a><a class="result-link secondary-link" href="' + escapeHTML(marker.dbsnp_url) +
    '" target="_blank" rel="noopener noreferrer">dbSNP record ↗</a></div></article>';
}

function unknownCard(item) {
  const marker = item.marker;
  const rawCall = item.row && item.row.genotype ? item.row.genotype : "unavailable";
  return '<article class="unknown-card"><div class="result-head"><div><div class="gene-name">' +
    escapeHTML(marker.gene) + ' <span>/ ' + escapeHTML(marker.label) +
    '</span></div><div class="gene-context">' + escapeHTML(marker.rsid) + ' · ' +
    escapeHTML(marker.variant) + '</div></div><div class="result-top-meta">' +
    '<span class="result-status status-unknown">UNKNOWN / NO-CALL</span>' +
    '<span class="genotype-badge unknown-genotype">' + escapeHTML(rawCall) +
    '</span></div></div><p>' + escapeHTML(item.reason) +
    '</p><p class="unknown-reminder">This state is not a reference genotype and must not be treated as a negative result.</p></article>';
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
}

document.getElementById("resetBtn").addEventListener("click", () => {
  document.getElementById("resultsSection").hidden = true;
  selectedFile = null;
  fileInput.value = "";
  updateFileState();
  window.scrollTo({ top: 0, behavior: "smooth" });
});
