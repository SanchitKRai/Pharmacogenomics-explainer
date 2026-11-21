import test from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";

const indexUrl = new URL("../index.html", import.meta.url);
const appUrl = new URL("../app.js", import.meta.url);
const cssUrl = new URL("../styles.css", import.meta.url);
const indexHtml = await readFile(indexUrl, "utf8");
const appCode = await readFile(appUrl, "utf8");
const css = await readFile(cssUrl, "utf8");

test("browser application uses a module script and all required interaction targets exist", () => {
  assert.match(indexHtml, /<script type="module" src="app\.js"><\/script>/);
  const ids = [...appCode.matchAll(/getElementById\(["']([^"']+)["']\)/g)].map(match => match[1]);
  assert.ok(ids.length >= 10, "expected to find the main application DOM targets");
  for (const id of new Set(ids)) {
    assert.ok(indexHtml.includes('id="' + id + '"'), "missing DOM target: " + id);
  }
});

test("all local evidence files referenced by the app exist", async () => {
  for (const path of [
    "../data/marker-panel.json",
    "../data/guideline-index.json",
    "../data/variant-evidence.json"
  ]) {
    await access(new URL(path, import.meta.url));
  }
});

test("variant evidence result UI has matching style definitions", () => {
  for (const className of [
    "variant-evidence",
    "variant-evidence-heading",
    "allele-association",
    "variant-evidence-links"
  ]) {
    assert.ok(css.includes("." + className), "missing CSS selector: " + className);
  }
  assert.ok(appCode.includes("renderVariantEvidence(marker.rsid)"));
});
